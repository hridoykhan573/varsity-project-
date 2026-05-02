const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'auth_service_db'
};

const pool = mysql.createPool(dbConfig);

// SQL to initialize tables
const initDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database.');

        // Users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Password Resets table with OTP and Expiry
        await connection.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                otp VARCHAR(5) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (email)
            )
        `);

        console.log('✅ Tables initialized successfully.');
        connection.release();
    } catch (error) {
        console.error('❌ Database Initialization Error:', error.message);
    }
};

module.exports = { pool, initDB };
