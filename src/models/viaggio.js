const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  passengers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startPoint: {
    address: String,
    coordinates: { type: [Number], index: '2dsphere' }
  },
  endPoint: {
    address: String,
    coordinates: { type: [Number], index: '2dsphere' }
  },
  departureTime: { type: Date, required: true },
  availableSeats: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Viaggio', rideSchema);