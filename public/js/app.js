// Configuration Toastr
toastr.options = {
  "closeButton": true,
  "progressBar": true,
  "positionClass": "toast-top-right",
  "timeOut": "3000"
};

// Variables globales
let currentStep = 0;
let contacts = [];
let currentUser = null;
let attachmentFile = null;

// Navigation entre les étapes
const showStep = (step) => {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.add('hidden');
    page.classList.remove('active');
  });
  
  const targetPage = document.getElementById(`page-${getPageName(step)}`);
  if (targetPage) {
    targetPage.classList.remove('hidden');
    targetPage.classList.add('active');
  }
  
  updateStepper(step);
  currentStep = step;
};

const getPageName = (step) => {
  const pages = ['user-login', 'connection', 'import', 'message', 'send'];
  return pages[step] || 'user-login';
};

const updateStepper = (activeStep) => {
  for (let i = 1; i <= 4; i++) {
    const circle = document.getElementById(`step${i}-circle`);
    const text = document.getElementById(`step${i}-text`);
    const line = document.getElementById(`line${i}`);
    
    if (i <= activeStep) {
      circle.classList.remove('bg-gray-300', 'text-gray-600');
      circle.classList.add('bg-blue-500', 'text-white');
      text.classList.remove('text-gray-500');
      text.classList.add('text-blue-600');
      if (line) {
        line.classList.remove('bg-gray-300');
        line.classList.add('bg-blue-500');
      }
    } else {
      circle.classList.remove('bg-blue-500', 'text-white');
      circle.classList.add('bg-gray-300', 'text-gray-600');
      text.classList.remove('text-blue-600');
      text.classList.add('text-gray-500');
      if (line) {
        line.classList.remove('bg-blue-500');
        line.classList.add('bg-gray-300');
      }
    }
  }
};

const nextStep = () => {
  if (currentStep < 4) {
    // Si on quitte la page de connexion utilisateur, cacher le composant "Connecté"
    if (currentStep === 0) {
      const userInfoComponent = document.querySelector('#page-user-login .bg-white:last-child');
      if (userInfoComponent && userInfoComponent.innerHTML.includes('Connecté avec succès')) {
        userInfoComponent.style.display = 'none';
      }
    }
    
    showStep(currentStep + 1);
  }
};

const prevStep = () => {
  if (currentStep > 0) {
    showStep(currentStep - 1);
  }
};

// Fonction pour revenir au formulaire de connexion
const showLoginForm = () => {
  // Supprimer le composant des infos utilisateur
  const userInfoComponent = document.querySelector('#page-user-login .bg-white:last-child');
  if (userInfoComponent) {
    userInfoComponent.remove();
  }
  
  // Réafficher le composant de connexion original
  const loginComponent = document.querySelector('#page-user-login .bg-white');
  if (loginComponent) {
    loginComponent.style.display = 'block';
  }
  
  // Cacher le widget de statut
  hideUserStatusWidget();
  
  currentUser = null;
  toastr.info('Veuillez saisir votre code d\'accès');
};

