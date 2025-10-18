const express = require('express');
const User = require('../models/User');
const Pack = require('../models/Pack');

const router = express.Router();

router.get('/packs', async (req, res) => {
  try {
    const packs = await Pack.find({ isActive: true }).sort({ dailyLimit: 1 });
    res.json(packs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du chargement des packs' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Trouver le pack gratuit
    const freePack = await Pack.findOne({ name: 'Gratuit', isActive: true });
    if (!freePack) {
      return res.status(400).json({ success: false, message: 'Pack gratuit non disponible' });
    }
    
    // Générer un code unique
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingUser = await User.findOne({ code });
      if (!existingUser) isUnique = true;
    }
    
    const user = new User({ 
      name, 
      email: email || `${code.toLowerCase()}@free.temp`, 
      packId: freePack._id, 
      code 
    });
    await user.save();
    
    res.json({ success: true, code });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du compte' });
  }
});

router.post('/verify-user', async (req, res) => {
  const { userCode } = req.body;
  const UserService = require('../services/userService');
  const TestAccountService = require('../services/testAccountService');
  
  try {
    const clientIp = req.clientIp || req.ip || '127.0.0.1';
    console.log(`🔍 Vérification utilisateur ${userCode} depuis IP: ${clientIp}`);
    
    // Si c'est le code test, utiliser le système par IP
    if (userCode.toUpperCase() === 'TEST2024') {
      console.log(`🧪 Compte test demandé depuis IP: ${clientIp}`);
      const testAccount = await TestAccountService.getOrCreateTestAccount(clientIp);
      const userStats = TestAccountService.getTestAccountStats(testAccount);
      
      return res.json({
        valid: true,
        user: userStats,
        isTestAccount: true,
        ipAddress: clientIp
      });
    }
    
    let user = await User.findOne({ code: userCode.toUpperCase(), isActive: true }).populate('packId');
    
    if (!user) {
      return res.json({ valid: false, message: 'Code utilisateur invalide ou inactif' });
    }
    
    // Vérifier et réinitialiser les messages quotidiens si nécessaire
    user = await UserService.checkAndResetDailyMessages(user);
    
    const userStats = UserService.getUserStats(user);
    
    res.json({
      valid: true,
      user: userStats,
      isTestAccount: false
    });
  } catch (error) {
    res.status(500).json({ valid: false, message: 'Erreur lors de la vérification' });
  }
});

// Route pour récupérer les stats utilisateur actualisées
router.get('/user-stats/:userCode', async (req, res) => {
  const { userCode } = req.params;
  const UserService = require('../services/userService');
  const TestAccountService = require('../services/testAccountService');
  
  try {
    const clientIp = req.clientIp || req.ip || '127.0.0.1';
    console.log(`📊 Récupération stats pour ${userCode} depuis IP: ${clientIp}`);
    
    if (userCode.toUpperCase() === 'TEST2024') {
      const testAccount = await TestAccountService.getOrCreateTestAccount(clientIp);
      const userStats = TestAccountService.getTestAccountStats(testAccount);
      return res.json({ success: true, user: userStats });
    }
    
    let user = await User.findOne({ code: userCode.toUpperCase(), isActive: true }).populate('packId');
    
    if (!user) {
      return res.json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    user = await UserService.checkAndResetDailyMessages(user);
    const userStats = UserService.getUserStats(user);
    
    res.json({ success: true, user: userStats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des stats' });
  }
});

module.exports = router;