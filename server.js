const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { parse } = require('json2csv');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Différents filtres selon la route
    if (req.route.path === '/api/upload') {
      // Pour l'upload de contacts : CSV, JSON, Excel
      const allowedTypes = /csv|json|xlsx|xls/;
      const allowedMimes = /text\/csv|application\/json|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedMimes.test(file.mimetype);
      
      if (mimetype || extname) {
        return cb(null, true);
      }
    } else {
      // Pour les pièces jointes : images, PDF, documents
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      }
    }
    
    cb(new Error('Type de fichier non autorisé'));
  }
});

app.use(express.static('public'));
app.use(express.json());

// Middleware pour logger toutes les requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

let client;
let isReady = false;
let qrCodeData = '';

// Initialiser le client WhatsApp
const initWhatsApp = () => {
  loadingProgress = 5;
  loadingMessage = 'Initialisation du client WhatsApp...';
  
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  });

  client.on('qr', async (qr) => {
    qrCodeData = await QRCode.toDataURL(qr);
    loadingProgress = 50;
    loadingMessage = 'QR Code généré - En attente du scan';
  });

  client.on('loading_screen', (percent, message) => {
    loadingProgress = Math.max(10, percent); // Minimum 10%
    loadingMessage = message || 'Chargement en cours...';
    console.log('Loading screen:', percent, message);
  });

  client.on('authenticated', () => {
    loadingProgress = 90;
    loadingMessage = 'Authentification réussie';
    console.log('WhatsApp authenticated');
  });

  client.on('ready', () => {
    isReady = true;
    loadingProgress = 100;
    loadingMessage = 'Connexion établie';
    console.log('WhatsApp client is ready!');
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp disconnected:', reason);
    isReady = false;
    qrCodeData = '';
    loadingProgress = 0;
    loadingMessage = '';
  });
  
  client.on('auth_failure', (msg) => {
    console.log('Authentication failure:', msg);
    isReady = false;
    qrCodeData = '';
  });

  client.initialize();
};

// Routes API
let loadingProgress = 0;
let loadingMessage = '';

app.get('/api/status', (req, res) => {
  try {
    res.json({ 
      isReady, 
      qrCode: qrCodeData,
      timestamp: Date.now(),
      loading: {
        progress: loadingProgress,
        message: loadingMessage
      }
    });
  } catch (error) {
    console.error('Erreur dans /api/status:', error.message);
    res.json({ 
      isReady: false, 
      qrCode: '',
      timestamp: Date.now(),
      loading: {
        progress: 0,
        message: 'Erreur de connexion'
      }
    });
  }
});

