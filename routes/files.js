const express = require('express');
const multer = require('multer');
const path = require('path');
const fileService = require('../services/fileService');

const router = express.Router();

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (req.route.path === '/upload') {
      const allowedTypes = /csv|json|xlsx|xls/;
      const allowedMimes = /text\/csv|application\/json|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedMimes.test(file.mimetype);
      
      if (mimetype || extname) {
        return cb(null, true);
      }
    } else {
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

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const contacts = await fileService.parseContacts(req.file);
    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload-attachment', upload.single('attachment'), (req, res) => {
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

router.get('/template/:format', (req, res) => {
  try {
    const template = fileService.generateTemplate(req.params.format);
    
    res.setHeader('Content-Type', template.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    res.send(template.data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;