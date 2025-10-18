const express = require('express');
const router = express.Router();

// Route de debug pour vérifier l'IP détectée
router.get('/debug-ip', (req, res) => {
  const ipInfo = {
    clientIp: req.clientIp,
    reqIp: req.ip,
    xForwardedFor: req.headers['x-forwarded-for'],
    xRealIp: req.headers['x-real-ip'],
    remoteAddress: req.connection.remoteAddress,
    socketRemoteAddress: req.socket.remoteAddress,
    allHeaders: req.headers
  };
  
  console.log('🔍 Debug IP:', ipInfo);
  res.json(ipInfo);
});

module.exports = router;