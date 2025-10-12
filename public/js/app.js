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
    
    const nextStepNumber = currentStep + 1;
    showStep(nextStepNumber);
    
    // Si on arrive sur la page de connexion WhatsApp (step 1), démarrer WhatsApp
    if (nextStepNumber === 1) {
      console.log('🚀 Arrivée sur page connection, démarrage WhatsApp...');
      setTimeout(() => {
        startWhatsAppCheck();
      }, 500); // Petit délai pour que la page soit bien affichée
    }
    
    // Si on arrive sur la page d'import (step 2), setup file upload
    if (nextStepNumber === 2) {
      console.log('📁 Arrivée sur page import, setup file upload...');
      setTimeout(() => {
        setupFileUpload();
      }, 300);
    }
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
  const userInfoComponent = document.querySelector('#page-user-login .user-connected-info');
  if (userInfoComponent) {
    userInfoComponent.remove();
  }
  
  // Réafficher le composant de connexion original
  const loginComponent = document.querySelector('#page-user-login .bg-white');
  if (loginComponent) {
    loginComponent.style.display = 'block';
  }
  
  // S'assurer que la page de connexion est visible
  const userLoginPage = document.getElementById('page-user-login');
  if (userLoginPage) {
    userLoginPage.classList.remove('hidden');
    userLoginPage.classList.add('active');
  }
  
  // Cacher le widget de statut
  hideUserStatusWidget();
  
  currentUser = null;
  localStorage.removeItem('currentUser');
  toastr.info('Veuillez saisir votre code d\'accès');
};

// Fonction pour valider la session utilisateur
const validateUserSession = async () => {
  if (!currentUser || !currentUser.code) return false;
  
  try {
    const response = await fetch('/api/verify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCode: currentUser.code })
    });
    const data = await response.json();
    return data.valid;
  } catch (error) {
    console.error('Erreur lors de la validation de session:', error);
    return false;
  }
};

