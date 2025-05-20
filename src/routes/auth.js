const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuovo utente
 *     description: Crea un nuovo account utente se lo username non è già in uso.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "utente123"
 *               password:
 *                 type: string
 *                 example: "PasswordSicura123"
 *     responses:
 *       201:
 *         description: Registrazione completata
 *       400:
 *         description: Username già esistente
 *       500:
 *         description: Errore nel server
 */
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

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Effettua il login di un utente
 *     description: Verifica le credenziali e restituisce un token JWT se l'autenticazione ha successo.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "utente123"
 *               password:
 *                 type: string
 *                 example: "PasswordSicura123"
 *     responses:
 *       200:
 *         description: Login effettuato con successo, ritorna un token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *       400:
 *         description: Credenziali errate
 *       500:
 *         description: Errore nel server
 */
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
