let contacts = [];
let isConnected = false;
let syncToast = null;
let lastConnectionCheck = 0;
let currentProgress = 0;
let currentStep = 1;
let sendingInProgress = false;
let attachmentFile = null;

// Configuration Toastr
toastr.options = {
  "closeButton": true,
  "progressBar": true,
  "positionClass": "toast-top-right",
  "timeOut": "3000"
};

// Gestion du localStorage
const saveConnectionState = (state) => {
  localStorage.setItem('whatsapp_connection', JSON.stringify({
    isConnected: state,
    timestamp: Date.now()
  }));
};

const getConnectionState = () => {
  const saved = localStorage.getItem('whatsapp_connection');
  if (saved) {
    const data = JSON.parse(saved);
    // Vérifier si la connexion sauvegardée n'est pas trop ancienne (24h)
    if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
      return data.isConnected;
    }
  }
  return false;
};

const saveContacts = (contactsList) => {
  localStorage.setItem('whatsapp_contacts', JSON.stringify(contactsList));
};

const getContacts = () => {
  const saved = localStorage.getItem('whatsapp_contacts');
  return saved ? JSON.parse(saved) : [];
};

const saveMessage = (message) => {
  localStorage.setItem('whatsapp_message', message);
};

const getMessage = () => {
  return localStorage.getItem('whatsapp_message') || '';
};

// Fonction de synchronisation avec progression
const startSync = () => {
  if (syncToast) {
    toastr.clear(syncToast);
  }
  currentProgress = 0;
  
  syncToast = toastr.info(createProgressHTML(0, 'Initialisation de WhatsApp...'), 'Synchronisation', {
    timeOut: 0,
    extendedTimeOut: 0,
    closeButton: false,
    progressBar: false,
    escapeHtml: false,
    positionClass: 'toast-top-center'
  });
  
  console.log('Loader de synchronisation démarré');
};

const updateProgress = (progress, message) => {
  if (syncToast && progress !== currentProgress) {
    currentProgress = progress;
    const progressHTML = createProgressHTML(progress, message);
    $(syncToast).find('.toast-message').html(progressHTML);
  }
};

const createProgressHTML = (progress, message) => {
  const safeProgress = Math.max(0, Math.min(100, progress || 0));
  const safeMessage = message || 'Synchronisation en cours...';
  
  return `
    <div class="sync-progress" style="min-width: 300px; padding: 10px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #e3f2fd; border-top: 3px solid #2196f3; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="font-weight: 600; color: #1976d2; font-size: 16px;">Connexion WhatsApp</span>
        </div>
        <span style="font-weight: 700; color: #1976d2; font-size: 16px;">${safeProgress}%</span>
      </div>
      <div style="background: #e3f2fd; border-radius: 15px; height: 12px; margin-bottom: 10px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(90deg, #2196f3, #1976d2); height: 100%; border-radius: 15px; width: ${safeProgress}%; transition: width 0.6s ease; box-shadow: 0 2px 8px rgba(33, 150, 243, 0.4);"></div>
      </div>
      <div style="font-size: 14px; color: #555; text-align: center; font-weight: 500; line-height: 1.4;">${safeMessage}</div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .sync-progress {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    </style>
  `;
};

const stopSync = (success = true) => {
  if (syncToast) {
    if (success) {
      updateProgress(100, 'Connexion établie avec succès !');
      setTimeout(() => {
        toastr.clear(syncToast);
        syncToast = null;
      }, 1500);
    } else {
      toastr.clear(syncToast);
      syncToast = null;
    }
  }
};

// Éléments DOM
const qrSection = document.getElementById('qr-section');
const connectedSection = document.getElementById('connected-section');
const contactsSection = document.getElementById('contacts-section');
const resultsSection = document.getElementById('results-section');

