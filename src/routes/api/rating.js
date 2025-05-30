const express = require('express');
const router = express.Router();
const Ride = require('../../models/viaggio');
const authMiddleware = require('../../middleware/authmw');
const validateObjectId = require('../../middleware/validateObjectId');
const swagger = require('../../../swagger-definitions');
const Prenotazione = require('../../models/booking');
const Recensione = require('../../models/recensione');
const User = require('../../models/user');

//get method for showing all user rating
router.post('/:id', authMiddleware, async (req, res) => {
    try {
        const user = req.user;

        // Trova l'utente di destinazione
        const target = await User.findById(req.params.id);

        if (!target) {
            return res.status(404).json({ error: 'Utente destinatario non trovato.' });
        }

        const rec = new Recensione({
            originUser: user.userId,
            destinationUser: target._id,
            description: req.body.descrizione,
            rating: req.body.rating
        });

        await rec.save(); // salva nel DB

        // CALCOLA MEDIA E AGGIORNA RATING DELL'UTENTE 
        const recensioni = await Recensione.find({ destinationUser: target._id });
        const mediaRating = recensioni.reduce((sum, r) => sum + r.rating, 0) / recensioni.length;

        // Aggiorna il campo rating dell'utente
        target.rating = mediaRating;
        await target.save();

        res.status(201).json({
            message: 'Recensione salvata con successo'
        });

    } catch (error) {
        console.error('Errore nella creazione della recensione:', error);
        res.status(500).json({ error: 'Errore del server' });
    }
});

module.exports = router;