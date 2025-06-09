const express = require('express');
const router = express.Router();
const Report = require('../../models/report');
const User = require('../../models/user');
const authMiddleware = require('../../middleware/authmw');
const isAdmin = require('../../middleware/isAdmin');

// POST /api/report.js - logged-in user creates a report
router.post('/', authMiddleware, async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { reportedUserId, reason } = req.body;

    if (reporterId.status === 'suspended') {
      return res.status(403).json({ error: 'Il tuo account è sospeso. Non puoi effettuare segnalazioni.' });
    }
    
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

// DELETE /api/report/:id - cancella una segnalazione
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.userId;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Segnalazione non trovata' });
    }

    //solo l'admin o chi ha creato la segnalazione può cancellarla
    if (report.reporterUser.toString() !== userId && isAdmin.isUserAdmin(req.user)) {
      return res.status(403).json({ error: 'Non autorizzato a cancellare questa segnalazione' });
    }

    await report.deleteOne();
    res.json({ message: 'Segnalazione cancellata con successo' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore del server durante la cancellazione' });
  }
});

module.exports = router;