const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Gestion des pages et du stepper
const updateStepper = (step) => {
  for (let i = 1; i <= 4; i++) {
    const circle = document.getElementById(`step${i}-circle`);
    const text = document.getElementById(`step${i}-text`);
    const line = document.getElementById(`line${i}`);
    
    if (i < step) {
      // Étape complétée
      circle.className = 'w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold';
      circle.innerHTML = '✓';
      text.className = 'ml-2 font-medium text-green-600';
      if (line) line.className = 'w-16 h-1 bg-green-500';
    } else if (i === step) {
      // Étape actuelle
      circle.className = 'w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold';
      circle.innerHTML = i;
      text.className = 'ml-2 font-medium text-blue-600';
      if (line) line.className = 'w-16 h-1 bg-gray-300';
    } else {
      // Étape future
      circle.className = 'w-10 h-10 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold';
      circle.innerHTML = i;
      text.className = 'ml-2 font-medium text-gray-500';
      if (line) line.className = 'w-16 h-1 bg-gray-300';
    }
  }
};

const showPage = (pageNumber) => {
  // Cacher toutes les pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Afficher la page demandée
  const targetPage = document.getElementById(`page-${getPageName(pageNumber)}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  currentStep = pageNumber;
  updateStepper(pageNumber);
};

const getPageName = (step) => {
  const pages = ['connection', 'import', 'message', 'send'];
  return pages[step - 1];
};

const nextStep = () => {
  if (currentStep < 4) {
    // Vérifications avant de passer à l'étape suivante
    if (currentStep === 2 && (!contacts || contacts.length === 0)) {
      toastr.warning('Veuillez d\'abord importer des contacts');
      return;
    }
    
    if (currentStep === 3 && !messageInput.value.trim()) {
      toastr.warning('Veuillez saisir un message');
      return;
    }
    
    showPage(currentStep + 1);
    
    // Actions spécifiques selon l'étape
    if (currentStep === 4) {
      updateSendSummary();
    }
  }
};

const prevStep = () => {
  if (currentStep > 1) {
    showPage(currentStep - 1);
  }
};

const resetApp = () => {
  contacts = [];
  if (messageInput) messageInput.value = '';
  sendingInProgress = false;
  attachmentFile = null;
  if (typeof removeAttachment === 'function') removeAttachment();
  saveContacts([]);
  saveMessage('');
  
  // Réinitialiser l'affichage
  const contactsSection = document.getElementById('contacts-section');
  if (contactsSection) contactsSection.classList.add('hidden');
  
  const resultsSection = document.getElementById('results-section');
  if (resultsSection) resultsSection.classList.add('hidden');
  
  showPage(2); // Retour à l'import
  toastr.info('Application réinitialisée');
};

// Mise à jour du résumé d'envoi
const updateSendSummary = () => {
  console.log('Mise à jour résumé avec contacts:', contacts);
  const totalContacts = contacts ? contacts.length : 0;
  const messageLength = messageInput ? messageInput.value.length : 0;
  
  document.getElementById('total-contacts').textContent = totalContacts;
  document.getElementById('message-length').textContent = messageLength;
  document.getElementById('estimated-time').textContent = Math.ceil(totalContacts * 3 / 60); // 3s par message
  
  // Désactiver le bouton si pas de contacts
  const sendButton = document.getElementById('send-btn');
  if (totalContacts === 0) {
    sendButton.disabled = true;
    sendButton.className = 'bg-gray-400 text-white font-bold py-4 px-8 rounded-lg text-lg cursor-not-allowed';
    sendButton.textContent = 'Aucun contact disponible';
  } else {
    sendButton.disabled = false;
    sendButton.className = 'bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-lg text-lg';
    sendButton.textContent = '🚀 Lancer l\'envoi';
  }
};

// Aperçu du message en temps réel
const updateMessagePreview = () => {
  const message = messageInput.value || 'Tapez votre message pour voir l\'aperçu...';
  const preview = message.replace('{{name}}', 'John Doe');
  document.getElementById('message-preview').textContent = preview;
  
  // Activer/désactiver le bouton continuer
  const continueBtn = document.getElementById('continue-to-send');
  continueBtn.disabled = !messageInput.value.trim();
  continueBtn.className = messageInput.value.trim() 
    ? 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold'
    : 'bg-gray-400 text-white px-6 py-3 rounded font-semibold cursor-not-allowed';
};

// Fonction pour télécharger les templates
const downloadTemplate = (format) => {
  const link = document.createElement('a');
  link.href = `/api/template/${format}`;
  link.download = `template.${format === 'excel' ? 'xlsx' : format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toastr.success(`Template ${format.toUpperCase()} téléchargé !`);
};

// Fonction pour forcer la reconnexion
const forceReconnect = async () => {
  try {
    console.log('Tentative de reconnexion...');
    startSync();
    
    const response = await fetch('/api/reconnect', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Réponse reconnect:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Données reçues:', data);
    
    toastr.info(data.message || 'Reconnexion en cours...');
    
  } catch (error) {
    console.error('Erreur lors de la reconnexion:', error);
    stopSync(false);
    toastr.error(`Erreur lors de la reconnexion: ${error.message}`);
  }
};

// Fonction de déconnexion
const disconnect = async () => {
  try {
    const response = await fetch('/api/disconnect', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      isConnected = false;
      saveConnectionState(false);
      connectedSection.classList.add('hidden');
      qrSection.classList.add('hidden');
      showPage(1);
      toastr.success('Déconnecté avec succès');
    }
  } catch (error) {
    toastr.error('Erreur lors de la déconnexion');
  }
};

// Gestion des pièces jointes
const attachmentInput = document.getElementById('attachment-input');
const attachmentDropZone = document.getElementById('attachment-drop-zone');
const attachmentPlaceholder = document.getElementById('attachment-placeholder');
const attachmentPreview = document.getElementById('attachment-preview');

attachmentDropZone.addEventListener('click', () => {
  attachmentInput.click();
});

attachmentInput.addEventListener('change', handleAttachment);

function handleAttachment(event) {
  const file = event.target.files[0];
  if (file) {
    uploadAttachment(file);
  }
}

function uploadAttachment(file) {
  const formData = new FormData();
  formData.append('attachment', file);
  
  toastr.info('Upload du fichier en cours...');
  
  fetch('/api/upload-attachment', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      attachmentFile = data.file;
      showAttachmentPreview(file, data.file);
      toastr.success('Fichier uploadé avec succès');
    } else {
      toastr.error(data.error || 'Erreur lors de l\'upload');
    }
  })
  .catch(error => {
    toastr.error('Erreur lors de l\'upload du fichier');
    console.error(error);
  });
}

function showAttachmentPreview(file, fileInfo) {
  const previewContent = document.getElementById('preview-content');
  
  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.className = 'max-w-32 max-h-32 mx-auto rounded';
    previewContent.innerHTML = '';
    previewContent.appendChild(img);
  } else {
    previewContent.innerHTML = `
      <div class="text-center">
        <div class="text-4xl mb-2">📄</div>
        <div class="text-sm font-medium">${file.name}</div>
        <div class="text-xs text-gray-500">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
      </div>
    `;
  }
  
  attachmentPlaceholder.classList.add('hidden');
  attachmentPreview.classList.remove('hidden');
}

