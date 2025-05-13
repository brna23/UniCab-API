const express = require('express');
const authMiddleware = require('../middleware/authmw');
const router = express.Router();
const User = require('../models/user');

// rotta protetta: /dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('username');
        res.json({ message: `Benvenuto, ${user.username}` });
    } catch (err) {
        res.status(500).json({ message: 'Errore interno', error: err.message });
    }

});

module.exports = router;