// Connexion utilisateur
document.getElementById('user-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  const userCode = document.getElementById('user-code').value;
  
  // Afficher le loader
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Connexion...</div>';
  
  try {
    toastr.info('Vérification du code en cours...');
    
    const response = await fetch('/api/verify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCode })
    });
    
    const data = await response.json();
    
    if (data.valid) {
      currentUser = data.user;
      
      // Cacher tout le composant de connexion utilisateur
      const loginComponent = document.querySelector('#page-user-login .bg-white');
      if (loginComponent) {
        loginComponent.style.display = 'none';
      }
      
      // Créer et afficher le composant des informations utilisateur
      const userInfoComponent = document.createElement('div');
      userInfoComponent.className = 'bg-white rounded-lg shadow-md p-8 max-w-md mx-auto';
      userInfoComponent.innerHTML = `
        <div class="text-center mb-6">
          <div class="flex items-center justify-center mb-3">
            <svg class="w-8 h-8 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <h2 class="text-2xl font-bold text-green-800">Connecté avec succès !</h2>
          </div>
        </div>
        
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="text-sm text-green-700 space-y-2">
            <p><strong>Utilisateur:</strong> ${data.user.name}</p>
            <p><strong>Pack:</strong> ${data.user.pack}</p>
            <p><strong>Messages restants:</strong> <span class="font-bold text-green-800">${data.user.remainingMessages}</span></p>
          </div>
        </div>
        
        <div class="space-y-3">
          <button onclick="nextStep()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition">
            Continuer → Connexion WhatsApp
          </button>
          <button onclick="showLoginForm()" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm transition">
            Changer d'utilisateur
          </button>
        </div>
      `;
      
      document.getElementById('page-user-login').appendChild(userInfoComponent);
      
      toastr.success(`Bienvenue ${data.user.name} !`, 'Connexion réussie');
      
      // Afficher le widget de statut
      showUserStatusWidget(data.user);
    } else {
      toastr.error(data.message || 'Code utilisateur invalide', 'Erreur');
    }
  } catch (error) {
    toastr.error('Erreur de connexion. Veuillez réessayer.', 'Erreur');
  } finally {
    // Restaurer le bouton
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

// Initialisation WhatsApp
let statusInterval;

const checkWhatsAppStatus = async () => {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    
    // Mettre à jour la progression
    document.getElementById('loading-progress').textContent = data.loading.progress + '%';
    document.getElementById('loading-progress-bar').style.width = data.loading.progress + '%';
    document.getElementById('loading-message').textContent = data.loading.message;
    
    if (data.qrCode && !data.isReady) {
      // Afficher le QR code
      document.getElementById('loading-section').classList.add('hidden');
      document.getElementById('qr-section').classList.remove('hidden');
      document.getElementById('qr-code').innerHTML = `<img src="${data.qrCode}" alt="QR Code WhatsApp" class="mx-auto">`;
    } else if (data.isReady) {
      // WhatsApp connecté
      document.getElementById('loading-section').classList.add('hidden');
      document.getElementById('qr-section').classList.add('hidden');
      document.getElementById('connected-section').classList.remove('hidden');
      clearInterval(statusInterval);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
  }
};

// Démarrer la vérification du statut quand on arrive sur la page WhatsApp
const startWhatsAppCheck = () => {
  checkWhatsAppStatus();
  statusInterval = setInterval(checkWhatsAppStatus, 2000);
};

// Reconnexion WhatsApp
const forceReconnect = async () => {
  try {
    document.getElementById('connected-section').classList.add('hidden');
    document.getElementById('loading-section').classList.remove('hidden');
    
    await fetch('/api/reconnect', { method: 'POST' });
    startWhatsAppCheck();
  } catch (error) {
    toastr.error('Erreur lors de la reconnexion');
  }
};

// Déconnexion WhatsApp
const disconnect = async () => {
  try {
    await fetch('/api/disconnect', { method: 'POST' });
    document.getElementById('connected-section').classList.add('hidden');
    document.getElementById('loading-section').classList.remove('hidden');
    toastr.success('Déconnecté avec succès');
  } catch (error) {
    toastr.error('Erreur lors de la déconnexion');
  }
};

// Fonctions pour l'import des contacts
const downloadTemplate = (format) => {
  const link = document.createElement('a');
  link.href = `/api/template/${format}`;
  link.download = `template.${format}`;
  link.click();
  toastr.success(`Template ${format.toUpperCase()} téléchargé`);
};

const setupFileUpload = () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const dropContent = document.getElementById('drop-content');
  const fileSelected = document.getElementById('file-selected');
  const uploadBtn = document.getElementById('upload-btn');
  
  if (!dropZone || !fileInput) return;
  
  // Click sur la zone de drop
  dropZone.addEventListener('click', () => fileInput.click());
  
  // Drag & Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-green-400', 'bg-green-50');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-green-400', 'bg-green-50');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-green-400', 'bg-green-50');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  });
  
  // Sélection de fichier
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });
  
  // Upload du fichier
  if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadFile);
  }
};

const handleFileSelection = (file) => {
  const allowedTypes = ['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
  
  if (!allowedTypes.includes(file.type)) {
    toastr.error('Type de fichier non supporté');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    toastr.error('Fichier trop volumineux (max 10MB)');
    return;
  }
  
  document.getElementById('drop-content').classList.add('hidden');
  document.getElementById('file-selected').classList.remove('hidden');
  document.getElementById('selected-file-name').textContent = file.name;
  
  // Stocker le fichier pour l'upload
  window.selectedFile = file;
};

const uploadFile = async () => {
  if (!window.selectedFile) return;
  
  const formData = new FormData();
  formData.append('file', window.selectedFile);
  
  const uploadBtn = document.getElementById('upload-btn');
  const originalText = uploadBtn.textContent;
  
  try {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Import...</div>';
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.contacts) {
      contacts = data.contacts;
      showImportedContacts(data.contacts);
      toastr.success(`${data.contacts.length} contacts importés avec succès`);
    } else {
      toastr.error('Erreur lors de l\'import');
    }
  } catch (error) {
    toastr.error('Erreur lors de l\'upload');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = originalText;
  }
};

