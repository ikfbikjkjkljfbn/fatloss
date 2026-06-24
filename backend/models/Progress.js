const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  weight: {
    type: Number,
    required: true
  },
  calories: {
    type: Number,
    default: 0
  },
  protein: {
    type: Number,
    default: 0
  },
  carbs: {
    type: Number,
    default: 0
  },
  fat: {
    type: Number,
    default: 0
  },
  workout: {
    type: String,
    enum: ['rest', 'cardio', 'strength', 'both'],
    default: 'rest'
  },
  workoutDuration: {
    type: Number,
    default: 0
  },
  sleepHours: {
    type: Number,
    default: 0
  },
  waterIntake: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxlength: 500
  },
  mood: {
    type: String,
    enum: ['great', 'good', 'neutral', 'bad', 'terrible'],
    default: 'neutral'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
ProgressSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Progress', ProgressSchema);