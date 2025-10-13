const mongoose = require('mongoose');

const testAccountSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    unique: true
  },
  testCode: {
    type: String,
    unique: true,
    sparse: true
  },
  messagesUsedToday: {
    type: Number,
    default: 0
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TestAccount', testAccountSchema);