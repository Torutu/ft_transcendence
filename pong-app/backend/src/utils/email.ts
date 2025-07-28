import nodemailer from 'nodemailer';
import env from '../env';

const transporter = nodemailer.createTransport({
  // host: env.EMAIL_HOST,
  // port: parseInt(env.EMAIL_PORT),
  // secure: env.EMAIL_SECURE === 'true',
  service: env.EMAIL_SERVICE, // e.g., 'gmail', 'outlook', etc.
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD
  }
});

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Pong Game" <${env.EMAIL_FROM}>`,
      to,
      subject: 'Verify Your Email Address',
      text: `Your verification code is: ${code}\n\nThis code will expire in 24 hours.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #2563eb;">
            ${code}
          </div>
          <p>This code will expire in 24 hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}