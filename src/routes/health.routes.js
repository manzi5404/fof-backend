const express = require('express');

const router = express.Router();

// GET / → "FOF Backend Running"
// Note: This route is NOT wired into the current server.js yet.
router.get('/', (req, res) => {
  res.status(200).json({ status: 'FOF Backend Running' });
});

module.exports = router;

