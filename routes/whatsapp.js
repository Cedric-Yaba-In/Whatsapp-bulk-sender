const express = require('express');
const whatsappService = require('../services/whatsappService');
const fileService = require('../services/fileService');
const { authenticateUser } = require('../middleware/auth');
const User = require('../models/User');
const Usage = require('../models/Usage');

const router = express.Router();

router.get('/status', (req, res) => {
  try {
    res.json(whatsappService.getStatus());
  } catch (error) {
    console.error('Erreur dans /api/status:', error.message);
    res.json({ 
      isReady: false, 
      qrCode: '',
      timestamp: Date.now(),
      loading: { progress: 0, message: 'Erreur de connexion' }
    });
  }
});

router.post('/reconnect', async (req, res) => {
  try {
    await whatsappService.reconnect();
    res.json({ success: true, message: 'Reconnexion en cours...' });
  } catch (error) {
    console.error('Erreur lors de la reconnexion:', error);
    res.status(500).json({ error: 'Erreur lors de la reconnexion' });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true, message: 'Déconnecté avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

router.post('/send-messages', authenticateUser, async (req, res) => {
  const { contacts, message, attachment } = req.body;
  const UserService = require('../services/userService');
  const TestAccountService = require('../services/testAccountService');
  
  if (!whatsappService.isReady) {
    return res.status(400).json({ error: 'WhatsApp non connecté. Veuillez vous reconnecter.' });
  }
  
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

    const results = [];
    let successfulSends = 0;
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        const personalizedMessage = message.replace(/{{name}}/g, contact.name);
        await whatsappService.sendMessage(contact.phone, personalizedMessage, attachment);
        
        results.push({ 
          contact: contact.name, 
          phone: contact.phone,
          status: 'sent',
          sentAt: new Date().toISOString()
        });
        
        successfulSends++;
        
      } catch (error) {
        console.error(`Erreur envoi à ${contact.name}:`, error.message);
        
        let errorMessage = 'Erreur inconnue';
        let errorCode = 'UNKNOWN_ERROR';
        
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('execution context was destroyed') ||
            errorMsg.includes('protocol error') ||
            errorMsg.includes('target closed') ||
            errorMsg.includes('session closed') ||
            errorMsg.includes('page has been closed')) {
          errorMessage = 'Session WhatsApp fermée. Reconnectez-vous.';
          errorCode = 'SESSION_CLOSED';
          whatsappService.isReady = false;
          whatsappService.qrCodeData = '';
        } else if (errorMsg.includes('not registered')) {
          errorMessage = 'Numéro non enregistré sur WhatsApp';
          errorCode = 'NOT_REGISTERED';
        } else if (errorMsg.includes('rate limit')) {
          errorMessage = 'Limite de débit atteinte';
          errorCode = 'RATE_LIMIT';
        } else if (errorMsg.includes('blocked')) {
          errorMessage = 'Numéro bloqué';
          errorCode = 'BLOCKED';
        }
        
        results.push({ 
          contact: contact.name, 
          phone: contact.phone,
          status: 'failed', 
          error: errorMessage,
          errorCode: errorCode,
          failedAt: new Date().toISOString()
        });
        
        if (errorCode === 'SESSION_CLOSED') break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Enregistrer les statistiques et décrémenter les messages
    if (successfulSends > 0) {
      let userStats;
      
      if (isTestAccount) {
        userStats = await TestAccountService.decrementMessages(testAccount, successfulSends);
      } else {
        userStats = await UserService.decrementMessages(req.user, successfulSends);
        
        const usage = new Usage({
          userId: req.user._id,
          messagesSent: successfulSends,
          contacts: results.map(r => ({
            name: r.contact,
            phone: r.phone,
            status: r.status
          }))
        });
        await usage.save();
      }
      
      // Ajouter les stats utilisateur à la réponse
      res.json({ 
        results, 
        userStats: {
          messagesUsed: userStats.messagesUsed,
          remainingMessages: userStats.remainingMessages,
          dailyLimit: userStats.dailyLimit
        }
      });
    } else {
      res.json({ results });
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;