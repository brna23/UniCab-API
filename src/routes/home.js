const express = require('express');
const authMiddleware = require('../middleware/authmw');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../models/user');

router.put(
  '/user/profile',
  authMiddleware,
  [
    body('phone')
      .optional()
      .matches(/^[0-9]{10}$/)
      .withMessage('Il numero di telefono deve contenere esattamente 10 cifre.'),
    body('name')
      .optional()
      .isLength({ min: 2 })
      .withMessage('Il nome deve contenere almeno 2 caratteri.'),
    body('vehicle')
      .optional()
      .isString()
      .withMessage('Il veicolo deve essere una stringa.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Dati non validi', errors: errors.array() });
    }

    try {
      const { name, phone, vehicle } = req.body;
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { name, phone, vehicle },
        { new: true }
      ).select('-password');

      res.json({ message: 'Profilo aggiornato', user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Errore server' });
    }
  }
);

module.exports = router;
