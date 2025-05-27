const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seats: { type: Number, required: true },
  participants: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      confirmed: { type: Boolean, default: false }
    }
  ],
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Viaggio' }
});

module.exports = mongoose.model('Prenotazione', bookingSchema);