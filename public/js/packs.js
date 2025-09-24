// Configuration Toastr
toastr.options = {
    "closeButton": true,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "timeOut": "3000"
};

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
        toastr.error('Erreur lors du chargement des packs');
    }
};

// Modal functions
const showSignupModal = () => {
    document.getElementById('signup-modal').classList.remove('hidden');
    toastr.info('Remplissez le formulaire pour créer votre compte gratuit', 'Création de compte');
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
        toastr.success('Code copié dans le presse-papiers !', 'Succès');
    }).catch(() => {
        toastr.error('Impossible de copier le code');
    });
};

// Signup form
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Afficher le loader
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Création...</div>';
    
    const userData = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value || null
    };
    
    try {
        toastr.info('Création de votre compte en cours...');
        
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            toastr.success('Compte créé avec succès !');
            document.getElementById('generated-code').textContent = data.code;
            hideSignupModal();
            document.getElementById('code-modal').classList.remove('hidden');
        } else {
            toastr.error(data.message || 'Erreur lors de la création du compte');
        }
    } catch (error) {
        toastr.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
        // Restaurer le bouton
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Charger les packs au démarrage
loadPacks();