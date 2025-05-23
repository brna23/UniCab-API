const express = require('express');
const router = express.Router();
const Ride = require('../../models/viaggio');
const authMiddleware = require('../../middleware/authmw');
const validateObjectId = require('../../middleware/validateObjectId');
const partecipants = require('../../models/partecipants');
const Prenotazione = require('../../models/booking');
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
  const { seats, participants } = req.body;
  
  try {
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

    //CREA prima la prenotazione
    const newBooking = new Prenotazione({
      userId: req.user.userId,
      seats,
      participants: participants || []
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


module.exports = router;
