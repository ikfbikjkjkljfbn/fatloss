const nodemailer = require('nodemailer');

// ============================================
// EMAIL CONFIGURATION - All from environment
// ============================================
let transporter;

const getTransporter = () => {
  if (!transporter) {
    // Read ALL credentials from environment variables ONLY
    const host = process.env.MAILTRAP_HOST || process.env.EMAIL_HOST || 'smtp.mailtrap.io';
    const port = parseInt(process.env.MAILTRAP_PORT || process.env.EMAIL_PORT || 2525);
    const user = process.env.MAILTRAP_USER || process.env.EMAIL_USER;
    const pass = process.env.MAILTRAP_PASS || process.env.EMAIL_PASS;

    // Don't create transporter if credentials missing
    if (!user || !pass) {
      console.warn('⚠️ Email credentials not configured. Emails will not send.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: host,
      port: port,
      auth: { user, pass },
      secure: port === 465 // SSL for port 465
    });

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email connection failed:', error.message);
      } else {
        console.log('✅ Email configured successfully');
      }
    });
  }
  return transporter;
};

// ============================================
// SEND EMAIL (Generic)
// ============================================
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.log('📧 Email skipped (no credentials)');
      return { success: false, message: 'Email not configured' };
    }

    const from = process.env.EMAIL_FROM || '"FitTrack Pro" <noreply@fittrack.com>';

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html: html || text,
      text: text || html?.replace(/<[^>]*>/g, '') || ''
    });

    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// OTP EMAIL
// ============================================
const sendOTPEmail = async (email, otp, name) => {
  const subject = 'Verify Your Email - FitTrack Pro';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #ffffff; border-radius: 10px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #4CAF50; font-size: 2rem;">FitTrack Pro</h1>
        <p style="color: #b0b8c8; font-size: 1.1rem;">Your Fat Loss Journey Starts Here</p>
      </div>
      <div style="background: #141b2d; padding: 30px; border-radius: 10px; border: 1px solid #2a3450;">
        <h2 style="margin-top: 0; color: #ffffff;">Hello ${name || 'there'}! 👋</h2>
        <p style="color: #b0b8c8; font-size: 1rem;">Please verify your email using the OTP below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background: #0a0e1a; padding: 15px 40px; border-radius: 8px; border: 2px solid #4CAF50;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">${otp}</span>
          </div>
        </div>
        <p style="color: #b0b8c8; font-size: 14px;">This OTP will expire in <strong style="color: #FF9800;">10 minutes</strong>.</p>
      </div>
      <div style="text-align: center; padding: 20px 0; color: #b0b8c8; font-size: 12px; border-top: 1px solid #2a3450; margin-top: 20px;">
        <p>© 2026 FitTrack Pro. All rights reserved.</p>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};

// ============================================
// WELCOME EMAIL
// ============================================
const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to FitTrack Pro! 🎉';
  const html = `
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
        <p style="color: #ffffff; font-size: 1.1rem;">Let's crush those goals together! 💪</p>
      </div>
      <div style="text-align: center; padding: 20px 0; color: #b0b8c8; font-size: 12px; border-top: 1px solid #2a3450; margin-top: 20px;">
        <p>© 2026 FitTrack Pro. All rights reserved.</p>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};

module.exports = { sendOTPEmail, sendWelcomeEmail, sendEmail };