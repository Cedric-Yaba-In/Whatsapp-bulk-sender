const User = require('../models/User');

const authenticateUser = async (req, res, next) => {
  const { userCode } = req.body;
  
  if (!userCode) {
    return res.status(401).json({ error: 'Code utilisateur requis' });
  }
  
  try {
    // Si c'est le code test, créer un utilisateur virtuel
    if (userCode.toUpperCase() === 'TEST2024') {
      req.user = {
        code: 'TEST2024',
        name: 'Compte Test',
        isTestAccount: true
      };
      return next();
    }
    
    const user = await User.findOne({ code: userCode.toUpperCase(), isActive: true }).populate('packId');
    
    if (!user) {
      return res.status(401).json({ error: 'Code utilisateur invalide ou inactif' });
    }
    
    // Vérifier et réinitialiser les messages quotidiens si nécessaire
    const today = new Date();
    const lastReset = new Date(user.lastResetDate);
    
    if (today.toDateString() !== lastReset.toDateString()) {
      user.messagesUsedToday = 0;
      user.lastResetDate = today;
      await user.save();
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erreur d\'authentification' });
  }
};

const authenticateAdmin = (req, res, next) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    req.session.isAdmin = true;
    next();
  } else {
    res.status(401).json({ success: false, message: 'Identifiants incorrects' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: 'Accès non autorisé' });
  }
};

module.exports = {
  authenticateUser,
  authenticateAdmin,
  requireAdmin
};