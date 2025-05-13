const express = require('express');
const authMiddleware = require('../middleware/authmw');
const User = require('../models/user');

const router = express.Router();

router.get('/dashboard', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId).select('username');
  res.json({ message: `Benvenuto, ${user.username}` });
});

module.exports = router;        //un altra pagina dove serve login utente non usata per adesso
