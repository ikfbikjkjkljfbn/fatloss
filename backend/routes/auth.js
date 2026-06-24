const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================
// REGISTER - (NO EMAIL - Works Immediately)
// ============================================
router.post('/register', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password, name, age, sex } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already registered. Please login.' 
        });
      } else {
        // If unverified, just overwrite
        await User.deleteOne({ email });
      }
    }

    // Create user - AUTO VERIFIED (NO OTP)
    user = new User({
      email,
      password,
      name,
      age: age || null,
      sex: sex || null,
      isVerified: true // AUTO VERIFIED - SKIP OTP
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: '✅ Account created successfully! You can now login.',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// ============================================
// LOGIN - (No OTP Check)
// ============================================
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// ============================================
// VERIFY OTP - (Disabled - Just returns success)
// ============================================
router.post('/verify-otp', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
  // OTP is disabled - just return success
  res.status(200).json({
    success: true,
    message: 'OTP verification is disabled. Please use login directly.'
  });
});

// ============================================
// RESEND OTP - (Disabled)
// ============================================
router.post('/resend-otp', [
  body('email').isEmail()
], async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OTP resend is disabled.'
  });
});

// ============================================
// FORGOT PASSWORD - (Disabled)
// ============================================
router.post('/forgot-password', [
  body('email').isEmail()
], async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Password reset is disabled for testing.'
  });
});

// ============================================
// RESET PASSWORD - (Disabled)
// ============================================
router.post('/reset-password', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Password reset is disabled for testing.'
  });
});

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;