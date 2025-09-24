const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/database');
const whatsappService = require('./services/whatsappService');
const CronService = require('./services/cronService');
const { initDefaultPacks } = require('./utils/initData');

// Routes
const whatsappRoutes = require('./routes/whatsapp');
const fileRoutes = require('./routes/files');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

// Connexion à MongoDB
connectDB();

const app = express();

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static('public'));
app.use(express.json());
app.use(session({
  secret: 'whatsapp-bulk-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Middleware pour capturer l'IP
app.use((req, res, next) => {
  req.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';
  next();
});

// Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes des vues
app.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'Accueil',
    bodyClass: 'bg-gray-100 min-h-screen',
    additionalJS: ['/js/app.js']
  });
});

app.get('/packs', (req, res) => {
  res.render('pages/packs', {
    title: 'Packs',
    bodyClass: 'bg-gray-50',
    additionalJS: ['/js/packs.js']
  });
});

app.get('/admin', (req, res) => {
  res.render('pages/admin', {
    title: 'Administration',
    bodyClass: '',
    additionalJS: ['/js/admin.js']
  });
});

// Routes API
app.use('/api', whatsappRoutes);
app.use('/api', fileRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);

// Initialisation
const init = async () => {
  await initDefaultPacks();
  await whatsappService.initialize();
  CronService.init();
};

init();

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
  console.log('- GET /admin (admin: admin/admin123)');
  console.log('- GET /packs (page publique des packs)');
});