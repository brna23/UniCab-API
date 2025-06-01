const authMiddleware = require('../middleware/authmw');
const isAdmin = require('../middleware/isAdmin');
const express = require('express');
const User = require('../models/user');
const router = express.Router();

const Report = require('../models/report');

router.get('/admin-dashboard', authMiddleware, isAdmin, (req, res) => {
  res.send('Benvenuto nella dashboard admin!');
});

// GET: list all reports with reporter and reported usernames
router.get('/reports', authMiddleware, isAdmin, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporterUser', 'username name')
      .populate('reportedUser', 'username name status')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH: suspend a user 
router.patch('/users/:id/suspend', authMiddleware, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.status === 'suspended') {
      return res.status(400).json({ error: 'User already suspended' });
    }

    user.status = 'suspended';
    await user.save();

    res.json({ message: `User ${user.username} suspended successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error suspending user' });
  }
});

//ACTIVATE: reactivate a suspended user
router.patch('/users/:id/activate', authMiddleware, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found'});
    
    if(user.status === 'active'){
        return res.status(400).json({ error: 'User already activated'});
    }

    user.status = 'active';
    await user.save();

    res.json({ message: `User ${user.username} activated successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH: delete user 
router.patch('/users/:id/cancel', authMiddleware, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if(user.status === 'eliminated'){
        return res.status(400).json({ error: 'User already eliminated'});
    }

    user.status = 'eliminated';
    await user.save();

    res.json({ message: `User ${user.username} eliminated successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;