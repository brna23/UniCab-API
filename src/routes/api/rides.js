const express = require('express');
const router = express.Router();
const Ride = require('../../models/viaggio');
const authMiddleware = require('../../middleware/authmw');
const validateObjectId = require('../../middleware/validateObjectId');

/**
 * @openapi
 * /api/rides/:
 *   get:
 *     description: Print all rides
 *     responses:
 *       200:
 *         description: Returns a mysterious string.
 */
// @route   GET api/rides
// @desc    Get all rides
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Filtro base: solo viaggi con status 'pending' (disponibili)
    let query = { status: 'pending' };
    
    // Aggiungi filtri dalla query string se presenti
    if (req.query.from) {
      query['startPoint.address'] = new RegExp(req.query.from, 'i');
    }
    
    if (req.query.to) {
      query['endPoint.address'] = new RegExp(req.query.to, 'i');
    }
    
    if (req.query.date) {
      const date = new Date(req.query.date);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      
      query.departureTime = {
        $gte: date,
        $lt: nextDay
      };
    }
    
    if (req.query.seats) {
      query.availableSeats = { $gte: parseInt(req.query.seats) };
    }
    
    // Ordinamento
    const sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort.departureTime = 1; // Default: ordine crescente per data
    }
    
    // Popola le informazioni del driver
    const rides = await Ride.find(query)
      .sort(sort)
      .populate('driver', 'name rating avatar')
      .lean();
    
    res.json(rides);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @openapi
 * /api/rides/:id:
 *   get:
 *     description: Print ride with id
 *     responses:
 *       200:
 *         description: Returns a mysterious string.
 */
// @route   GET api/rides/:id
// @desc    Get single ride by ID
// @access  Public
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name rating avatar phone')
      .populate('passengers', 'name avatar');
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/rides
// @desc    Create a new ride
// @access  Private (solo utenti autenticati)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Verifica che l'utente sia un driver
    const user = req.user;
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    console.log(user);
    if (!user.isDriver) {
      return res.status(403).json({ error: 'Only drivers can create rides' });
    }
    
    // Crea il nuovo viaggio
    const ride = new Ride({
      driver: user.userId,
      startPoint: {
        address: req.body.startAddress,
        coordinates: req.body.startCoordinates || [0, 0]
      },
      endPoint: {
        address: req.body.endAddress,
        coordinates: req.body.endCoordinates || [0, 0]
      },
      departureTime: new Date(req.body.departureTime),
      availableSeats: req.body.availableSeats,
      price: req.body.price,
      additionalInfo: req.body.additionalInfo || ''
    });
    console.log('aaaa');
    await ride.save();
    console.log('bbbb');

    // Popola le informazioni del driver prima di restituire
    const populatedRide = await Ride.populate(ride, { 
      path: 'driver', 
      select: 'name rating avatar' 
    });
    
    res.status(201).json(populatedRide);
  } catch (err) {
    console.error(err.message);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ errors });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT api/rides/:id
// @desc    Update a ride
// @access  Private (solo il creatore del viaggio)
router.put('/:id', [authMiddleware, validateObjectId], async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Verifica che l'utente sia il driver del viaggio
    if (ride.driver.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this ride' });
    }
    
    // Aggiorna solo i campi forniti
    const updates = {
      startPoint: {
        address: req.body.startAddress || ride.startPoint.address,
        coordinates: req.body.startCoordinates || ride.startPoint.coordinates
      },
      endPoint: {
        address: req.body.endAddress || ride.endPoint.address,
        coordinates: req.body.endCoordinates || ride.endPoint.coordinates
      },
      departureTime: req.body.departureTime ? new Date(req.body.departureTime) : ride.departureTime,
      availableSeats: req.body.availableSeats || ride.availableSeats,
      price: req.body.price || ride.price,
      additionalInfo: req.body.additionalInfo || ride.additionalInfo,
      status: req.body.status || ride.status
    };
    
    Object.assign(ride, updates);
    await ride.save();
    
    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE api/rides/:id
// @desc    Delete a ride
// @access  Private (solo il creatore del viaggio)
router.delete('/:id', [authMiddleware, validateObjectId], async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Verifica che l'utente sia il driver del viaggio
    if (ride.driver.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this ride' });
    }
    
    await ride.deleteOne();
    res.json({ message: 'Ride deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;