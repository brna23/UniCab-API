const express = require('express');
const router = express.Router();
const Ride = require('../../models/viaggio');
const authMiddleware = require('../../middleware/authmw');
const validateObjectId = require('../../middleware/validateObjectId');
const swagger = require('../../../swagger-definitions');
const partecipants = require('../../models/partecipants');
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


/**
 * @openapi
 * /api/rides:
 *   get:
 *     summary: Elenco viaggi disponibili
 *     description: Restituisce una lista di viaggi con filtri opzionali
 *     tags: [Rides]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Filtro per indirizzo di partenza
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: Filtro per indirizzo di destinazione
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtro per data (YYYY-MM-DD)
 *       - in: query
 *         name: seats
 *         schema:
 *           type: integer
 *         description: Filtro per posti disponibili minimi
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [departureTime:asc, departureTime:desc, price:asc, price:desc]
 *         description: Ordinamento risultati
 *     responses:
 *       200:
 *         description: Lista di viaggi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       500:
 *         description: Errore server
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
 * /api/rides/{id}:
 *   get:
 *     summary: Dettaglio viaggio
 *     description: Restituisce i dettagli di un singolo viaggio
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del viaggio
 *     responses:
 *       200:
 *         description: Dettaglio viaggio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ride'
 *       404:
 *         description: Viaggio non trovato
 *       500:
 *         description: Errore server
 */
// @route   GET api/rides/:id
// @desc    Get single ride by ID
// @access  Public
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name rating avatar phone')
      .populate('passengers', 'name avatar');
      // .populate('bookings.userId', 'bookings.seats'); 
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    res.json(ride);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @openapi
 * /api/rides:
 *   post:
 *     summary: Crea un nuovo viaggio
 *     description: Permette a un driver autenticato di creare un nuovo viaggio
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startAddress
 *               - endAddress
 *               - departureTime
 *               - availableSeats
 *               - price
 *             properties:
 *               startAddress:
 *                 type: string
 *                 example: "Piazza Duomo, Milano"
 *                 description: Indirizzo di partenza
 *               endAddress:
 *                 type: string
 *                 example: "Stazione Centrale, Milano"
 *                 description: Indirizzo di destinazione
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-12-15T08:00:00Z"
 *                 description: Data e ora di partenza (ISO 8601)
 *               availableSeats:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *                 description: Numero di posti disponibili
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 15.50
 *                 description: Prezzo per passeggero
 *               additionalInfo:
 *                 type: string
 *                 example: "Bagaglio massimo 10kg"
 *                 description: Informazioni aggiuntive
 *     responses:
 *       201:
 *         description: Viaggio creato con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#components/schemas/Ride'
 *       400:
 *         description: Richiesta non valida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Campi obbligatori mancanti"
 *                 details:
 *                   type: object
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Autorizzazione negata (solo per driver)
 *       500:
 *         description: Errore server
 */

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

/**
 * @openapi
 * /api/rides/{id}:
 *   put:
 *     summary: Aggiorna un viaggio
 *     description: Permette al driver di modificare i dettagli del viaggio
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del viaggio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startAddress:
 *                 type: string
 *               endAddress:
 *                 type: string
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *               availableSeats:
 *                 type: integer
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [pending, active, completed, cancelled]
 *     responses:
 *       200:
 *         description: Viaggio aggiornato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Richiesta non valida
 *       403:
 *         description: Non autorizzato (solo il driver può modificare)
 *       404:
 *         description: Viaggio non trovato
 *       500:
 *         description: Errore server
 */
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