const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authmw');
const User = require('../models/user');

// GET /api/users/:id - Ottieni info utente pubbliche/proprie
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