app.post('/api/reconnect', async (req, res) => {
  console.log('Route /api/reconnect appelée');
  try {
    if (client) {
      console.log('Destruction du client existant...');
      try {
        await client.destroy();
      } catch (destroyError) {
        console.log('Erreur lors de la destruction (ignorée):', destroyError.message);
      }
    }
    
    // Réinitialiser les variables
    isReady = false;
    qrCodeData = '';
    loadingProgress = 0;
    loadingMessage = '';
    client = null;
    
    console.log('Variables réinitialisées, redémarrage dans 3s...');
    
    // Attendre plus longtemps pour être sûr
    setTimeout(() => {
      console.log('Redémarrage du client WhatsApp...');
      initWhatsApp();
    }, 3000);
    
    res.json({ success: true, message: 'Reconnexion en cours...' });
  } catch (error) {
    console.error('Erreur lors de la reconnexion:', error);
    res.status(500).json({ error: 'Erreur lors de la reconnexion' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const contacts = [];

  if (file.mimetype === 'text/csv') {
    fs.createReadStream(file.path)
      .pipe(csv())
      .on('data', (row) => {
        contacts.push({
          name: row.name || row.nom,
          phone: row.phone || row.telephone
        });
      })
      .on('end', () => {
        fs.unlinkSync(file.path);
        res.json({ contacts });
      });
  } else if (file.mimetype === 'application/json') {
    const data = JSON.parse(fs.readFileSync(file.path, 'utf8'));
    fs.unlinkSync(file.path);
    res.json({ contacts: data });
  } else if (file.mimetype.includes('sheet')) {
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    data.forEach(row => {
      contacts.push({
        name: row.name || row.nom,
        phone: row.phone || row.telephone
      });
    });
    
    fs.unlinkSync(file.path);
    res.json({ contacts });
  }
});

// Route pour upload de pièces jointes
app.post('/api/upload-attachment', upload.single('attachment'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const fileInfo = {
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    };
    
    res.json({ success: true, file: fileInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour télécharger les templates
app.get('/api/template/:format', (req, res) => {
  const format = req.params.format;
  const sampleData = [
    { name: 'John Doe', phone: '+33123456789' },
    { name: 'Jane Smith', phone: '+33987654321' }
  ];

  if (format === 'csv') {
    const csv = parse(sampleData, { fields: ['name', 'phone'] });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="template.csv"');
    res.send(csv);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="template.json"');
    res.json(sampleData);
  } else if (format === 'excel') {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template.xlsx"');
    res.send(buffer);
  }
});

app.post('/api/send-messages', async (req, res) => {
  const { contacts, message, attachment } = req.body;
  
  if (!isReady || !client) {
    return res.status(400).json({ error: 'WhatsApp non connecté. Veuillez vous reconnecter.' });
  }

  const results = [];
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    try {
      // Format unique: supprimer tous les caractères non numériques sauf +, puis supprimer le +, puis ajouter @c.us
      const cleanPhone = contact.phone.replace(/[^\d+]/g, '').replace('+', '') + '@c.us';
      const personalizedMessage = message.replace(/{{name}}/g, contact.name);
      
      console.log(`Tentative d'envoi à ${contact.name} (${cleanPhone})`);
      
      if (attachment && attachment.path) {
        const media = MessageMedia.fromFilePath(attachment.path);
        // Définir le nom de fichier et le type MIME correctement
        media.filename = attachment.filename;
        media.mimetype = attachment.mimetype;
        
        // Envoyer selon le type de fichier
        if (attachment.mimetype.startsWith('image/')) {
          // Pour les images, envoyer avec caption
          await client.sendMessage(cleanPhone, media, { caption: personalizedMessage });
        } else {
          // Pour les documents (PDF, DOC, etc.), envoyer comme document avec le message séparé
          await client.sendMessage(cleanPhone, media, { 
            caption: personalizedMessage,
            sendMediaAsDocument: true 
          });
        }
      } else {
        await client.sendMessage(cleanPhone, personalizedMessage);
      }
      
      console.log(`Envoi réussi à ${contact.name} (${cleanPhone})`);
      
      results.push({ 
        contact: contact.name, 
        phone: contact.phone,
        status: 'sent',
        sentAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Erreur envoi à ${contact.name}:`, error.message);
      
      let errorMessage = 'Erreur inconnue';
      let errorCode = 'UNKNOWN_ERROR';
      
      const errorMsg = error.message.toLowerCase();
      
      // Vérifier les erreurs de session critiques
      if (errorMsg.includes('execution context was destroyed') ||
          errorMsg.includes('protocol error') ||
          errorMsg.includes('target closed') ||
          errorMsg.includes('session closed') ||
          errorMsg.includes('page has been closed')) {
        errorMessage = 'Session WhatsApp fermée. Reconnectez-vous.';
        errorCode = 'SESSION_CLOSED';
        isReady = false;
        qrCodeData = '';
      } else if (errorMsg.includes('not registered') || errorMsg.includes('phone number is not registered')) {
        errorMessage = 'Numéro non enregistré sur WhatsApp';
        errorCode = 'NOT_REGISTERED';
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
        errorMessage = 'Limite de débit atteinte';
        errorCode = 'RATE_LIMIT';
      } else if (errorMsg.includes('blocked') || errorMsg.includes('block')) {
        errorMessage = 'Numéro bloqué';
        errorCode = 'BLOCKED';
      } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
        errorMessage = 'Erreur de réseau';
        errorCode = 'NETWORK_ERROR';
      } else if (errorMsg.includes('invalid') || errorMsg.includes('format')) {
        errorMessage = 'Format de numéro invalide';
        errorCode = 'INVALID_FORMAT';
      } else if (errorMsg.includes('media') || errorMsg.includes('file')) {
        errorMessage = 'Erreur fichier joint';
        errorCode = 'MEDIA_ERROR';
      } else {
        errorMessage = error.message || 'Erreur inconnue';
      }
      
      results.push({ 
        contact: contact.name, 
        phone: contact.phone,
        status: 'failed', 
        error: errorMessage,
        errorCode: errorCode,
        failedAt: new Date().toISOString()
      });
      
      // Si erreur de session, arrêter l'envoi
      if (errorCode === 'SESSION_CLOSED') {
        break;
      }
    }
    
    // Délai entre les messages
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  res.json({ results });
});

app.post('/api/disconnect', (req, res) => {
  try {
    if (client) {
      client.destroy();
      isReady = false;
      qrCodeData = '';
      loadingProgress = 0;
      loadingMessage = '';
    }
    res.json({ success: true, message: 'Déconnecté avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

initWhatsApp();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Routes disponibles:');
  console.log('- GET /api/status');
  console.log('- POST /api/reconnect');
  console.log('- POST /api/disconnect');
  console.log('- POST /api/upload');
  console.log('- POST /api/upload-attachment');
  console.log('- POST /api/send-messages');
  console.log('- GET /api/template/:format');
});