const mongoose = require('mongoose');

const recensioneSchema = new mongoose.Schema({
  originUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  destinationUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: {type: String},
  rating: { type: Number, default: 5 }
});

module.exports = mongoose.model('Recensione', recensioneSchema);