const showImportedContacts = (contactsList) => {
  document.getElementById('contact-count').textContent = contactsList.length;
  
  const contactsListEl = document.getElementById('contacts-list');
  contactsListEl.innerHTML = contactsList.map((contact, index) => `
    <div class="flex justify-between items-center py-2 px-3 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} rounded">
      <div>
        <span class="font-medium">${contact.name}</span>
        <span class="text-gray-500 ml-2">${contact.phone}</span>
      </div>
    </div>
  `).join('');
  
  document.getElementById('contacts-section').classList.remove('hidden');
};

const resetImport = () => {
  document.getElementById('drop-content').classList.remove('hidden');
  document.getElementById('file-selected').classList.add('hidden');
  document.getElementById('contacts-section').classList.add('hidden');
  document.getElementById('file-input').value = '';
  window.selectedFile = null;
  contacts = [];
};

// Fonctions pour la rédaction de message
const setupMessageCompose = () => {
  const messageInput = document.getElementById('message-input');
  const messagePreview = document.getElementById('message-preview');
  const continueBtn = document.getElementById('continue-to-send');
  const attachmentInput = document.getElementById('attachment-input');
  const attachmentZone = document.getElementById('attachment-drop-zone');
  
  if (messageInput && messagePreview) {
    messageInput.addEventListener('input', () => {
      const message = messageInput.value;
      const preview = message.replace(/{{name}}/g, '<span class="bg-yellow-200 px-1 rounded">John Doe</span>') || 'Tapez votre message pour voir l\'aperçu...';
      messagePreview.innerHTML = preview;
      
      if (continueBtn) {
        continueBtn.disabled = message.trim().length === 0;
      }
    });
  }
  
  if (attachmentZone && attachmentInput) {
    attachmentZone.addEventListener('click', () => attachmentInput.click());
    
    attachmentInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleAttachmentSelection(e.target.files[0]);
      }
    });
  }
};

const handleAttachmentSelection = (file) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const fileExt = file.name.split('.').pop().toLowerCase();
  
  if (!allowedTypes.test(fileExt)) {
    toastr.error('Type de fichier non supporté pour les pièces jointes');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    toastr.error('Fichier trop volumineux (max 10MB)');
    return;
  }
  
  document.getElementById('attachment-placeholder').classList.add('hidden');
  document.getElementById('attachment-preview').classList.remove('hidden');
  
  const previewContent = document.getElementById('preview-content');
  previewContent.innerHTML = `
    <div class="text-center">
      <div class="text-green-600 font-medium">${file.name}</div>
      <div class="text-sm text-gray-500">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
    </div>
  `;
  
  window.attachmentFile = file;
  toastr.success('Pièce jointe ajoutée');
};

const removeAttachment = () => {
  document.getElementById('attachment-placeholder').classList.remove('hidden');
  document.getElementById('attachment-preview').classList.add('hidden');
  document.getElementById('attachment-input').value = '';
  window.attachmentFile = null;
  toastr.info('Pièce jointe supprimée');
};

// Fonctions pour l'envoi de messages
const setupSendPage = () => {
  const totalContactsEl = document.getElementById('total-contacts');
  const messageLengthEl = document.getElementById('message-length');
  const estimatedTimeEl = document.getElementById('estimated-time');
  
  if (totalContactsEl) {
    totalContactsEl.textContent = contacts.length;
    // Animation du compteur
    animateCounter(totalContactsEl, 0, contacts.length, 1000);
  }
  
  const messageInput = document.getElementById('message-input');
  if (messageInput && messageLengthEl) {
    const messageLength = messageInput.value.length;
    messageLengthEl.textContent = messageLength;
    animateCounter(messageLengthEl, 0, messageLength, 800);
  }
  
  if (estimatedTimeEl) {
    const estimatedMinutes = Math.ceil(contacts.length * 3 / 60);
    estimatedTimeEl.textContent = estimatedMinutes;
    animateCounter(estimatedTimeEl, 0, estimatedMinutes, 1200);
  }
};

