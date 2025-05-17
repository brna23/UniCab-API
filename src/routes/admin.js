const authMiddleware = require('../middleware/authmw');
const isAdmin = require('../middleware/isAdmin');
const express = require('express');
const User = require('../models/user');
const router = express.Router();

router.get('/admin-dashboard', authMiddleware, isAdmin, (req, res) => {
  res.send('Benvenuto nella dashboard admin!');
});