function removeAttachment() {
  attachmentFile = null;
  attachmentInput.value = '';
  attachmentPlaceholder.classList.remove('hidden');
  attachmentPreview.classList.add('hidden');
  toastr.info('Pièce jointe supprimée');
}

// Restaurer les données sauvegardées
const restoreData = () => {
  // Restaurer les contacts
  const savedContacts = getContacts();
  if (savedContacts.length > 0) {
    contacts = savedContacts;
    displayContacts();
    contactsSection.classList.remove('hidden');
  }
  
  // Restaurer le message
  const savedMessage = getMessage();
  if (savedMessage) {
    messageInput.value = savedMessage;
  }
  
  // Déterminer la page à afficher selon l'état
  const wasConnected = getConnectionState();
  
  console.log('Restauration - wasConnected:', wasConnected, 'isConnected:', isConnected, 'contacts:', contacts.length);
  
  if (wasConnected && !isConnected) {
    console.log('Démarrage de la synchronisation automatique...');
    startSync();
    showPage(1);
    // Afficher l'état de chargement
    document.getElementById('loading-section').classList.remove('hidden');
  } else if (isConnected) {
    if (contacts.length > 0) {
      if (savedMessage) {
        showPage(4);
      } else {
        showPage(3);
      }
    } else {
      showPage(2);
    }
  } else {
    showPage(1);
    // Afficher l'état de chargement par défaut
    document.getElementById('loading-section').classList.remove('hidden');
  }
};

