const express = require('express');
const router = express.Router();

// Placeholder for admin routes
router.get('/', (req, res) => {
  res.json({ message: 'Admin API - Em desenvolvimento' });
});

module.exports = router;