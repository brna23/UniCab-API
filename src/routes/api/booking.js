const express = require('express');
const router = express.Router();
const Ride = require('../../models/viaggio');
const authMiddleware = require('../../middleware/authmw');
const Notification = require('../../models/notifica'); 
const validateObjectId = require('../../middleware/validateObjectId');
const Prenotazione = require('../../models/booking');
const viaggio = require('../../models/viaggio');
const User = require('../../models/user');



router.get('/my-bookings', [authMiddleware], async (req, res) => {
  try {
    const userId = req.user.userId;

    const rides = await Ride.find({ bookings: { $exists: true, $ne: [] } })
      .populate({
        path: 'bookings',
        match: { userId: userId }, //mostra solo le tue prenotazioni
        populate: { path: 'userId', select: 'username name' }
      })
      .populate('driver', 'name rating avatar')
      .lean();

    const ridesWithMyBookings = rides.filter(ride => ride.bookings && ride.bookings.length > 0);

    res.json(ridesWithMyBookings);
  } catch (error) {
    console.error('Errore nel recupero dei viaggi prenotati:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});


//per ottenere tutte prenotazioni da un viaggio rideId
router.get('/by-ride/:id', [authMiddleware, validateObjectId], async (req, res) => {
  const  rideId = req.params.id;
  console.log('req.user:', req.user);

  try {
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Viaggio non trovato' });

    if (ride.driver.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Non sei autorizzato a visualizzare queste prenotazioni' });
    }

    const bookings = await Prenotazione.find({ ride: rideId }).populate('userId', 'name email');

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore del server' });
  }
});

//per modificare prenotazione
router.put('/:id', [authMiddleware, validateObjectId], async (req, res) => {
  const bookingId = req.params.id;
  const { seats, participants } = req.body;

  try {
    const booking = await Prenotazione.findById(bookingId).populate('ride');
    if (!booking) return res.status(404).json({ error: 'Prenotazione non trovata' });

    if (booking.userId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Non autorizzato a modificare questa prenotazione' });

    const oldSeats = booking.seats;
    const newSeats = seats !== undefined ? seats : oldSeats;
    const seatDiff = newSeats - oldSeats;

    if (seatDiff > 0 && booking.ride && seatDiff > booking.ride.availableSeats) {
      return res.status(400).json({
        error: `Solo ${booking.ride.availableSeats} posti disponibili. Non puoi richiedere ${seatDiff} posti aggiuntivi.`
      });
    }

    booking.seats = newSeats;
    if (Array.isArray(participants)) booking.participants = participants;

    if (booking.ride) {
      booking.ride.availableSeats -= seatDiff;
      await booking.ride.save();

      //notifica al driver che la prenotazione è stata modificata
      if (booking.ride.driver) {
        const notification = new Notification({
          userId: booking.ride.driver,
          title: 'Prenotazione modificata',
          message: `Una prenotazione per il viaggio da ${booking.ride.startPoint.address} a ${booking.ride.endPoint.address} è stata modificata.`,
        });

        await notification.save();
      }
    }

    await booking.save();
    res.json({ message: 'Prenotazione aggiornata con successo', booking });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});


router.post('/:id/book', [authMiddleware, validateObjectId], async (req, res) => {
  const { seats, participants } = req.body;
  
  try {

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Il tuo account è sospeso. Non puoi effettuare prenotazioni.' });
    }

    const ride = await Ride.findById(req.params.id).populate('bookings');
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (ride.driver.toString() === req.user.userId) {
      return res.status(400).json({ error: 'Drivers cannot book their own rides' });
    }

    const alreadyBooked = ride.bookings.some(b => b.userId.toString() === req.user.userId);
    if (alreadyBooked) {
      return res.status(400).json({ error: 'You have already booked this ride' });
    }

    const totalBookedSeats = ride.bookings.reduce((sum, b) => sum + b.seats, 0);
    if (totalBookedSeats + seats > ride.availableSeats) {
      return res.status(400).json({ error: 'Not enough available seats' });
    }

    const allParticipants = [
      {
        userId: req.user.userId,
        confirmed: false
      },
      ...participants
    ];

    //CREA prima la prenotazione
    const newBooking = new Prenotazione({
      userId: req.user.userId,
      seats,
      participants: allParticipants,
      ride: ride._id
    });

    const savedBooking = await newBooking.save();

    //ora salva l id di questa prenotazione nel viaggio
    ride.bookings.push(savedBooking._id);
    await ride.save();
    res.status(201).json({ 
    message: 'Booking successful. Waiting for participants to confirm.',
    bookingId: savedBooking._id 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/:id/confirm', [authMiddleware, validateObjectId], async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate({
    path: 'bookings',
    populate: { path: 'participants' } 
    });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    let found = false;
    let userBooking = null;

    for (const booking of ride.bookings) {
      for (const participant of booking.participants) {
        if (participant.userId.toString() === req.user.userId) {
          participant.confirmed = true;
          found = true;
          userBooking = booking;
          await participant.save(); //riscritto con for sennò non mi lascia fare await
        }
      }
    }

    if (!found) return res.status(403).json({ error: 'You were not invited to this ride' });

    if (userBooking) {
      ride.availableSeats -= userBooking.seats;
    }
    await userBooking.save();
    await ride.save();

    if (ride.driver) {
      const notification = new Notification({
        userId: ride.driver,
        title: 'Conferma partecipazione',
        message: `Un partecipante ha confermato la propria presenza al viaggio da ${ride.startPoint.address} a ${ride.endPoint.address}.`,
      });

      await notification.save();
    }

    res.status(200).json({ message: 'Participation confirmed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


//manca commentone
router.get('/:id', [authMiddleware, validateObjectId], async (req, res) => {
  const bookingId = req.params.id;
  //console.log(bookingId);

  try {
    const booking = await Prenotazione.findById(bookingId)
      .populate('userId', 'username phone')
      .populate('participants.userId', 'name email avatar')
      .lean();

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', [authMiddleware, validateObjectId], async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.userId;

    const booking = await Prenotazione.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Prenotazione non trovata' });

    const ride = await Ride.findOne({ bookings: bookingId });
    if (!ride) return res.status(404).json({ error: 'Viaggio associato non trovato' });

    //driver o prenotante possono cancellare
    if (booking.userId.toString() !== userId && ride.driver.toString() !== userId) {
      return res.status(403).json({ error: 'Non sei autorizzato a cancellare questa prenotazione' });
    }


    if (booking.userId.toString() !== userId && ride.driver.toString() !== userId) {
      return res.status(403).json({ error: 'Non sei autorizzato a cancellare questa prenotazione' });
    }

    ride.bookings = ride.bookings.filter(bId => bId.toString() !== bookingId);

    if (booking.participants.some(p => p.confirmed)) {
      ride.availableSeats += booking.seats;
    }

    await ride.save();

    await Prenotazione.findByIdAndDelete(bookingId);

    await Notification.create({
      userId: booking.userId,
      message: `La tua prenotazione per il viaggio da ${ride.startPoint.address} a ${ride.endPoint.address} è stata rifiutata dall'autista o cancellata.`,
      type: 'booking_rejected',
      data: {
        rideId: ride._id.toString(),
        bookingId: booking._id.toString()
      }
    });

    res.status(200).json({ message: 'Prenotazione cancellata con successo' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Errore del server' });
  }
});

module.exports = router;
