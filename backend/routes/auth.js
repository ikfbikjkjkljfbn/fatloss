const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/email');

// ============================================
// REGISTER - Step 1: Create account
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

    const { email, password, name } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already registered and verified. Please login.' 
        });
      } else {
        // Resend OTP for unverified user
        const otp = user.generateOTP();
        await user.save();
        await sendOTPEmail(email, otp, name);
        
        return res.status(200).json({
          success: true,
          message: 'OTP resent to your email. Please verify.',
          requiresOTP: true,
          email: email
        });
      }
    }

    // Create new user
    user = new User({
      email,
      password,
      name
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    await sendOTPEmail(email, otp, name);

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email for OTP.',
      requiresOTP: true,
      email: email
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
// VERIFY OTP - Step 2: Verify email
// ============================================
router.post('/verify-otp', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already verified. Please login.' 
      });
    }

    // Check OTP
    if (!user.otp || user.otp.code !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP.' 
      });
    }

    // Check OTP expiry
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired. Please request a new one.' 
      });
    }

    // Verify user
    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(email, user.name);

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// ============================================
// RESEND OTP
// ============================================
router.post('/resend-otp', [
  body('email').isEmail()
], async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already verified. Please login.' 
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();
    await sendOTPEmail(email, otp, user.name);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email.'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// ============================================
// LOGIN
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

    if (!user.isVerified) {
      // Send OTP again
      const otp = user.generateOTP();
      await user.save();
      await sendOTPEmail(email, otp, user.name);
      
      return res.status(403).json({
        success: false,
        message: 'Email not verified. A new OTP has been sent to your email.',
        requiresOTP: true,
        email: email
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Remove sensitive data
    const userData = user.toObject();
    delete userData.password;
    delete userData.otp;

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
// FORGOT PASSWORD - Request reset
// ============================================
router.post('/forgot-password', [
  body('email').isEmail()
], async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    // Generate OTP for password reset
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email with reset purpose
    const mailOptions = {
      from: `"FitTrack Pro" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset - FitTrack Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #ffffff; border-radius: 10px;">
          <h1 style="color: #4CAF50;">Password Reset</h1>
          <p>You requested a password reset for your FitTrack Pro account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: #0a0e1a; padding: 15px 40px; border-radius: 8px; border: 2px solid #FF9800;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FF9800;">${otp}</span>
            </div>
          </div>
          <p style="color: #b0b8c8; font-size: 14px;">This OTP will expire in 10 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email for password reset.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// ============================================
// RESET PASSWORD with OTP
// ============================================
router.post('/reset-password', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    // Check OTP
    if (!user.otp || user.otp.code !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP.' 
      });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired. Please request a new one.' 
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.otp = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful! Please login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp');
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