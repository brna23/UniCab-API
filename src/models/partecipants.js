const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmed: { type: Boolean, default: false }
});

module.exports = mongoose.model('Partecipante', participantSchema);