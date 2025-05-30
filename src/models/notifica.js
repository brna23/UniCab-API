const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    default: 'generic'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

module.exports = mongoose.model('Notifica', notificationSchema);
