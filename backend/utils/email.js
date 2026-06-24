const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
};

const sendOTPEmail = async (email, otp, name) => {
  try {
    const transporter = getTransporter();
    
    const info = await transporter.sendMail({
      from: `"FitTrack Pro" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - FitTrack Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #ffffff; border-radius: 10px;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #4CAF50;">FitTrack Pro</h1>
            <p style="color: #b0b8c8;">Your Fat Loss Journey Starts Here</p>
          </div>
          <div style="background: #141b2d; padding: 30px; border-radius: 10px; border: 1px solid #2a3450;">
            <h2 style="margin-top: 0;">Hello ${name || 'there'}! 👋</h2>
            <p>Thank you for signing up. Please verify your email using the OTP below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: #0a0e1a; padding: 15px 40px; border-radius: 8px; border: 2px solid #4CAF50;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">${otp}</span>
              </div>
            </div>
            <p style="color: #b0b8c8; font-size: 14px;">This OTP will expire in <strong>10 minutes</strong>.</p>
          </div>
          <div style="text-align: center; padding: 20px 0; color: #b0b8c8; font-size: 12px; border-top: 1px solid #2a3450; margin-top: 20px;">
            <p>© 2026 FitTrack Pro. All rights reserved.</p>
          </div>
        </div>
      `
    });
    console.log('✅ OTP email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: `"FitTrack Pro" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to FitTrack Pro! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0e1a; color: #ffffff; border-radius: 10px;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #4CAF50;">Welcome to FitTrack Pro!</h1>
          </div>
          <div style="background: #141b2d; padding: 30px; border-radius: 10px; border: 1px solid #2a3450;">
            <h2>Hello ${name || 'there'}! 🎊</h2>
            <p>Your email has been successfully verified. You're now ready to start tracking your fat loss journey!</p>
            <div style="margin: 20px 0; padding: 15px; background: #0a0e1a; border-radius: 8px; border-left: 4px solid #4CAF50;">
              <p style="margin: 0; color: #b0b8c8;">📊 Track your weight daily</p>
              <p style="margin: 5px 0 0 0; color: #b0b8c8;">💪 Log your workouts</p>
              <p style="margin: 5px 0 0 0; color: #b0b8c8;">📈 View progress charts</p>
              <p style="margin: 5px 0 0 0; color: #b0b8c8;">🤖 Get AI-powered coaching</p>
            </div>
            <p>Let's crush those goals together! 💪</p>
          </div>
          <div style="text-align: center; padding: 20px 0; color: #b0b8c8; font-size: 12px; border-top: 1px solid #2a3450; margin-top: 20px;">
            <p>© 2026 FitTrack Pro. All rights reserved.</p>
          </div>
        </div>
      `
    });
    console.log('✅ Welcome email sent');
  } catch (error) {
    console.error('❌ Welcome email error:', error);
  }
};

module.exports = { sendOTPEmail, sendWelcomeEmail };