// Fonction pour actualiser les stats utilisateur
const refreshUserStats = async () => {
  if (!currentUser || !currentUser.code) return;
  
  try {
    const response = await fetch('/api/verify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCode: currentUser.code })
    });
    const data = await response.json();
    
    if (data.valid) {
      console.log('Stats actualisées:', data.user);
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateUserStatusWidget({
        messagesUsed: currentUser.messagesUsedToday,
        remainingMessages: currentUser.remainingMessages,
        dailyLimit: currentUser.dailyLimit
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'actualisation des stats:', error);
  }
};

// Fonction pour afficher l'interface utilisateur connecté
const showUserConnectedInterface = (user) => {
  // Vérifier si le composant existe déjà
  let userInfoComponent = document.querySelector('#page-user-login .user-connected-info');
  
  if (userInfoComponent) {
    // Mettre à jour le composant existant
    const remainingEl = userInfoComponent.querySelector('.remaining-messages');
    if (remainingEl) {
      remainingEl.textContent = user.remainingMessages;
    }
    return;
  }
  
  // Cacher le formulaire de connexion
  const loginComponent = document.querySelector('#page-user-login .bg-white');
  if (loginComponent) {
    loginComponent.style.display = 'none';
  }
  
  // Créer le composant des informations utilisateur
  userInfoComponent = document.createElement('div');
  userInfoComponent.className = 'bg-white rounded-lg shadow-md p-8 max-w-md mx-auto user-connected-info';
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
        <p><strong>Utilisateur:</strong> ${user.name}</p>
        <p><strong>Pack:</strong> ${user.pack}</p>
        <p><strong>Messages restants:</strong> <span class="font-bold text-green-800 remaining-messages">${user.remainingMessages}</span></p>
      </div>
    </div>
    
    <div class="space-y-3">
      <button onclick="nextStep()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition">
        Continuer → Connexion WhatsApp
      </button>
      <button onclick="logoutUser()" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg text-sm transition">
        Se déconnecter
      </button>
    </div>
  `;
  
  document.getElementById('page-user-login').appendChild(userInfoComponent);
  
  // S'assurer que la page est visible
  const userLoginPage = document.getElementById('page-user-login');
  if (userLoginPage) {
    userLoginPage.classList.remove('hidden');
    userLoginPage.classList.add('active');
  }
};

// Fonction pour mettre à jour les informations utilisateur dans l'interface
const updateUserInfo = (user) => {
  console.log('Mise à jour des infos utilisateur:', user);
  
  // Vérifier si l'utilisateur est déjà connecté pour éviter la duplication
  const existingComponent = document.querySelector('#page-user-login .user-connected-info');
  if (existingComponent) {
    // Juste mettre à jour les données
    const remainingEl = existingComponent.querySelector('.remaining-messages');
    if (remainingEl) {
      remainingEl.textContent = user.remainingMessages;
    }
    showUserStatusWidget(user);
    return;
  }
  
  // Sinon, afficher l'interface complète
  showUserConnectedInterface(user);
  showUserStatusWidget(user);
};

// Fonction pour déconnecter l'utilisateur
const logoutUser = async () => {
  // Déconnecter la session WhatsApp si l'utilisateur est connecté
  if (currentUser && currentUser.code) {
    try {
      console.log(`🔌 Déconnexion session WhatsApp pour ${currentUser.code}`);
      
      const response = await fetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCode: currentUser.code })
      });
      
      if (response.ok) {
        console.log(`✅ Session WhatsApp déconnectée pour ${currentUser.code}`);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion WhatsApp:', error);
    }
  }
  
  // Arrêter l'intervalle de vérification du statut
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  
  currentUser = null;
  localStorage.removeItem('currentUser');
  hideUserStatusWidget();
  
  // Supprimer le composant des infos utilisateur
  const userInfoComponent = document.querySelector('#page-user-login .user-connected-info');
  if (userInfoComponent) {
    userInfoComponent.remove();
  }
  
  // Réafficher le formulaire de connexion
  const loginComponent = document.querySelector('#page-user-login .bg-white');
  if (loginComponent) {
    loginComponent.style.display = 'block';
  }
  
  // Réinitialiser le formulaire
  const userCodeInput = document.getElementById('user-code');
  if (userCodeInput) {
    userCodeInput.value = '';
  }
  
  // Revenir à la page de connexion
  showStep(0);
  toastr.info('Déconnecté avec succès');
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
      
      // Sauvegarder dans localStorage pour persistance
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      toastr.success(`Bienvenue ${data.user.name} !`, 'Connexion réussie');
      
      // Mettre à jour les informations utilisateur
      updateUserInfo(data.user);
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
  if (!currentUser || !currentUser.code) {
    console.error('❌ checkWhatsAppStatus: currentUser manquant');
    return;
  }
  
  try {
    console.log(`🔍 Vérification statut pour ${currentUser.code}`);
    const response = await fetch(`/api/status/${currentUser.code}`);
    
    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status} lors de la vérification du statut`);
      return;
    }
    
    const data = await response.json();
    console.log(`📊 Statut reçu:`, data);
    
    // Mettre à jour la progression
    const progressEl = document.getElementById('loading-progress');
    const progressBarEl = document.getElementById('loading-progress-bar');
    const messageEl = document.getElementById('loading-message');
    
    if (progressEl) progressEl.textContent = data.loading.progress + '%';
    if (progressBarEl) progressBarEl.style.width = data.loading.progress + '%';
    if (messageEl) messageEl.textContent = data.loading.message;
    
    if (data.isReady) {
      console.log('✅ WhatsApp connecté!');
      // WhatsApp connecté - priorité absolue
      document.getElementById('loading-section').classList.add('hidden');
      document.getElementById('qr-section').classList.add('hidden');
      document.getElementById('connected-section').classList.remove('hidden');
      clearInterval(statusInterval);
      statusInterval = null;
    } else if (data.qrCode) {
      console.log('📱 Affichage QR Code');
      // Afficher le QR code seulement s'il y en a un
      document.getElementById('loading-section').classList.add('hidden');
      document.getElementById('connected-section').classList.add('hidden');
      document.getElementById('qr-section').classList.remove('hidden');
      document.getElementById('qr-code').innerHTML = `<img src="${data.qrCode}" alt="QR Code WhatsApp" class="mx-auto">`;
    } else {
      console.log('🔄 Affichage chargement');
      // Afficher le chargement par défaut
      document.getElementById('qr-section').classList.add('hidden');
      document.getElementById('connected-section').classList.add('hidden');
      document.getElementById('loading-section').classList.remove('hidden');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du statut:', error);
  }
};

