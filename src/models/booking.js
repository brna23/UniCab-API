const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seats: { type: Number, required: true },
  participants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Partecipante' }]
});

module.exports = mongoose.model('Prenotazione', bookingSchema);