const User = require('../models/User');

class UserService {
  // Vérifier et réinitialiser les messages quotidiens si nécessaire
  static async checkAndResetDailyMessages(user) {
    // Les comptes de test n'ont pas de limitations
    if (user.isTestAccount) {
      return user;
    }
    
    const today = new Date();
    const lastReset = new Date(user.lastResetDate);
    
    // Si c'est un nouveau jour, réinitialiser
    if (today.toDateString() !== lastReset.toDateString()) {
      user.messagesUsedToday = 0;
      user.lastResetDate = today;
      await user.save();
      console.log(`🔄 Messages quotidiens réinitialisés pour l'utilisateur ${user.code}`);
    }
    
    return user;
  }
  
  // Vérifier si l'utilisateur peut envoyer des messages
  static canSendMessages(user, messageCount) {
    // Les comptes de test n'ont pas de limitations
    if (user.isTestAccount) {
      return true;
    }
    
    const remainingMessages = user.packId.dailyLimit - user.messagesUsedToday;
    return messageCount <= remainingMessages;
  }
  
  // Décrémenter les messages disponibles
  static async decrementMessages(user, messageCount) {
    // Les comptes de test n'ont pas de limitations
    if (user.isTestAccount) {
      console.log(`📊 Compte de test ${user.code}: ${messageCount} messages envoyés (illimité)`);
      return {
        messagesUsed: 0,
        remainingMessages: 999999,
        dailyLimit: 999999
      };
    }
    
    const previousUsed = user.messagesUsedToday;
    user.messagesUsedToday += messageCount;
    await user.save();
    
    const remainingMessages = Math.max(0, user.packId.dailyLimit - user.messagesUsedToday);
    
    console.log(`📊 Utilisateur ${user.code}: ${previousUsed} -> ${user.messagesUsedToday} (+${messageCount}), ${remainingMessages}/${user.packId.dailyLimit} restants`);
    
    return {
      messagesUsed: user.messagesUsedToday,
      remainingMessages: remainingMessages,
      dailyLimit: user.packId.dailyLimit
    };
  }
  
  // Obtenir les statistiques de l'utilisateur
  static getUserStats(user) {
    // Les comptes de test n'ont pas de limitations
    if (user.isTestAccount) {
      return {
        name: user.name,
        pack: user.packId.name + ' (Test)',
        dailyLimit: 999999,
        messagesUsedToday: 0,
        remainingMessages: 999999,
        resetDate: user.lastResetDate,
        code: user.code
      };
    }
    
    const remainingMessages = Math.max(0, user.packId.dailyLimit - user.messagesUsedToday);
    
    console.log(`📊 Stats pour ${user.code}: utilisés=${user.messagesUsedToday}, limite=${user.packId.dailyLimit}, restants=${remainingMessages}`);
    
    return {
      name: user.name,
      pack: user.packId.name,
      dailyLimit: user.packId.dailyLimit,
      messagesUsedToday: user.messagesUsedToday,
      remainingMessages: remainingMessages,
      resetDate: user.lastResetDate,
      code: user.code
    };
  }
}

module.exports = UserService;