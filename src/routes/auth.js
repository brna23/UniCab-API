const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const passport = require('passport');

const router = express.Router();


router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
//login oauth
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign({
      userId: req.user._id,
      username: req.user.username,
      role: req.user.role,
      isDriver: req.user.isDriver
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.redirect(`http://localhost:5173/auth-success?token=${token}`);
  }
);

//registrazione aggiornata
router.post('/register', async (req, res) => {
  const { username, password, email, isDriver, driverLicense } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email obbligatoria' });
    }

    if (isDriver && !driverLicense) {
      return res.status(400).json({ message: 'La patente è obbligatoria per registrarsi come autista' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username già esistente' });
    }

    const newUser = new User({ username, email, password, isDriver, driverLicense });
    await newUser.save();
    res.status(201).json({ message: 'Registrazione completata' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Errore nel server' });
  }
});

//login manuale
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Credenziali errate' });
    }

     if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account sospeso' });
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
