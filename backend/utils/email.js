const nodemailer = require('nodemailer');

// ============================================
// MAILTRAP SMTP TRANSPORTER (Production)
// ============================================
let transporter;

const getTransporter = () => {
  if (!transporter) {
    const host = process.env.MAILTRAP_HOST || 'live.smtp.mailtrap.io';
    const port = parseInt(process.env.MAILTRAP_PORT) || 587;
    const user = process.env.MAILTRAP_USER;
    const pass = process.env.MAILTRAP_PASS;

    if (!user || !pass) {
      console.error('❌ Mailtrap credentials missing! Check your .env file.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: host,
      port: port,
      auth: {
        user: user,
        pass: pass
      },
      secure: port === 465 // true for 465, false for other ports
    });

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Mailtrap connection failed:', error.message);
      } else {
        console.log('✅ Mailtrap SMTP configured successfully');
      }
    });
  }
  return transporter;
};

// ============================================
// SEND OTP EMAIL
// ============================================
const sendOTPEmail = async (email, otp, name) => {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.log(`📧 [FALLBACK] OTP for ${email}: ${otp}`);
      return { success: false, message: 'Email not configured' };
    }

    const info = await transporter.sendMail({
      from: process.env.MAILTRAP_FROM || '"FitTrack Pro" <noreply@fittrack.com>',
      to: email,
      subject: 'Verify Your Email - FitTrack Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #ffffff; border-radius: 10px;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #4CAF50; font-size: 2rem;">FitTrack Pro</h1>
            <p style="color: #b0b8c8; font-size: 1.1rem;">Verify Your Email</p>
          </div>
          <div style="background: #141b2d; padding: 30px; border-radius: 10px; border: 1px solid #2a3450;">
            <h2 style="margin-top: 0; color: #ffffff;">Hello ${name || 'there'}! 👋</h2>
            <p style="color: #b0b8c8; font-size: 1rem;">Your OTP for verification is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: #0a0e1a; padding: 15px 40px; border-radius: 8px; border: 2px solid #4CAF50;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">${otp}</span>
              </div>
            </div>
            <p style="color: #b0b8c8; font-size: 14px;">This OTP will expire in <strong style="color: #FF9800;">10 minutes</strong>.</p>
          </div>
        </div>
      `
    });

    console.log('✅ OTP email sent via Mailtrap:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Mailtrap send error:', error.message);
    console.log(`📧 [FALLBACK] OTP for ${email}: ${otp}`);
    return { success: false, error: error.message };
  }
};

// ============================================
// SEND WELCOME EMAIL
// ============================================
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.log(`📧 [FALLBACK] Welcome email to: ${email}`);
      return { success: false, message: 'Email not configured' };
    }

    const info = await transporter.sendMail({
      from: process.env.MAILTRAP_FROM || '"FitTrack Pro" <noreply@fittrack.com>',
      to: email,
      subject: 'Welcome to FitTrack Pro! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #ffffff; border-radius: 10px;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #4CAF50; font-size: 2rem;">Welcome to FitTrack Pro!</h1>
          </div>
          <div style="background: #141b2d; padding: 30px; border-radius: 10px; border: 1px solid #2a3450;">
            <h2 style="margin-top: 0; color: #ffffff;">Hello ${name || 'there'}! 🎊</h2>
            <p style="color: #b0b8c8; font-size: 1rem;">Your email has been verified. Start tracking your fat loss journey today!</p>
            <div style="margin: 20px 0; padding: 15px; background: #0a0e1a; border-radius: 8px; border-left: 4px solid #4CAF50;">
              <p style="margin: 5px 0; color: #b0b8c8;">📊 Track your weight daily</p>
              <p style="margin: 5px 0; color: #b0b8c8;">💪 Log your workouts</p>
              <p style="margin: 5px 0; color: #b0b8c8;">📈 View progress charts</p>
              <p style="margin: 5px 0; color: #b0b8c8;">🤖 Get AI-powered coaching</p>
            </div>
          </div>
        </div>
      `
    });

    console.log('✅ Welcome email sent via Mailtrap:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Welcome email error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail, sendWelcomeEmail };