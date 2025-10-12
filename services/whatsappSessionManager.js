const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppSessionManager {
  constructor() {
    this.sessions = new Map(); // userCode -> session
    this.sendingLocks = new Map(); // userCode -> boolean (pour éviter les envois concurrents)
    this.sessionDir = path.join(__dirname, '../sessions');
    
    // Créer le dossier sessions s'il n'existe pas
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  // Créer ou récupérer une session pour un utilisateur
  async getSession(userCode) {
    if (!userCode) {
      throw new Error('UserCode requis pour créer une session');
    }
    
    console.log(`🔍 Demande session pour ${userCode}`);
    
    // Vérifier si la session existe déjà
    if (this.sessions.has(userCode)) {
      const existingSession = this.sessions.get(userCode);
      console.log(`🔄 Session existante pour ${userCode}, statut: ${existingSession.isReady ? 'connecté' : 'en cours'}`);
      return existingSession;
    }

    console.log(`🆕 Création nouvelle session pour ${userCode}`);
    
    try {
      const session = await this.createSession(userCode);
      this.sessions.set(userCode, session);
      console.log(`✅ Session ajoutée à la map pour ${userCode}`);
      return session;
    } catch (error) {
      console.error(`❌ Erreur création session ${userCode}:`, error);
      throw error;
    }
  }

  // Créer une nouvelle session WhatsApp
  async createSession(userCode) {
    console.log(`🚀 Début création session WhatsApp pour ${userCode}`);
    console.log(`📁 Dossier session: ${path.join(this.sessionDir, userCode)}`);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: userCode,
        dataPath: path.join(this.sessionDir, userCode)
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        timeout: 60000
      }
    });
    
    console.log(`⚙️ Client WhatsApp créé pour ${userCode}`);

    const session = {
      client: client,
      userCode: userCode,
      isReady: false,
      qrCode: null,
      loading: {
        progress: 0,
        message: 'Initialisation...'
      },
      lastActivity: new Date()
    };

    // Événements du client
    client.on('loading_screen', (percent, message) => {
      console.log(`🔄 ${userCode} - Chargement: ${percent}% - ${message}`);
      session.loading.progress = Math.max(session.loading.progress, percent || 0);
      session.loading.message = message || 'Chargement...';
      
      // Supprimer le QR code quand le chargement commence
      if (percent > 50) {
        session.qrCode = null;
      }
    });
    
    client.on('qr', async (qr) => {
      console.log(`📱 QR Code généré pour ${userCode}`);
      try {
        session.qrCode = await qrcode.toDataURL(qr);
        session.loading.message = 'Scannez le QR code avec WhatsApp';
        session.loading.progress = 50;
        console.log(`✅ QR Code converti en DataURL pour ${userCode}`);
      } catch (error) {
        console.error(`❌ Erreur génération QR pour ${userCode}:`, error);
        session.loading.message = 'Erreur génération QR Code';
      }
    });

    client.on('ready', () => {
      console.log(`✅ WhatsApp connecté pour ${userCode}`);
      session.isReady = true;
      session.qrCode = null;
      session.loading.progress = 100;
      session.loading.message = 'Connecté !';
      session.lastActivity = new Date();
    });

    client.on('authenticated', () => {
      console.log(`🔐 Authentifié pour ${userCode}`);
      session.loading.progress = 75;
      session.loading.message = 'Authentification réussie...';
    });

    client.on('auth_failure', (msg) => {
      console.error(`❌ Échec authentification pour ${userCode}:`, msg);
      session.isReady = false;
      session.qrCode = null;
      session.loading.message = 'Échec de l\'authentification';
      session.loading.progress = 0;
    });

    client.on('disconnected', (reason) => {
      console.log(`🔌 Déconnecté ${userCode}:`, reason);
      session.isReady = false;
      session.qrCode = null;
      session.loading.progress = 0;
      session.loading.message = 'Déconnecté: ' + reason;
    });
    
    // Gestion des erreurs
    client.on('error', (error) => {
      console.error(`❌ Erreur client ${userCode}:`, error);
      session.loading.message = 'Erreur: ' + error.message;
      session.loading.progress = 0;
    });

    // Initialiser le client
    try {
      console.log(`🔄 Initialisation client pour ${userCode}...`);
      session.loading.progress = 10;
      session.loading.message = 'Démarrage du client WhatsApp...';
      
      // Initialiser sans timeout artificiel
      client.initialize();
      
      console.log(`✅ Initialisation lancée pour ${userCode}`);
      session.loading.progress = 25;
      session.loading.message = 'Connexion en cours...';
    } catch (error) {
      console.error(`❌ Erreur initialisation ${userCode}:`, error);
      session.loading.message = 'Erreur: ' + error.message;
      session.loading.progress = 0;
    }

    console.log(`🎯 Session créée pour ${userCode}, statut: ${session.isReady ? 'prêt' : 'en attente'}`);
    return session;
  }

  // Obtenir le statut d'une session
  getSessionStatus(userCode) {
    if (!userCode) {
      return {
        isReady: false,
        qrCode: null,
        loading: { progress: 0, message: 'UserCode manquant' }
      };
    }
    
    const session = this.sessions.get(userCode);
    if (!session) {
      return {
        isReady: false,
        qrCode: null,
        loading: { progress: 0, message: 'Session non initialisée' },
        userCode: userCode
      };
    }

    return {
      isReady: session.isReady,
      qrCode: session.qrCode,
      loading: session.loading,
      userCode: userCode,
      lastActivity: session.lastActivity
    };
  }

  // Envoyer un message via une session
  async sendMessage(userCode, phone, message, attachment = null) {
    if (!userCode) {
      throw new Error('UserCode requis pour envoyer un message');
    }
    
    const session = this.sessions.get(userCode);
    if (!session) {
      throw new Error(`Session WhatsApp non trouvée pour ${userCode}`);
    }
    
    if (!session.isReady) {
      throw new Error(`Session WhatsApp non connectée pour ${userCode}`);
    }

    // Mettre à jour l'activité
    session.lastActivity = new Date();

    // Formater le numéro de téléphone
    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = phone.includes('@') ? phone : `${cleanPhone}@c.us`;

    try {
      // Vérifier que le client est toujours actif
      if (!session.client || session.client.pupPage?.isClosed()) {
        throw new Error('Client WhatsApp fermé');
      }
      
      if (attachment) {
        // Envoyer avec pièce jointe (à implémenter selon vos besoins)
        await session.client.sendMessage(chatId, message);
      } else {
        await session.client.sendMessage(chatId, message);
      }
      
      console.log(`📤 Message envoyé par ${userCode} à ${cleanPhone}`);
    } catch (error) {
      console.error(`❌ Erreur envoi ${userCode} -> ${cleanPhone}:`, error.message);
      
      // Si erreur de session, marquer comme non prête
      if (error.message.includes('Protocol error') || 
          error.message.includes('Target closed') ||
          error.message.includes('Session closed')) {
        session.isReady = false;
        session.loading.message = 'Session fermée';
      }
      
      throw error;
    }
  }

  // Reconnecter une session
  async reconnectSession(userCode) {
    const session = this.sessions.get(userCode);
    if (session) {
      try {
        await session.client.destroy();
      } catch (error) {
        console.error(`Erreur destruction session ${userCode}:`, error);
      }
      this.sessions.delete(userCode);
    }

    return await this.getSession(userCode);
  }

  // Déconnecter une session
  async disconnectSession(userCode) {
    const session = this.sessions.get(userCode);
    if (session) {
      try {
        await session.client.destroy();
        console.log(`🔌 Session ${userCode} détruite`);
      } catch (error) {
        console.error(`Erreur déconnexion ${userCode}:`, error);
      }
      this.sessions.delete(userCode);
    }
  }

  // Nettoyer les sessions inactives (plus de 30 min)
  async cleanupInactiveSessions() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [userCode, session] of this.sessions.entries()) {
      if (now - session.lastActivity > inactiveThreshold) {
        console.log(`🧹 Nettoyage session inactive: ${userCode}`);
        await this.disconnectSession(userCode);
      }
    }
  }

  // Vérifier si un utilisateur est en train d'envoyer
  isSending(userCode) {
    return this.sendingLocks.has(userCode) && this.sendingLocks.get(userCode);
  }
  
  // Obtenir les statistiques des sessions
  getSessionsStats() {
    const stats = {
      totalSessions: this.sessions.size,
      readySessions: 0,
      pendingSessions: 0,
      sendingUsers: this.sendingLocks.size,
      sessions: []
    };

    for (const [userCode, session] of this.sessions.entries()) {
      if (session.isReady) {
        stats.readySessions++;
      } else {
        stats.pendingSessions++;
      }

      stats.sessions.push({
        userCode: userCode,
        isReady: session.isReady,
        isSending: this.isSending(userCode),
        lastActivity: session.lastActivity
      });
    }

    return stats;
  }
}

// Instance singleton
const sessionManager = new WhatsAppSessionManager();

// Nettoyage automatique toutes les 10 minutes
setInterval(() => {
  sessionManager.cleanupInactiveSessions();
}, 10 * 60 * 1000);

module.exports = sessionManager;