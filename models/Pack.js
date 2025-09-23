const mongoose = require('mongoose');

const packSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  dailyLimit: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Pack', packSchema);