const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

// Detailed Transporter Configuration for Gmail
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS (Port 587)
    requireTLS: true,
    auth: {
        user: process.env.GMAIL_USER, // e.g., 'yourname@gmail.com'
        pass: process.env.GMAIL_PASS  // Gmail App Password
    },
    // Adding a timeout to prevent hanging connections
    connectionTimeout: 10000 
});

/**
 * Generates a random 5-digit numeric OTP.
 */
const generateOTP = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
};

/**
 * Sends a password reset OTP email.
 */
const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"PawHub Security" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: '🔐 Your Password Reset Code',
        text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px;">
                <h2 style="color: #2563eb;">Verification Required</h2>
                <p>Hello,</p>
                <p>Use the following 5-digit code to reset your password:</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #1e40af;">${otp}</span>
                </div>
                <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #666; margin-top: 20px;">This is an automated message, please do not reply.</p>
            </div>
        `
    };

    try {
        console.log(`📡 Verifying SMTP connection...`);
        await transporter.verify(); // Test connection before sending
        await transporter.sendMail(mailOptions);
        console.log(`✅ Success: OTP sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ SMTP/Email Error:', error.message);
        if (error.message.includes('Invalid login')) {
            console.error('👉 TIP: Ensure the provided password is a 16-digit App Password.');
        }
        return false;
    }
};

module.exports = { generateOTP, sendOTPEmail };
