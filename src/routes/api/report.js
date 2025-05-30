const express = require('express');
const router = express.Router();
const Report = require('../../models/report');
const User = require('../../models/user');
const authMiddleware = require('../../middleware/authmw');

// POST /api/report.js - logged-in user creates a report
router.post('/', authMiddleware, async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { reportedUserId, reason } = req.body;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: 'reportedUserId and reason are required' });
    }

    if (reportedUserId === reporterId) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ error: 'Reported user not found' });
    }

    const report = new Report({
      reporterUser: reporterId,
      reportedUser: reportedUserId,
      reason: reason.trim()
    });

    await report.save();
    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;