// Attendre que jQuery et Toastr soient chargés
document.addEventListener('DOMContentLoaded', function() {
    // Configuration Toastr
    if (typeof toastr !== 'undefined') {
        toastr.options = {
            "closeButton": true,
            "progressBar": true,
            "positionClass": "toast-top-right",
            "timeOut": "3000"
        };
    }
});

const loadPacks = async () => {
    try {
        const response = await fetch('/api/packs');
        const packs = await response.json();
        
        const container = document.getElementById('packs-container');
        container.innerHTML = packs
            .filter(pack => pack.name !== 'Test' && pack.isActive)
            .map(pack => `
                <div class="bg-white rounded-lg shadow-md p-6 border ${pack.name === 'Gratuit' ? 'border-green-400' : pack.name === 'Starter' ? 'border-blue-400' : 'border-purple-400'}">
                    <div class="text-center">
                        <h3 class="text-xl font-bold mb-2 ${pack.name === 'Gratuit' ? 'text-green-600' : pack.name === 'Starter' ? 'text-blue-600' : 'text-purple-600'}">${pack.name}</h3>
                        <p class="text-gray-600 mb-4">${pack.description}</p>
                        
                        <div class="mb-4">
                            <span class="text-3xl font-bold ${pack.name === 'Gratuit' ? 'text-green-600' : pack.name === 'Starter' ? 'text-blue-600' : 'text-purple-600'}">${pack.dailyLimit}</span>
                            <span class="text-gray-500 block">messages/jour</span>
                        </div>
                        
                        <div class="mb-6">
                            <span class="text-2xl font-bold ${pack.isFree ? 'text-green-600' : 'text-gray-900'}">${pack.isFree ? 'Gratuit' : pack.price + '€'}</span>
                        </div>
                        
                        ${pack.isFree && pack.name === 'Gratuit' ? `
                            <button onclick="showSignupModal()" class="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition">
                                Créer mon compte gratuit
                            </button>
                        ` : pack.isFree ? `
                            <a href="/" class="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition inline-block">
                                Commencer gratuitement
                            </a>
                        ` : `
                            <div class="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-left">
                                <strong class="text-gray-700">Pour souscrire :</strong><br>
                                <span class="text-gray-600">${pack.contactInfo || 'Contactez-nous à contact@whatsapp-bulk.com'}</span>
                            </div>
                            <button class="w-full bg-gray-300 text-gray-600 py-3 px-6 rounded-lg cursor-not-allowed" disabled>
                                Contactez-nous
                            </button>
                        `}
                    </div>
                </div>
            `).join('');
    } catch (error) {
        showToast('error', 'Erreur lors du chargement des packs');
    }
};

// Modal functions
const showSignupModal = () => {
    document.getElementById('signup-modal').classList.remove('hidden');
};

const hideSignupModal = () => {
    document.getElementById('signup-modal').classList.add('hidden');
    document.getElementById('signup-form').reset();
};

const hideCodeModal = () => {
    document.getElementById('code-modal').classList.add('hidden');
};

const copyCode = () => {
    const code = document.getElementById('generated-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('success', 'Code copié dans le presse-papiers !');
    }).catch(() => {
        showToast('error', 'Impossible de copier le code');
    });
};

const copyTestCode = () => {
    navigator.clipboard.writeText('TEST2024').then(() => {
        showToast('success', 'Code de test copié !');
    }).catch(() => {
        showToast('error', 'Impossible de copier le code');
    });
};

// Signup form
const initSignupForm = () => {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Formulaire soumis');
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Validation
            const name = document.getElementById('user-name').value.trim();
            if (!name) {
                showToast('error', 'Veuillez entrer votre nom');
                return;
            }
            
            // Afficher le loader
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <div class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Création...
                </div>
            `;
            
            const userData = {
                name: name,
                email: document.getElementById('user-email').value.trim() || null
            };
            
            console.log('Données utilisateur:', userData);
            
            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                
                console.log('Réponse reçue:', response.status);
                const data = await response.json();
                console.log('Données reçues:', data);
                
                if (data.success) {
                    showToast('success', 'Compte créé avec succès ! Voici votre code d\'accès.');
                    document.getElementById('generated-code').textContent = data.code;
                    hideSignupModal();
                    document.getElementById('code-modal').classList.remove('hidden');
                } else {
                    showToast('error', data.message || 'Erreur lors de la création du compte');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showToast('error', 'Erreur de connexion. Veuillez réessayer.');
            } finally {
                // Restaurer le bouton
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    } else {
        console.error('Formulaire signup-form non trouvé');
    }
};

// Fonction pour afficher les toasts de manière sécurisée
const showToast = (type, message) => {
    if (typeof toastr !== 'undefined') {
        toastr[type](message);
    } else {
        // Fallback si toastr n'est pas disponible
        alert(message);
    }
};

// Initialisation complète
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page chargée, initialisation...');
    
    // Attendre un peu pour que toastr soit complètement chargé
    setTimeout(() => {
        loadPacks();
        initSignupForm();
    }, 100);
});