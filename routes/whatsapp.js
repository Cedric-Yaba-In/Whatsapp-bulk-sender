const express = require('express');
const sessionManager = require('../services/whatsappSessionManager');
const fileService = require('../services/fileService');
const { authenticateUser } = require('../middleware/auth');
const User = require('../models/User');
const Usage = require('../models/Usage');

const router = express.Router();

router.get('/status/:userCode', async (req, res) => {
  try {
    const { userCode } = req.params;
    
    // Vérifier si la session existe, sinon la créer
    if (!sessionManager.sessions.has(userCode)) {
      console.log(`🆕 Création automatique de session pour ${userCode}`);
      await sessionManager.getSession(userCode);
    }
    
    const status = sessionManager.getSessionStatus(userCode);
    res.json({
      ...status,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erreur dans /api/status:', error.message);
    res.json({ 
      isReady: false, 
      qrCode: null,
      timestamp: Date.now(),
      loading: { progress: 0, message: 'Erreur de connexion' }
    });
  }
});

router.post('/reconnect', authenticateUser, async (req, res) => {
  try {
    const userCode = req.user.code || 'TEST2024';
    console.log(`🔄 Reconnexion demandée pour ${userCode}`);
    
    await sessionManager.reconnectSession(userCode);
    res.json({ success: true, message: 'Reconnexion en cours...' });
  } catch (error) {
    console.error('Erreur lors de la reconnexion:', error);
    res.status(500).json({ error: 'Erreur lors de la reconnexion' });
  }
});

router.post('/disconnect', authenticateUser, async (req, res) => {
  try {
    const userCode = req.user.code || 'TEST2024';
    console.log(`🔌 Déconnexion demandée pour ${userCode}`);
    
    await sessionManager.disconnectSession(userCode);
    res.json({ success: true, message: 'Déconnecté avec succès' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

// Route pour obtenir les statistiques des sessions
router.get('/sessions-stats', (req, res) => {
  res.json(sessionManager.getSessionsStats());
});

// Route pour initialiser une session WhatsApp
router.post('/init-session', authenticateUser, async (req, res) => {
  try {
    const userCode = req.user.code || req.user.userCode || 'TEST2024';
    console.log(`🚀 Initialisation session pour ${userCode}`);
    
    const session = await sessionManager.getSession(userCode);
    
    res.json({ 
      success: true, 
      message: 'Session initialisée',
      status: {
        isReady: session.isReady,
        loading: session.loading
      }
    });
  } catch (error) {
    console.error('Erreur initialisation session:', error);
    res.status(500).json({ error: 'Erreur lors de l\'initialisation' });
  }
});

router.post('/send-messages', authenticateUser, async (req, res) => {
  const { contacts, message, attachment } = req.body;
  const UserService = require('../services/userService');
  const TestAccountService = require('../services/testAccountService');
  
  // Vérifier que la session WhatsApp de l'utilisateur est connectée
  const userCode = req.user.code || req.user.userCode || 'TEST2024';
  
  // Vérifier si un envoi est déjà en cours pour cet utilisateur
  if (sessionManager.sendingLocks.get(userCode)) {
    return res.status(429).json({ error: 'Un envoi est déjà en cours. Veuillez patienter.' });
  }
  
  const sessionStatus = sessionManager.getSessionStatus(userCode);
  if (!sessionStatus.isReady) {
    return res.status(400).json({ error: 'Votre session WhatsApp n\'est pas connectée. Veuillez vous connecter d\'abord.' });
  }
  
  console.log(`🚀 Démarrage envoi pour ${userCode}: ${contacts.length} contacts`);
  
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';
    let isTestAccount = false;
    let testAccount = null;
    
    // Vérifier si c'est un compte test par IP
    if (req.user.code === 'TEST2024') {
      isTestAccount = true;
      testAccount = await TestAccountService.getOrCreateTestAccount(clientIp);
      
      // Vérifier la limite pour le compte test
      if (!TestAccountService.canSendMessages(testAccount, contacts.length)) {
        const remainingMessages = 5 - testAccount.messagesUsedToday;
        return res.status(400).json({ 
          error: `Limite quotidienne atteinte ! Vous pouvez encore envoyer ${remainingMessages} messages aujourd'hui. Votre quota se réinitialise à 01h00.`,
          remainingMessages: remainingMessages,
          dailyLimit: 5,
          resetTime: '01:00'
        });
      }
    } else {
      // Vérifier et réinitialiser les messages quotidiens si nécessaire
      await UserService.checkAndResetDailyMessages(req.user);
      
      // Vérifier la limite quotidienne
      if (!UserService.canSendMessages(req.user, contacts.length)) {
        const remainingMessages = req.user.packId.dailyLimit - req.user.messagesUsedToday;
        return res.status(400).json({ 
          error: `Limite quotidienne atteinte ! Vous pouvez encore envoyer ${remainingMessages} messages aujourd'hui. Votre quota se réinitialise à 01h00.`,
          remainingMessages: remainingMessages,
          dailyLimit: req.user.packId.dailyLimit,
          resetTime: '01:00'
        });
      }
    }

    // Verrouiller l'envoi pour cet utilisateur
    sessionManager.sendingLocks.set(userCode, true);
    
    try {
      // Envoyer directement avec la session de l'utilisateur
      const results = [];
      let successfulSends = 0;
      
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        try {
          const personalizedMessage = message.replace(/{{name}}/g, contact.name);
          await sessionManager.sendMessage(userCode, contact.phone, personalizedMessage, attachment);
          
          results.push({ 
            contact: contact.name, 
            phone: contact.phone,
            status: 'sent',
            sentAt: new Date().toISOString()
          });
          
          successfulSends++;
          console.log(`✅ ${i + 1}/${contacts.length} - ${contact.name}: envoyé`);
          
        } catch (error) {
          console.error(`❌ ${i + 1}/${contacts.length} - Erreur envoi à ${contact.name}:`, error.message);
          
          results.push({ 
            contact: contact.name, 
            phone: contact.phone,
            status: 'failed', 
            error: error.message,
            failedAt: new Date().toISOString()
          });
          
          // Si erreur de session, arrêter l'envoi
          if (error.message.includes('Session WhatsApp') || 
              error.message.includes('Client WhatsApp')) {
            console.log(`🛑 Arrêt de l'envoi pour ${userCode} - session fermée`);
            break;
          }
        }
        
        // Délai entre les messages
        if (i < contacts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    
      // Enregistrer les statistiques et décrémenter les messages UNIQUEMENT pour les envois réussis
      let userStats = null;
      
      if (successfulSends > 0) {
        if (isTestAccount) {
          userStats = await TestAccountService.decrementMessages(testAccount, successfulSends);
        } else {
          userStats = await UserService.decrementMessages(req.user, successfulSends);
          
          // Enregistrer l'usage uniquement pour les messages envoyés avec succès
          const usage = new Usage({
            userId: req.user._id,
            messagesSent: successfulSends,
            contacts: results.filter(r => r.status === 'sent').map(r => ({
              name: r.contact,
              phone: r.phone,
              status: r.status
            }))
          });
          await usage.save();
        }
        
        console.log(`📊 Utilisateur ${userCode}: ${successfulSends}/${contacts.length} messages envoyés avec succès`);
      }
      
      // Toujours retourner les résultats avec les stats si disponibles
      const response = { results };
      if (userStats) {
        response.userStats = {
          messagesUsed: userStats.messagesUsed,
          remainingMessages: userStats.remainingMessages,
          dailyLimit: userStats.dailyLimit
        };
      }
      
      res.json(response);
      
    } finally {
      // Déverrouiller l'envoi pour cet utilisateur
      sessionManager.sendingLocks.delete(userCode);
      console.log(`🔓 Envoi déverrouillé pour ${userCode}`);
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;