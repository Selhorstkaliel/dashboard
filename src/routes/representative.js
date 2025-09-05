const express = require('express');
const router = express.Router();

// Placeholder for representative routes
router.get('/', (req, res) => {
  res.json({ message: 'Representative API - Em desenvolvimento' });
});

module.exports = router;