// Vérifier le statut de connexion
const checkStatus = async () => {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    
    // Mettre à jour la progression si en cours de synchronisation
    if (syncToast && data.loading) {
      const progress = data.loading.progress || 0;
      const message = data.loading.message || 'Synchronisation en cours...';
      
      if (progress > 0 || message !== '') {
        updateProgress(progress, message);
      }
    }
    
    // Mettre à jour l'affichage de chargement dans la section loading
    const loadingSection = document.getElementById('loading-section');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingProgressBar = document.getElementById('loading-progress-bar');
    const loadingMessage = document.getElementById('loading-message');
    
    if (data.loading && !data.isReady && !data.qrCode) {
      const progress = Math.max(0, Math.min(100, data.loading.progress || 0));
      const message = data.loading.message || 'Initialisation...';
      
      if (loadingProgress) {
        loadingProgress.textContent = `${progress}%`;
      }
      if (loadingProgressBar) {
        loadingProgressBar.style.width = `${progress}%`;
      }
      if (loadingMessage) {
        loadingMessage.textContent = message;
      }
    }
    
    if (data.isReady && !isConnected) {
      isConnected = true;
      stopSync(true);
      // Afficher 100% avant de cacher
      if (loadingProgress) loadingProgress.textContent = '100%';
      if (loadingProgressBar) loadingProgressBar.style.width = '100%';
      if (loadingMessage) loadingMessage.textContent = 'Connexion établie !';
      
      setTimeout(() => {
        loadingSection.classList.add('hidden');
        qrSection.classList.add('hidden');
        connectedSection.classList.remove('hidden');
        saveConnectionState(true);
        toastr.success('WhatsApp connecté avec succès !');
      }, 1000);
    } else if (data.qrCode && !isConnected) {
      stopSync(false);
      loadingSection.classList.add('hidden');
      qrSection.classList.remove('hidden');
      connectedSection.classList.add('hidden');
      document.getElementById('qr-code').innerHTML = `<img src="${data.qrCode}" alt="QR Code" class="mx-auto rounded-lg shadow-lg">`;
      saveConnectionState(false);
    } else if (!data.isReady && !data.qrCode && !isConnected) {
      // État de chargement initial
      loadingSection.classList.remove('hidden');
      qrSection.classList.add('hidden');
      connectedSection.classList.add('hidden');
    } else if (!data.isReady && !data.qrCode && isConnected) {
      // Connexion perdue
      isConnected = false;
      saveConnectionState(false);
      loadingSection.classList.add('hidden');
      connectedSection.classList.add('hidden');
      qrSection.classList.add('hidden');
      toastr.error('Session WhatsApp fermée. Veuillez vous reconnecter.', 'Connexion perdue', {
        timeOut: 0,
        closeButton: true
      });
      showPage(1);
    }
    
    lastConnectionCheck = Date.now();
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    if (Date.now() - lastConnectionCheck > 10000) { // Si pas de réponse depuis 10s
      toastr.error('Erreur de connexion au serveur');
    }
  }
};

// Gestion de la zone de drop
const dropZone = document.getElementById('drop-zone');
const dropContent = document.getElementById('drop-content');
const fileSelected = document.getElementById('file-selected');
const selectedFileName = document.getElementById('selected-file-name');

// Gestion du drag & drop
dropZone.addEventListener('click', () => {
  fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('border-green-400', 'bg-green-50');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-green-400', 'bg-green-50');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-green-400', 'bg-green-50');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    showFileSelected(files[0]);
  }
});

// Gestion de la sélection de fichier
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    showFileSelected(e.target.files[0]);
  }
});

// Afficher le fichier sélectionné
const showFileSelected = (file) => {
  selectedFileName.textContent = file.name;
  dropContent.classList.add('hidden');
  fileSelected.classList.remove('hidden');
};

// Réinitialiser l'import
const resetImport = () => {
  fileInput.value = '';
  dropContent.classList.remove('hidden');
  fileSelected.classList.add('hidden');
  document.getElementById('drop-zone').classList.remove('hidden');
  contactsSection.classList.add('hidden');
  contacts = [];
  saveContacts([]);
};

