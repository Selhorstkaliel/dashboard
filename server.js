const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database initialization
const db = require('./src/database/database');

// Initialize database
db.init();

// Routes
app.use('/api/auth', require('./routes/auth/auth'));
app.use('/api/admin', require('./routes/admin/admin'));
app.use('/api/representative', require('./routes/representative/representative'));
app.use('/api/profile', require('./routes/profile/profile'));
app.use('/api/entries', require('./routes/entries/entries'));
app.use('/api/charts', require('./routes/charts/charts'));
app.use('/api/scheduling', require('./routes/scheduling/scheduling'));
app.use('/api/statistics', require('./routes/statistics/statistics'));
app.use('/api/tickets', require('./routes/tickets/tickets'));
app.use('/api/validation', require('./routes/validation/validation'));

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/dashboard.html'));
});

app.get('/support', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/support.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;