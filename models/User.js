const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  packId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pack',
    required: true
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
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('User', userSchema);