// Importer le fichier
uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    toastr.warning('Veuillez sélectionner un fichier');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    uploadBtn.innerHTML = '<svg class="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Import en cours...';
    uploadBtn.disabled = true;
    toastr.info('Import du fichier en cours...');
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    contacts = data.contacts;
    
    // Cacher la zone de drop et afficher les résultats
    document.getElementById('drop-zone').classList.add('hidden');
    displayContacts();
    contactsSection.classList.remove('hidden');
    saveContacts(contacts);
    console.log('Contacts importés et sauvegardés:', contacts);
    toastr.success(`${contacts.length} contacts importés avec succès !`);
    
  } catch (error) {
    toastr.error('Erreur lors de l\'import du fichier');
    console.error(error);
  } finally {
    uploadBtn.innerHTML = '📤 Importer les contacts';
    uploadBtn.disabled = false;
  }
});

// Afficher les contacts
const displayContacts = () => {
  const contactsList = document.getElementById('contacts-list');
  const contactCount = document.getElementById('contact-count');
  
  if (!contacts || contacts.length === 0) {
    contactCount.textContent = '0';
    contactsList.innerHTML = '<div class="text-center text-gray-500 py-4">Aucun contact importé</div>';
    return;
  }
  
  contactCount.textContent = contacts.length;
  
  contactsList.innerHTML = contacts.map((contact, index) => 
    `<div class="flex justify-between items-center py-3 px-4 bg-white rounded-lg mb-2 border">
      <div class="flex items-center gap-3">
        <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">${index + 1}</span>
        <span class="font-medium">${contact.name || 'Nom manquant'}</span>
      </div>
      <span class="text-gray-600 font-mono text-sm">${contact.phone || 'Téléphone manquant'}</span>
    </div>`
  ).join('');
  
  console.log('Contacts affichés:', contacts.length);
};

// Envoyer les messages
sendBtn.addEventListener('click', async () => {
  const message = messageInput.value.trim();
  
  if (!message) {
    toastr.warning('Veuillez saisir un message');
    return;
  }
  
  console.log('Contacts disponibles:', contacts);
  
  if (!contacts || contacts.length === 0) {
    toastr.warning('Aucun contact importé. Retournez à l\'étape d\'import.');
    return;
  }

  if (sendingInProgress) {
    toastr.warning('Envoi déjà en cours...');
    return;
  }

  try {
    sendingInProgress = true;
    sendBtn.textContent = 'Envoi en cours...';
    sendBtn.disabled = true;
    
    // Afficher la progression
    document.getElementById('sending-progress').classList.remove('hidden');
    
    toastr.info(`Démarrage de l'envoi à ${contacts.length} contacts...`);
    
    const response = await fetch('/api/send-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        contacts, 
        message,
        attachment: attachmentFile 
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 400 && errorData.error.includes('connecté')) {
        // Session fermée, rediriger vers la connexion
        isConnected = false;
        saveConnectionState(false);
        showPage(1);
        toastr.error('Session WhatsApp expirée. Reconnectez-vous.', 'Session expirée');
        return;
      }
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    displayResults(data.results);
    
    const sent = data.results.filter(r => r.status === 'sent').length;
    const failed = data.results.filter(r => r.status === 'failed').length;
    
    // Mettre à jour les statistiques
    document.getElementById('success-count').textContent = sent;
    document.getElementById('error-count').textContent = failed;
    
    if (failed === 0) {
      toastr.success(`Tous les messages ont été envoyés ! (${sent}/${contacts.length})`);
    } else {
      toastr.warning(`Envoi terminé: ${sent} succès, ${failed} échecs`);
    }
    
  } catch (error) {
    toastr.error(`Erreur: ${error.message}`);
    console.error('Erreur détaillée:', error);
  } finally {
    sendingInProgress = false;
    sendBtn.textContent = '🚀 Lancer l\'envoi';
    sendBtn.disabled = false;
    document.getElementById('sending-progress').classList.add('hidden');
  }
});

