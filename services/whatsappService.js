const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrCodeData = '';
    this.loadingProgress = 0;
    this.loadingMessage = '';
  }

  async initialize() {
    this.loadingProgress = 5;
    this.loadingMessage = 'Initialisation du client WhatsApp...';
    
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.client.on('qr', async (qr) => {
      this.qrCodeData = await QRCode.toDataURL(qr);
      this.loadingProgress = 50;
      this.loadingMessage = 'QR Code généré - En attente du scan';
    });

    this.client.on('loading_screen', (percent, message) => {
      this.loadingProgress = Math.max(10, percent);
      this.loadingMessage = message || 'Chargement en cours...';
    });

    this.client.on('authenticated', () => {
      this.loadingProgress = 90;
      this.loadingMessage = 'Authentification réussie';
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.loadingProgress = 100;
      this.loadingMessage = 'Connexion établie';
      console.log('WhatsApp client is ready!');
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp disconnected:', reason);
      this.isReady = false;
      this.qrCodeData = '';
      this.loadingProgress = 0;
      this.loadingMessage = '';
    });
    
    this.client.on('auth_failure', (msg) => {
      console.log('Authentication failure:', msg);
      this.isReady = false;
      this.qrCodeData = '';
    });

    this.client.initialize();
  }

  async reconnect() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        console.log('Erreur lors de la destruction (ignorée):', error.message);
      }
    }
    
    this.isReady = false;
    this.qrCodeData = '';
    this.loadingProgress = 0;
    this.loadingMessage = '';
    this.client = null;
    
    setTimeout(() => {
      this.initialize();
    }, 3000);
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      this.qrCodeData = '';
      this.loadingProgress = 0;
      this.loadingMessage = '';
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      qrCode: this.qrCodeData,
      timestamp: Date.now(),
      loading: {
        progress: this.loadingProgress,
        message: this.loadingMessage
      }
    };
  }

  async sendMessage(phone, message, attachment = null) {
    if (!this.isReady || !this.client) {
      throw new Error('WhatsApp non connecté');
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '').replace('+', '') + '@c.us';

    if (attachment && attachment.path) {
      const media = MessageMedia.fromFilePath(attachment.path);
      media.filename = attachment.filename;
      media.mimetype = attachment.mimetype;
      
      if (attachment.mimetype.startsWith('image/')) {
        await this.client.sendMessage(cleanPhone, media, { caption: message });
      } else {
        await this.client.sendMessage(cleanPhone, media, { 
          caption: message,
          sendMediaAsDocument: true 
        });
      }
    } else {
      await this.client.sendMessage(cleanPhone, message);
    }
  }
}

module.exports = new WhatsAppService();