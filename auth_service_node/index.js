const express = require('express');
const path = require('path');
const { initDB } = require('./config/db.config');
const authRouter = require('./routes/auth.router');
const { sqlInjectionProtection } = require('./utils/security.util');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sqlInjectionProtection);
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', authRouter);

// Root redirect to frontend example
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, async () => {
    console.log(`🚀 Auth Service is running at http://localhost:${PORT}`);
    
    // Initialize Database Tables
    await initDB();
});
