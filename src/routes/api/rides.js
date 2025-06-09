const express = require('express');
const router = express.Router();
const Ride = require('../../models/viaggio');
const authMiddleware = require('../../middleware/authmw');
const validateObjectId = require('../../middleware/validateObjectId');
const swagger = require('../../../swagger-definitions');
const Prenotazione = require('../../models/booking');
const Notification = require('../../models/notifica');

//quando un utente carica il "landing" nel front end questa api viene chiamata e eventuali viaggi passati vengono settati active
router.patch('/refresh-status', async (req, res) => {
  try {
    const now = new Date();

    const result = await Ride.updateMany(
      {
        status: 'pending',
        departureTime: { $lte: now }
      },
      { $set: { status: 'active' } }
    );

    res.json({ updatedCount: result.modifiedCount });
  } catch (err) {
    //console.error('Errore aggiornamento viaggi:', err);
    res.status(500).json({ error: 'Errore nel server' });
  }
});


router.get('/my-rides', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const rides = await Ride.find({ driver: userId })
      .populate({
        path: 'bookings',
        populate: [
          {
            path: 'userId',
            model: 'User',
            select: 'name username'
          },
          {
            path: 'participants.userId',
            model: 'User',
            select: 'name username'
          }
        ]
      })
      .populate('driver', 'name rating avatar')
      .lean();

    res.json(rides);
  } catch (error) {
    console.error('Errore nel recupero dei viaggi come autista:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

/**
 * @openapi
 * /api/rides/nearby:
 *   get:
 *     summary: Cerca viaggi vicini alla posizione dell'utente
 *     description: Cerca viaggi disponibili entro un certo raggio di distanza (default 1km), applicando eventuali filtri di destinazione e data.
 *     tags: [Rides]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitudine dell'utente
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitudine dell'utente
 *       - in: query
 *         name: destination
 *         required: false
 *         schema:
 *           type: string
 *         description: Destinazione di arrivo
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Data del viaggio (YYYY-MM-DD)
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: number
 *           default: 5000
 *         description: "Raggio di ricerca in metri (default: 5000m)"
 *     responses:
 *       200:
 *         description: Lista viaggi trovati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Parametri mancanti o errati
 *       500:
 *         description: Errore server
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, destination, date, range } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Parametri lat e lon obbligatori'});
    }

    const searchRange = range ? parseFloat(range) : 5000;

    let query = {
      status: 'pending',
      'startPoint.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: searchRange
        }
      }
    };

    if (destination) {
      query['endPoint.address'] = new RegExp(destination, 'i');
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(startDate.getDate() + 1);
      query.departureTime = { $gte: startDate, $lt: endDate};
    }

    let rides = await Ride.find(query)
      .populate('driver', 'name rating avatar')
      .lean();

    if (rides.length === 0){
      delete query['startPoint.coordinates'];
      let broaderQuery = { ...query};
      broaderQuery.status = 'pending';

      rides = await Ride.find(broaderQuery)
        .populate('driver', 'name rating avatar')
        .lean();

        return res.json({
          message: 'Nessun viaggio trovato entro ${searchRange} metri. Ecco i viaggi più lontani:',
          rides
        });
    }

    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Errore server'});
  }
});

<<<<<<< HEAD
=======
/**
 * @openapi
 * /api/rides/nearby:
 *   get:
 *     summary: Cerca viaggi vicini alla posizione dell'utente
 *     description: Cerca viaggi disponibili entro un certo raggio di distanza (default 1km), applicando eventuali filtri di destinazione e data.
 *     tags: [Rides]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitudine dell'utente
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitudine dell'utente
 *       - in: query
 *         name: destination
 *         required: false
 *         schema:
 *           type: string
 *         description: Destinazione di arrivo
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Data del viaggio (YYYY-MM-DD)
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: number
 *           default: 5000
 *         description: "Raggio di ricerca in metri (default: 5000m)"
 *     responses:
 *       200:
 *         description: Lista viaggi trovati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Parametri mancanti o errati
 *       500:
 *         description: Errore server
 */
>>>>>>> 0e817f0d01f84ee092ce147346f3952d45259f4a
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, destination, date, range } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Parametri lat e lon obbligatori'});
    }

    const searchRange = range ? parseFloat(range) : 5000;

    let query = {
      status: 'pending',
      'startPoint.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: searchRange
        }
      }
    };

    if (destination) {
      query['endPoint.address'] = new RegExp(destination, 'i');
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(startDate.getDate() + 1);
      query.departureTime = { $gte: startDate, $lt: endDate};
    }

    let rides = await Ride.find(query)
      .populate('driver', 'name rating avatar')
      .lean();

    if (rides.length === 0){
      delete query['startPoint.coordinates'];
      let broaderQuery = { ...query};
      broaderQuery.status = 'pending';

      rides = await Ride.find(broaderQuery)
        .populate('driver', 'name rating avatar')
        .lean();

        return res.json({
          message: 'Nessun viaggio trovato entro ${searchRange} metri. Ecco i viaggi più lontani:',
          rides
        });
    }

    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Errore server'});
  }
});


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


// @route   GET api/rides/:id
// @desc    Get single ride by ID
// @access  Public
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name rating phone')
      .populate('passengers', 'name')
      .populate('bookings', 'seats'); 
    
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
    await ride.save();

    // Popola le informazioni del driver prima di restituire
    const populatedRide = await Ride.populate(ride, { 
      path: 'driver', 
      select: 'name rating avatar' 
    });
    
    res.status(201).json(populatedRide);
  } catch (err) {
    //console.error(err.message);
    
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

    const oldStartAddress  = ride.startPoint.address;
    const oldEndAddress  = ride.endPoint.address;

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

    const bookings = await Prenotazione.find({ ride: ride._id });
    if (bookings.length > 0) {
        const notifications = bookings.map(booking => ({
          userId: booking.userId,
          title: 'Viaggio modificato',
          message: `Il viaggio da ${oldStartAddress} a ${oldEndAddress} è stato modificato:\nDa ${ride.startPoint.address} a ${ride.endPoint.address}.`,
        }));
       
    await Notification.insertMany(notifications);
    }  

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
    const ride = await Ride.findById(req.params.id).populate('bookings');

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driver.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this ride' });
    }

    
    const bookings = await Prenotazione.find({ ride: ride._id });
    if (bookings.length > 0) {
        const notifications = bookings.map(booking => ({
          userId: booking.userId,
          title: 'Viaggio cancellato',
          message: `Il viaggio da ${ride.startPoint.address} a ${ride.endPoint.address} è stato cancellato.`,
        }));
       
    await Notification.insertMany(notifications);
    }  
    
    await ride.deleteOne();

    res.json({ message: 'Ride deleted successfully and notifications sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


//per flaggare un viaggio "completed" cioè compiuto con successo
router.post('/complete/:id', [authMiddleware, validateObjectId], async (req, res) => {
  try {
    const rideId = req.params.id;
    const userId = req.user.userId;

    const ride = await Ride.findById(rideId);

    if (!ride) return res.status(404).json({ error: 'Viaggio non trovato' });

    if (ride.driver.toString() !== userId)
      return res.status(403).json({ error: 'Non autorizzato' });

    ride.status = 'completed';
    await ride.save();

    res.json({ message: 'Viaggio completato con successo' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore del server' });
  }
});


module.exports = router;