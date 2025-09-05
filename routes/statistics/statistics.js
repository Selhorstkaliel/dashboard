const express = require('express');
const router = express.Router();

// Basic statistics placeholder routes  
router.get('/', (req, res) => {
    res.json({ message: 'Statistics module - coming soon' });
});

module.exports = router;