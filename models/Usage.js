const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messagesSent: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  contacts: [{
    name: String,
    phone: String,
    status: String
  }]
});

module.exports = mongoose.model('Usage', usageSchema);