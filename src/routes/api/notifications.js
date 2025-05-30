const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authmw');
const Notification = require('../../models/notifica'); 
const validateObjectId = require('../../middleware/validateObjectId');

//GET /api/notifications
//recupera tutte le notifiche dell'utente autenticato, ordinate per data (più recenti prima)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore nel recupero notifiche' });
  }
});


router.patch('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.userId, read: false },
      { $set: { read: true } }
    );

    res.json({ message: `${result.modifiedCount} notifiche aggiornate come lette.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore nell\'aggiornamento delle notifiche' });
  }
});


//PATCH /api/notifications/:id/read
//segna come letta la notifica specificata per l'utente autenticato
//put sostituisce completamente quindi qui solo per cambiare lo stato uso patch per mandare solo il campo specifico
router.patch('/:id/read', [authMiddleware, validateObjectId], async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notifica non trovata' });

    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore nell\'aggiornamento notifica' });
  }
});



module.exports = router;
