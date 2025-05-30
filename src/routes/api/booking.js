const express = require('express');
const router = express.Router();
const Ride = require('../../models/viaggio');
const authMiddleware = require('../../middleware/authmw');
const validateObjectId = require('../../middleware/validateObjectId');
<<<<<<< Updated upstream
const partecipants = require('../../models/partecipants');
=======
const Prenotazione = require('../../models/booking');



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
    }

    await booking.save();
    res.json({ message: 'Prenotazione aggiornata con successo', booking });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});


>>>>>>> Stashed changes

/**
 * @openapi
 * /api/bookings/{id}/book:
 *   post:
 *     summary: Book a ride (single or multiple seats)
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ride ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seats:
 *                 type: integer
 *                 example: 3
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["665f2b3e84a7ab001223a123", "665f2b3e84a7ab001223a456"]
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Invalid input or full
 */
router.post('/:id/book', [authMiddleware, validateObjectId], async (req, res) => {
  console.log(req.body)
  const { seats, participants } = req.body;
  
  try {
    const ride = await Ride.findById(req.params.id);
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
    console.log('aaa')
    const newBooking = {
      userId: req.user.userId,
      seats,
      //participants: (participants || []).map(id => ({ userId: id }))
      participants: participants
    };

    ride.bookings.push(newBooking);
    await ride.save();

    res.status(201).json({ message: 'Booking successful. Waiting for participants to confirm.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @openapi
 * /api/bookings/{id}/confirm:
 *   post:
 *     summary: Confirm participation as invited passenger
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ride ID
 *     responses:
 *       200:
 *         description: Confirmation successful
 *       403:
 *         description: You were not invited
 */
router.post('/:id/confirm', [authMiddleware, validateObjectId], async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    let found = false;

    ride.bookings.forEach(booking => {
      booking.participants.forEach(participant => {
        if (participant.userId.toString() === req.user.userId) {
          participant.confirmed = true;
          found = true;
        }
      });
    });

    if (!found) return res.status(403).json({ error: 'You were not invited to this ride' });

    await ride.save();
    res.status(200).json({ message: 'Participation confirmed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

<<<<<<< Updated upstream
=======
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

    ride.bookings = ride.bookings.filter(bId => bId.toString() !== bookingId);

    if (booking.participants.some(p => p.confirmed)) {
      ride.availableSeats += booking.seats;
    }

    await ride.save();

    await Prenotazione.findByIdAndDelete(bookingId);

    res.status(200).json({ message: 'Prenotazione cancellata con successo' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Errore del server' });
  }
});

>>>>>>> Stashed changes
module.exports = router;
