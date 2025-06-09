const express = require('express');
const router = express.Router();
const Ticket = require('../../models/ticket');
const Notifica = require('../../models/notifica');
const authMiddleware = require('../..//middleware/authmw'); 
const isAdmin = require('../..//middleware/isAdmin'); 


//GET /api/tickets - elenca tutti i ticket con info utente
router.get('/', authMiddleware, async (req, res) => {
  if (!isAdmin.isUserAdmin(req.user)) return res.status(403).json({ error: 'Accesso negato' });

  try {
    const tickets = await Ticket.find()
      .populate('userId', 'name username')
      .sort({ createdAt: -1 });

    const formatted = tickets.map(t => ({
      _id: t._id,
      user: t.userId,
      message: t.message,
      response: t.response,
      status: t.status,
      createdAt: t.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});


//creare un nuovo ticket per utente autenticato
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Messaggio obbligatorio' });

    const ticket = new Ticket({
      userId: req.user.userId, 
      message,
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

//rispondere a un ticket (admin)
//body: { response: string, status: 'answered' | 'closed' }
router.post('/:id/respond', authMiddleware, async (req, res) => {
  try {
    if (!isAdmin.isUserAdmin(req.user)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const { response } = req.body;
    if (!response || response.trim() === '') {
      return res.status(400).json({ error: 'Risposta obbligatoria' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket non trovato' });
    }

    ticket.response = response;
    ticket.status = 'closed';
    await ticket.save();

    const notifica = new Notifica({
      userId: ticket.userId,
      message: `Il tuo ticket è stato chiuso.\n\nMessaggio: ${ticket.message}\n\nRisposta admin: ${response}`,
      type: 'ticket_reply',
      data: {
        ticketId: ticket._id
      }
    });

    await notifica.save();

    res.json(ticket);
  } catch (err) {
    console.error('Errore nella risposta al ticket:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
