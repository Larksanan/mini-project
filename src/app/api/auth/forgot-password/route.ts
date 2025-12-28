import { NextRequest, NextResponse } from 'next/server';
import { createTransport } from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import PasswordResetToken from '@/models/PasswordResetToken';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const successResponse = NextResponse.json(
      { message: 'If the email exists, a reset link will be sent' },
      { status: 200 }
    );

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // For security, don't reveal whether email exists
      return successResponse;
    }

    // Generate unique token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Atomically update or create the reset token for the user's email
    await PasswordResetToken.findOneAndUpdate(
      { email: email.toLowerCase() },
      { token, expiresAt, used: false },
      { upsert: true, new: true }
    );

    // Send reset email
    const emailSent = await sendResetEmail(email, token);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send reset email' },
        { status: 500 }
      );
    }

    return successResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Email sending function
async function sendResetEmail(email: string, token: string) {
  try {
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

    // For development, log the link instead of sending email
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset link:', resetLink);
      return true;
    }

    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || 'jebarsanthatcroos@gmail.com',
      to: email,
      subject: 'Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              .container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You requested to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" class="button">Reset Password</a>
                </p>
                <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                <p>This link will expire in 1 hour.</p>
                <div class="footer">
                  <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <p><a href="${resetLink}">${resetLink}</a></p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}