// Démarrer la vérification du statut quand on arrive sur la page WhatsApp
const startWhatsAppCheck = async () => {
  if (!currentUser) {
    console.error('❌ startWhatsAppCheck: Utilisateur non connecté');
    toastr.error('Utilisateur non connecté');
    return;
  }
  
  console.log(`🚀 Démarrage initialisation WhatsApp pour ${currentUser.code}`);
  
  // Arrêter l'ancien intervalle s'il existe
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  
  // Réinitialiser l'interface
  document.getElementById('loading-section').classList.remove('hidden');
  document.getElementById('qr-section').classList.add('hidden');
  document.getElementById('connected-section').classList.add('hidden');
  
  // Initialiser la session WhatsApp pour cet utilisateur
  try {
    console.log(`📡 Appel API init-session pour ${currentUser.code}`);
    
    const response = await fetch('/api/init-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCode: currentUser.code })
    });
    
    console.log(`📡 Réponse init-session: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📡 Données init-session:', data);
    
    if (data.success) {
      console.log(`✅ Session initialisée pour ${currentUser.code}`);
      toastr.success('Session WhatsApp initialisée');
    } else {
      console.error('❌ Erreur initialisation:', data.error);
      toastr.error(data.error || 'Erreur lors de l\'initialisation');
      return;
    }
  } catch (error) {
    console.error('❌ Erreur initialisation session:', error);
    toastr.error('Erreur lors de l\'initialisation de votre session WhatsApp');
    return;
  }
  
  // Démarrer la vérification du statut
  console.log('🔄 Démarrage vérification statut...');
  await checkWhatsAppStatus();
  statusInterval = setInterval(checkWhatsAppStatus, 3000);
  console.log('⏰ Intervalle de vérification démarré (3s)');
};

// Reconnexion WhatsApp
const forceReconnect = async () => {
  if (!currentUser) {
    toastr.error('Utilisateur non connecté');
    return;
  }
  
  try {
    document.getElementById('connected-section').classList.add('hidden');
    document.getElementById('loading-section').classList.remove('hidden');
    
    console.log(`🔄 Reconnexion WhatsApp pour ${currentUser.code}`);
    
    const response = await fetch('/api/reconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCode: currentUser.code })
    });
    
    const data = await response.json();
    if (data.success) {
      toastr.success('Reconnexion en cours...');
      startWhatsAppCheck();
    } else {
      toastr.error(data.error || 'Erreur lors de la reconnexion');
    }
  } catch (error) {
    console.error('Erreur reconnexion:', error);
    toastr.error('Erreur lors de la reconnexion');
  }
};

// Déconnexion WhatsApp
const disconnect = async () => {
  if (!currentUser) {
    toastr.error('Utilisateur non connecté');
    return;
  }
  
  try {
    console.log(`🔌 Déconnexion WhatsApp pour ${currentUser.code}`);
    
    // Arrêter l'intervalle de vérification du statut
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    
    const response = await fetch('/api/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCode: currentUser.code })
    });
    
    const data = await response.json();
    if (data.success) {
      // Réinitialiser l'interface
      document.getElementById('connected-section').classList.add('hidden');
      document.getElementById('qr-section').classList.add('hidden');
      document.getElementById('loading-section').classList.remove('hidden');
      
      // Réinitialiser les valeurs de progression
      document.getElementById('loading-progress').textContent = '0%';
      document.getElementById('loading-progress-bar').style.width = '0%';
      document.getElementById('loading-message').textContent = 'Déconnecté';
      
      toastr.success('Session WhatsApp déconnectée avec succès');
    } else {
      toastr.error(data.error || 'Erreur lors de la déconnexion');
    }
  } catch (error) {
    console.error('Erreur déconnexion:', error);
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
  
  console.log('📁 Setup file upload - Elements:', {
    dropZone: !!dropZone,
    fileInput: !!fileInput,
    dropContent: !!dropContent,
    fileSelected: !!fileSelected,
    uploadBtn: !!uploadBtn
  });
  
  if (!dropZone || !fileInput) {
    console.error('❌ Elements manquants pour file upload');
    return;
  }
  
  // Click sur la zone de drop
  dropZone.removeEventListener('click', handleDropZoneClick);
  dropZone.addEventListener('click', handleDropZoneClick);
  
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
  fileInput.removeEventListener('change', handleFileInputChange);
  fileInput.addEventListener('change', handleFileInputChange);
  
  // Upload du fichier
  if (uploadBtn) {
    uploadBtn.removeEventListener('click', uploadFile);
    uploadBtn.addEventListener('click', uploadFile);
    console.log('✅ Event listener ajouté sur upload-btn');
  }
  
  console.log('✅ File upload setup terminé');
};

// Fonctions séparées pour les événements
const handleDropZoneClick = (e) => {
  console.log('💆 Click sur drop zone');
  e.preventDefault();
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.click();
  }
};

const handleFileInputChange = (e) => {
  console.log('📄 Fichier sélectionné:', e.target.files.length);
  if (e.target.files.length > 0) {
    handleFileSelection(e.target.files[0]);
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

const uploadFile = async (e) => {
  if (!window.selectedFile) return;
  e.stopPropagation()
  
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
  console.log('✍️ Setup message compose...');
  
  const messageInput = document.getElementById('message-input');
  const messagePreview = document.getElementById('message-preview');
  const continueBtn = document.getElementById('continue-to-send');
  const attachmentInput = document.getElementById('attachment-input');
  const attachmentZone = document.getElementById('attachment-drop-zone');
  
  console.log('✍️ Elements message:', {
    messageInput: !!messageInput,
    messagePreview: !!messagePreview,
    continueBtn: !!continueBtn,
    attachmentInput: !!attachmentInput,
    attachmentZone: !!attachmentZone
  });
  
  if (messageInput && messagePreview) {
    // Supprimer les anciens événements
    messageInput.removeEventListener('input', handleMessageInput);
    messageInput.addEventListener('input', handleMessageInput);
    
    // Initialiser l'aperçu
    handleMessageInput();
  }
  
  if (continueBtn) {
    // Supprimer l'ancien événement
    continueBtn.removeEventListener('click', handleContinueToSend);
    continueBtn.addEventListener('click', handleContinueToSend);
    console.log('✅ Event listener ajouté sur continue-to-send');
  }
  
  if (attachmentZone && attachmentInput) {
    attachmentZone.addEventListener('click', () => {
      console.log('💆 Click sur attachment zone');
      attachmentInput.click();
    });
    
    attachmentInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleAttachmentSelection(e.target.files[0]);
      }
    });
  }
  
  console.log('✅ Message compose setup terminé');
};

// Fonction séparée pour gérer l'input du message
const handleMessageInput = () => {
  const messageInput = document.getElementById('message-input');
  const messagePreview = document.getElementById('message-preview');
  const continueBtn = document.getElementById('continue-to-send');
  
  if (!messageInput || !messagePreview) return;
  
  const message = messageInput.value;
  const preview = message.replace(/{{name}}/g, '<span class="bg-yellow-200 px-1 rounded">John Doe</span>') || 'Tapez votre message pour voir l\'aperçu...';
  messagePreview.innerHTML = preview;
  
  if (continueBtn) {
    continueBtn.disabled = message.trim().length === 0;
  }
};

// Fonction séparée pour gérer le clic sur continuer
const handleContinueToSend = (e) => {
  console.log('🚀 Click sur continue-to-send');
  e.preventDefault();
  nextStep();
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
const setupSendPage = async () => {
  // Actualiser les stats utilisateur avant l'affichage
  await refreshUserStats();
  
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
  
  // Vérifier la limite quotidienne avant l'envoi
  if (currentUser.remainingMessages <= 0) {
    toastr.error('Limite quotidienne atteinte ! Votre quota se réinitialise à 01h00.');
    return;
  }
  
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
    
    if (response.status === 429) {
      // Envoi déjà en cours
      toastr.warning(data.error || 'Un envoi est déjà en cours', 'Veuillez patienter');
      
      // Réafficher les actions
      document.querySelector('.bg-gradient-to-r.from-gray-50').style.display = 'block';
      document.getElementById('sending-progress').classList.add('hidden');
      return;
    }
    
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
          currentUser.dailyLimit = data.userStats.dailyLimit;
          
          // Sauvegarder dans localStorage pour persistance
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          
          // Mettre à jour le widget de statut
          updateUserStatusWidget(data.userStats);
          
          // Vérifier si la limite est atteinte
          if (data.userStats.remainingMessages <= 0) {
            toastr.warning('Limite quotidienne atteinte ! Votre quota se réinitialise à 01h00.', 'Limite atteinte');
          }
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
    
    // Ajouter au début de la section résultats
    const resultsList = document.getElementById('results-list');
    if (resultsList && resultsList.parentNode === resultsSection) {
      resultsSection.insertBefore(userStatsDiv, resultsList);
    } else {
      resultsSection.appendChild(userStatsDiv);
    }
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
  
  console.log('Affichage widget avec user:', user);
  
  document.getElementById('widget-user-name').textContent = user.name;
  document.getElementById('widget-remaining-messages').textContent = user.remainingMessages || 0;
  document.getElementById('widget-daily-limit').textContent = user.dailyLimit || 0;
  
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
  
  console.log('Mise à jour widget avec stats:', userStats);
  
  const remainingEl = document.getElementById('widget-remaining-messages');
  const dailyLimitEl = document.getElementById('widget-daily-limit');
  
  if (remainingEl && dailyLimitEl) {
    remainingEl.textContent = userStats.remainingMessages || 0;
    dailyLimitEl.textContent = userStats.dailyLimit || 0;
    
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

const resetApp = async () => {
  // Déconnecter la session WhatsApp si l'utilisateur est connecté
  if (currentUser && currentUser.code) {
    try {
      console.log(`🔌 Déconnexion session WhatsApp pour ${currentUser.code}`);
      
      const response = await fetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCode: currentUser.code })
      });
      
      if (response.ok) {
        console.log(`✅ Session WhatsApp déconnectée pour ${currentUser.code}`);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion WhatsApp:', error);
    }
  }
  
  // Arrêter l'intervalle de vérification du statut
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  
  contacts = [];
  window.attachmentFile = null;
  
  // Réinitialiser tous les éléments
  document.getElementById('sending-progress').classList.add('hidden');
  document.getElementById('results-section').classList.add('hidden');
  
  const actionsDiv = document.querySelector('.bg-gradient-to-r.from-gray-50');
  if (actionsDiv) actionsDiv.style.display = 'block';
  
  // Revenir à l'étape d'import si l'utilisateur est connecté
  if (currentUser) {
    showStep(2); // Page d'import
    toastr.info('Prêt pour un nouvel envoi');
  } else {
    showStep(0);
    showLoginForm();
    toastr.info('Application réinitialisée');
  }
};

// Fonction pour un nouvel envoi (sans déconnecter l'utilisateur)
const newSending = () => {
  contacts = [];
  window.attachmentFile = null;
  
  // Réinitialiser les éléments d'envoi
  document.getElementById('sending-progress').classList.add('hidden');
  document.getElementById('results-section').classList.add('hidden');
  
  const actionsDiv = document.querySelector('.bg-gradient-to-r.from-gray-50');
  if (actionsDiv) actionsDiv.style.display = 'block';
  
  // Réinitialiser l'import
  resetImport();
  
  // Revenir à l'étape d'import
  showStep(2);
  toastr.info('Prêt pour un nouvel envoi');
};

// Fonction pour initialiser tous les événements
const initializeAllEvents = () => {
  console.log('🔧 Initialisation de tous les événements...');
  
  // Initialiser file upload
  setupFileUpload();
  
  // Initialiser message compose
  setupMessageCompose();
  
  // Vérifier tous les boutons critiques
  const criticalButtons = [
    { id: 'upload-btn', name: 'Upload' },
    { id: 'continue-to-send', name: 'Continue to send' },
    { id: 'file-input', name: 'File input' },
    { id: 'drop-zone', name: 'Drop zone' }
  ];
  
  criticalButtons.forEach(btn => {
    const element = document.getElementById(btn.id);
    if (element) {
      console.log(`✅ ${btn.name} trouvé`);
    } else {
      console.error(`❌ ${btn.name} manquant`);
    }
  });
  
  console.log('✅ Initialisation des événements terminée');
};

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  // S'assurer que la première page est visible dès le début
  const firstPage = document.getElementById('page-user-login');
  if (firstPage) {
    firstPage.classList.remove('hidden');
    firstPage.classList.add('active');
  }
  
  // Restaurer l'utilisateur depuis localStorage si disponible
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      console.log('Utilisateur restauré depuis localStorage:', currentUser);
      
      // Vérifier si la session est encore valide
      const isValid = await validateUserSession();
      if (isValid) {
        // Cacher le formulaire de connexion et afficher l'interface utilisateur connecté
        const loginForm = document.querySelector('#page-user-login .bg-white');
        if (loginForm) {
          loginForm.style.display = 'none';
        }
        
        showUserConnectedInterface(currentUser);
        showUserStatusWidget(currentUser);
        
        // Actualiser les stats depuis le serveur
        await refreshUserStats();
        
        console.log('Session restaurée avec succès');
        return;
      } else {
        // Session expirée, nettoyer
        localStorage.removeItem('currentUser');
        currentUser = null;
        console.log('Session expirée, nettoyage effectué');
      }
    } catch (error) {
      console.error('Erreur lors de la restauration de l\'utilisateur:', error);
      localStorage.removeItem('currentUser');
      currentUser = null;
    }
  }
  
  // Afficher le formulaire de connexion si pas d'utilisateur connecté
  showStep(0);
  
  // Setup des composants
  initializeAllEvents();
  
  // Observer pour démarrer WhatsApp quand on arrive sur la page
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.id === 'page-connection' && !target.classList.contains('hidden')) {
          console.log('🔄 Page connection affichée, démarrage WhatsApp...');
          startWhatsAppCheck();
        } else if (target.id === 'page-import' && !target.classList.contains('hidden')) {
          console.log('📁 Page import affichée, setup file upload...');
          setTimeout(() => {
            setupFileUpload();
          }, 100);
        } else if (target.id === 'page-message' && !target.classList.contains('hidden')) {
          console.log('✍️ Page message affichée, setup message compose...');
          setTimeout(() => {
            setupMessageCompose();
          }, 100);
        } else if (target.id === 'page-send' && !target.classList.contains('hidden')) {
          console.log('📤 Page send affichée, setup...');
          setTimeout(() => {
            setupSendPage();
          }, 100);
        }
      }
    });
  });
  
  const connectionPage = document.getElementById('page-connection');
  if (connectionPage) {
    observer.observe(connectionPage, { attributes: true });
    console.log('👁️ Observer ajouté sur page-connection');
  } else {
    console.error('❌ Page connection non trouvée');
  }
  
  const importPage = document.getElementById('page-import');
  if (importPage) {
    observer.observe(importPage, { attributes: true });
    console.log('👁️ Observer ajouté sur page-import');
  }
  
  const messagePage = document.getElementById('page-message');
  if (messagePage) {
    observer.observe(messagePage, { attributes: true });
    console.log('👁️ Observer ajouté sur page-message');
  }
  
  const sendPage = document.getElementById('page-send');
  if (sendPage) {
    observer.observe(sendPage, { attributes: true });
    console.log('👁️ Observer ajouté sur page-send');
  }
});