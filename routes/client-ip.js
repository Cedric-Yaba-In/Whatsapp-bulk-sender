const express = require('express');
const router = express.Router();

router.get('/get-client-ip', (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';
  res.json({ ip: clientIp });
});

module.exports = router;