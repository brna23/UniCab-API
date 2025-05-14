const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username già esistente' });
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).json({ message: 'Registrazione completata' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Errore nel server' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Credenziali errate' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenziali errate' });
    }

    const token = jwt.sign({userId: user._id,  username: user.username, role: user.role, isDriver: user.isDriver },  
                            process.env.JWT_SECRET, 
                           {expiresIn: '1h'}
                            );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Errore nel server' });
  }
});

module.exports = router;