const animateCounter = (element, start, end, duration) => {
  const startTime = performance.now();
  
  const updateCounter = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.floor(start + (end - start) * progress);
    
    element.textContent = current;
    
    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    }
  };
  
  requestAnimationFrame(updateCounter);
};

const startSending = async () => {
  if (!currentUser) {
    toastr.error('Utilisateur non connecté');
    return;
  }
  
  if (contacts.length === 0) {
    toastr.error('Aucun contact à contacter');
    return;
  }
  
  const messageInput = document.getElementById('message-input');
  if (!messageInput || !messageInput.value.trim()) {
    toastr.error('Message vide');
    return;
  }
  
  // Vérifier la limite quotidienne
  if (contacts.length > currentUser.remainingMessages) {
    toastr.error(`Limite quotidienne dépassée. Vous pouvez envoyer ${currentUser.remainingMessages} messages aujourd'hui.`);
    return;
  }
  
  // Cacher les actions et afficher la progression
  document.querySelector('.bg-gradient-to-r.from-gray-50').style.display = 'none';
  document.getElementById('sending-progress').classList.remove('hidden');
  
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progressPercentage = document.getElementById('progress-percentage');
  
  try {
    toastr.info('Démarrage de l\'envoi en masse...');
    
    const response = await fetch('/api/send-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userCode: currentUser.code || 'TEST2024',
        contacts: contacts,
        message: messageInput.value,
        attachment: window.attachmentFile ? {
          filename: window.attachmentFile.name,
          path: window.attachmentFile.path,
          mimetype: window.attachmentFile.type
        } : null
      })
    });
    
    const data = await response.json();
    
    if (data.results) {
      // Simuler la progression (en réalité, cela devrait être en temps réel)
      for (let i = 0; i <= contacts.length; i++) {
        const percentage = Math.round((i / contacts.length) * 100);
        progressBar.style.width = percentage + '%';
        progressText.textContent = `${i}/${contacts.length}`;
        progressPercentage.textContent = percentage + '%';
        
        if (i < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulation
        }
      }
      
      showResults(data.results, data.userStats);
      
      // Afficher les statistiques utilisateur mises à jour
      if (data.userStats) {
        toastr.success(`Envoi terminé ! Messages restants: ${data.userStats.remainingMessages}/${data.userStats.dailyLimit}`, 'Succès');
        
        // Mettre à jour currentUser avec les nouvelles stats
        if (currentUser) {
          currentUser.remainingMessages = data.userStats.remainingMessages;
          currentUser.messagesUsedToday = data.userStats.messagesUsed;
          
          // Mettre à jour le widget de statut
          updateUserStatusWidget(data.userStats);
        }
      } else {
        toastr.success('Envoi terminé !');
      }
    } else {
      throw new Error(data.error || 'Erreur lors de l\'envoi');
    }
  } catch (error) {
    console.error('Erreur envoi:', error);
    toastr.error(error.message || 'Erreur lors de l\'envoi');
    
    // Réafficher les actions
    document.querySelector('.bg-gradient-to-r.from-gray-50').style.display = 'block';
    document.getElementById('sending-progress').classList.add('hidden');
  }
};