// Afficher les résultats avec détails d'erreurs
const displayResults = (results) => {
  const resultsList = document.getElementById('results-list');
  
  resultsList.innerHTML = results.map((result, index) => 
    `<div class="rounded-lg mb-3 border ${
      result.status === 'sent' 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }">
      <div class="flex justify-between items-center py-3 px-4">
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold px-2 py-1 rounded ${
            result.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }">${index + 1}</span>
          <div>
            <div class="font-medium ${
              result.status === 'sent' ? 'text-green-800' : 'text-red-800'
            }">${result.contact}</div>
            <div class="text-xs text-gray-600">${result.phone}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-medium ${
            result.status === 'sent' ? 'text-green-800' : 'text-red-800'
          }">${result.status === 'sent' ? '✅ Envoyé' : '❌ Échec'}</span>
          ${result.error ? `<button onclick="showErrorDetails('${encodeURIComponent(result.contact)}', '${encodeURIComponent(result.error)}', '${result.errorCode || 'UNKNOWN'}')" class="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-red-800">⚠️ Détails</button>` : ''}
        </div>
      </div>
      ${result.error ? `
        <div class="px-4 pb-3 border-t border-red-200">
          <div class="text-xs text-red-700 mt-2">
            <strong>Erreur:</strong> ${result.error}<br>
            <strong>Code:</strong> ${result.errorCode || 'UNKNOWN'}<br>
            <strong>Heure:</strong> ${result.failedAt ? new Date(result.failedAt).toLocaleTimeString() : 'N/A'}
          </div>
        </div>
      ` : ''}
    </div>`
  ).join('');
  
  resultsSection.classList.remove('hidden');
};

// Afficher les détails d'erreur
function showErrorDetails(encodedContact, encodedError, errorCode) {
  const contact = decodeURIComponent(encodedContact);
  const error = decodeURIComponent(encodedError);
  
  const errorMessages = {
    'INVALID_NUMBER': 'Le numéro de téléphone n\'est pas valide ou n\'existe pas sur WhatsApp.',
    'NOT_REGISTERED': 'Ce numéro n\'est pas enregistré sur WhatsApp.',
    'BLOCKED': 'Ce numéro vous a bloqué ou a bloqué votre compte.',
    'RATE_LIMIT': 'Vous envoyez trop de messages. Attendez quelques minutes avant de réessayer.',
    'NETWORK_ERROR': 'Problème de connexion réseau. Vérifiez votre connexion internet.',
    'NUMBER_CHECK_FAILED': 'Impossible de vérifier si le numéro existe sur WhatsApp.',
    'INVALID_FORMAT': 'Le format du numéro de téléphone n\'est pas correct.',
    'MEDIA_ERROR': 'Erreur lors de l\'envoi du fichier joint. Le fichier est peut-être trop volumineux ou corrompu.',
    'SESSION_CLOSED': 'La session WhatsApp s\'est fermée de manière inattendue. Cela peut arriver si WhatsApp Web se déconnecte ou si l\'application mobile ferme la session. Reconnectez-vous en scannant le QR code.',
    'TECHNICAL_ERROR': 'Erreur technique lors de la vérification du numéro. Cela peut indiquer un numéro invalide ou un problème temporaire avec WhatsApp. Vérifiez le format du numéro (+33XXXXXXXXX) et réessayez.',
    'SESSION_DESTROYED': 'La session WhatsApp a été détruite de manière inattendue. Cela peut arriver si WhatsApp Web se ferme ou si il y a un problème de connexion. Reconnectez-vous complètement en actualisant la page.',
    'UNKNOWN_ERROR': 'Erreur inconnue. Contactez le support si le problème persiste.'
  };
  
  const detailedError = errorMessages[errorCode] || error;
  
  toastr.error(`<strong>${contact}</strong><br><br><strong>Erreur:</strong> ${detailedError}<br><strong>Code:</strong> ${errorCode}`, 'Détails de l\'erreur', {
    timeOut: 15000,
    escapeHtml: false,
    closeButton: true
  });
}

// Sauvegarder le message en temps réel et mettre à jour l'aperçu
messageInput.addEventListener('input', () => {
  saveMessage(messageInput.value);
  updateMessagePreview();
});

// Initialisation
restoreData();

// Ne pas forcer la page 1 si on a des données restaurées
if (!getConnectionState() && (!contacts || contacts.length === 0)) {
  showPage(1); // Commencer par la page de connexion seulement si rien n'est restauré
}

updateMessagePreview();

// Vérifier le statut toutes les 2 secondes
setInterval(checkStatus, 2000);
checkStatus();