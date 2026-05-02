const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/db.config');
const { generateOTP, sendOTPEmail } = require('../utils/mailer.util');

/**
 * @route   POST /auth/forgot-password
 * @desc    Check email, generate OTP, save to DB, and send email
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // 1. Check if user exists (Optional but recommended)
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            // Stop here but return 200 for security (prevent email enumeration)
            return res.json({ message: 'If this email is registered, you will receive an OTP shortly.' });
        }

        // 2. Generate 5-digit OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // 3. Save OTP to password_resets table
        await pool.query(
            'INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt]
        );

        // 4. Send Email
        const sent = await sendOTPEmail(email, otp);
        if (!sent) {
            return res.status(500).json({ error: 'Failed to send OTP email. Please try again later.' });
        }

        res.json({ message: 'OTP sent successfully. Please check your email.' });
    } catch (error) {
        console.error('Error in forgot-password:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   POST /auth/verify-otp
 * @desc    Verify if the provided OTP is correct and not expired
 */
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    try {
        const [rows] = await pool.query(
            'SELECT * FROM password_resets WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        res.json({ message: 'OTP verified successfully. You can now reset your password.' });
    } catch (error) {
        console.error('Error in verify-otp:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   POST /auth/reset-password
 * @desc    Update user password after OTP verification
 */
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // 1. Double check OTP validity
        const [rows] = await pool.query(
            'SELECT * FROM password_resets WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP session' });
        }

        // 2. Hash New Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // 3. Update User Password
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [passwordHash, email]);

        // 4. Clean up: Delete all reset entries for this email
        await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

        res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (error) {
        console.error('Error in reset-password:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
