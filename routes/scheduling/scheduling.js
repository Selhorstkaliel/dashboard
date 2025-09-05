const express = require('express');
const router = express.Router();

// Basic scheduling placeholder routes
router.get('/', (req, res) => {
    res.json({ message: 'Scheduling module - coming soon' });
});

module.exports = router;