const showResults = (results, userStats = null) => {
  document.getElementById('sending-progress').classList.add('hidden');
  
  const successCount = results.filter(r => r.status === 'sent').length;
  const errorCount = results.filter(r => r.status === 'failed').length;
  
  document.getElementById('success-count').textContent = successCount;
  document.getElementById('error-count').textContent = errorCount;
  
  // Afficher les statistiques utilisateur si disponibles
  if (userStats) {
    const resultsSection = document.getElementById('results-section');
    const userStatsDiv = document.createElement('div');
    userStatsDiv.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6';
    userStatsDiv.innerHTML = `
      <h4 class="font-semibold text-blue-800 mb-2">📊 Vos statistiques mises à jour</h4>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">${userStats.messagesUsed}</div>
          <div class="text-blue-700">Messages utilisés aujourd'hui</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">${userStats.remainingMessages}</div>
          <div class="text-green-700">Messages restants</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-600">${userStats.dailyLimit}</div>
          <div class="text-gray-700">Limite quotidienne</div>
        </div>
      </div>
      <div class="mt-3 text-center text-xs text-blue-600">
        🔄 Votre quota se réinitialise chaque jour à 01h00
      </div>
    `;
    
    // Insérer avant la liste des résultats
    const resultsList = document.getElementById('results-list');
    resultsSection.insertBefore(userStatsDiv, resultsList);
  }
  
  const resultsList = document.getElementById('results-list');
  resultsList.innerHTML = results.map((result, index) => `
    <div class="flex justify-between items-center py-3 px-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-b">
      <div class="flex items-center">
        <div class="w-3 h-3 rounded-full mr-3 ${result.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}"></div>
        <div>
          <span class="font-medium">${result.contact}</span>
          <span class="text-gray-500 ml-2">${result.phone}</span>
        </div>
      </div>
      <div class="text-right">
        <span class="px-2 py-1 text-xs rounded-full ${
          result.status === 'sent' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }">
          ${result.status === 'sent' ? '✓ Envoyé' : '✗ Échec'}
        </span>
        ${result.error ? `<div class="text-xs text-red-600 mt-1">${result.error}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  document.getElementById('results-section').classList.remove('hidden');
  
  // Animer les compteurs de résultats
  animateCounter(document.getElementById('success-count'), 0, successCount, 1000);
  animateCounter(document.getElementById('error-count'), 0, errorCount, 1000);
};

// Fonctions pour le widget de statut utilisateur
const showUserStatusWidget = (user) => {
  const widget = document.getElementById('user-status-widget');
  if (!widget) return;
  
  document.getElementById('widget-user-name').textContent = user.name;
  document.getElementById('widget-remaining-messages').textContent = user.remainingMessages;
  document.getElementById('widget-daily-limit').textContent = user.dailyLimit;
  
  widget.classList.remove('hidden');
  
  // Animation d'apparition
  widget.style.transform = 'translateY(100px)';
  widget.style.opacity = '0';
  
  setTimeout(() => {
    widget.style.transition = 'all 0.3s ease-out';
    widget.style.transform = 'translateY(0)';
    widget.style.opacity = '1';
  }, 100);
};

const updateUserStatusWidget = (userStats) => {
  if (!userStats) return;
  
  const remainingEl = document.getElementById('widget-remaining-messages');
  const dailyLimitEl = document.getElementById('widget-daily-limit');
  
  if (remainingEl && dailyLimitEl) {
    remainingEl.textContent = userStats.remainingMessages;
    dailyLimitEl.textContent = userStats.dailyLimit;
    
    // Animation de mise à jour
    remainingEl.style.transform = 'scale(1.2)';
    remainingEl.style.color = '#10b981';
    
    setTimeout(() => {
      remainingEl.style.transform = 'scale(1)';
      remainingEl.style.color = '';
    }, 300);
  }
};

const hideUserStatusWidget = () => {
  const widget = document.getElementById('user-status-widget');
  if (widget) {
    widget.style.transition = 'all 0.3s ease-in';
    widget.style.transform = 'translateY(100px)';
    widget.style.opacity = '0';
    
    setTimeout(() => {
      widget.classList.add('hidden');
    }, 300);
  }
};

const resetApp = () => {
  contacts = [];
  currentUser = null;
  window.attachmentFile = null;
  
  // Réinitialiser tous les éléments
  document.getElementById('sending-progress').classList.add('hidden');
  document.getElementById('results-section').classList.add('hidden');
  
  const actionsDiv = document.querySelector('.bg-gradient-to-r.from-gray-50');
  if (actionsDiv) actionsDiv.style.display = 'block';
  
  // Cacher le widget de statut
  hideUserStatusWidget();
  
  showStep(0);
  showLoginForm();
  toastr.info('Application réinitialisée');
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  // S'assurer que la première page est visible
  const firstPage = document.getElementById('page-user-login');
  if (firstPage) {
    firstPage.classList.remove('hidden');
    firstPage.classList.add('active');
  }
  
  showStep(0);
  
  // Setup des composants
  setupFileUpload();
  setupMessageCompose();
  
  // Observer pour démarrer WhatsApp quand on arrive sur la page
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.id === 'page-connection' && !target.classList.contains('hidden')) {
          startWhatsAppCheck();
        } else if (target.id === 'page-send' && !target.classList.contains('hidden')) {
          setupSendPage();
        }
      }
    });
  });
  
  const connectionPage = document.getElementById('page-connection');
  if (connectionPage) {
    observer.observe(connectionPage, { attributes: true });
  }
  
  const sendPage = document.getElementById('page-send');
  if (sendPage) {
    observer.observe(sendPage, { attributes: true });
  }
});