const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number
  },
  sex: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  currentWeight: {
    type: Number,
    default: 0
  },
  targetWeight: {
    type: Number,
    default: 0
  },
  height: {
    type: Number
  },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'lightly active', 'moderately active', 'very active'],
    default: 'moderately active'
  },
  dietaryRestrictions: {
    type: [String],
    default: []
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  dailyCalorieTarget: {
    type: Number,
    default: 2000
  },
  macros: {
    protein: { type: Number, default: 150 },
    carbs: { type: Number, default: 200 },
    fat: { type: Number, default: 70 }
  },
  supplements: {
    type: [String],
    default: []
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Generate OTP
UserSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
  return otp;
};

module.exports = mongoose.model('User', UserSchema);