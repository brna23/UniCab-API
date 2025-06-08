const express = require('express');
const router = express.Router();
const Ride = require('../../models/viaggio');
const authMiddleware = require('../../middleware/authmw');
const validateObjectId = require('../../middleware/validateObjectId');
const swagger = require('../../../swagger-definitions');
const Prenotazione = require('../../models/booking');
const Recensione = require('../../models/recensione');
const User = require('../../models/user');
const isAdmin = require('../../middleware/isAdmin');

//metodo post per creare una recensione
router.post('/:id', authMiddleware, async (req, res) => {
    try {
        const user = req.user;

        // Trova l'utente di destinazione
        const target = await User.findById(req.params.id);
        if (!target) {
            return res.status(404).json({ error: 'Utente destinatario non trovato.' });
        }

        const { descrizione, rating, ride } = req.body;

        if (!ride) {
            return res.status(400).json({ error: 'Ride è obbligatorio.' });
        }
        const
        
        rec = new Recensione({
            originUser: user.userId,
            destinationUser: target._id,
            ride, //salva anche il riferimento al viaggio
            description: descrizione,
            rating: rating
        });

        await rec.save();

        // Calcola media rating
        const recensioni = await Recensione.find({ destinationUser: target._id });
        const mediaRating = recensioni.reduce((sum, r) => sum + r.rating, 0) / recensioni.length;

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

router.get('/my-reviewed-passengers/:rideId', authMiddleware, async (req, res) => {
  const { rideId } = req.params;
  const originUserId = req.user.userId;

  try {
    const recensioni = await Recensione.find({ ride: rideId, originUser: originUserId })
      .select('destinationUser -_id');

    const reviewedUserIds = recensioni.map(r => r.destinationUser.toString());

    res.json({ reviewedUserIds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Errore nel recupero delle recensioni' });
  }
});

//delete recensione solo se admin
router.delete('/:id', authMiddleware, async (req, res)=> {
    try{
        const recensione = await Recensione.findById(req.params.id);
        if (!recensione) {
            return res.status(404).json({ error: 'Recensione non trovata' });
        }
        const canDelete = req.user.userId === recensione.originUser.toString();
        if(!isAdmin.isUserAdmin(req.user)){
            if (!canDelete) {
            return res.status(403).json({ error: 'Non autorizzato a cancellare questa recensione' });
            }
        }
        if (canDelete || isAdmin.isUserAdmin(req.user)){
            return res.status(200).json({ message: 'Recensione cancellata con successo' });
        }else{
            return res.status(403).json({ error: 'Non autorizzato a cancellare questa recensione' });
        }
    } catch(error) {
        console.error('Errore durante la cancellazione:', error);
        res.status(500).json({ error: 'Errore del server' });
    }
});

//metodo get per ottenere tutte le recensioni riferite a un utente
router.get('/user/:id', authMiddleware, async (req,res)=> {
    try{
        let query = { destinationUser: req.params.id}
        const recensione = await Recensione.find(query).populate('originUser', 'username').populate('destinationUser', 'username');;
        if (!recensione) {
            return res.status(404).json({ error: 'Recensione non trovata' });
        }
        res.json(recensione)

    }catch(error) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

module.exports = router;