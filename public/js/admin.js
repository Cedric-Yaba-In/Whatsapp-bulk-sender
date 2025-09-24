let currentUsers = [];
let currentPacks = [];
let currentTestAccounts = [];

// Gestion des tabs
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    event.target.classList.remove('border-transparent', 'text-gray-500');
    event.target.classList.add('border-blue-500', 'text-blue-600');
    
    if (tabName === 'users') loadUsers();
    if (tabName === 'packs') loadPacks();
}

// Authentification
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('login-modal').classList.add('hidden');
            document.getElementById('admin-dashboard').classList.remove('hidden');
            loadStats();
        } else {
            toastr.error('Identifiants incorrects');
        }
    } catch (error) {
        toastr.error('Erreur de connexion');
    }
});

function logout() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

// Statistiques
async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();
        
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('active-users').textContent = stats.activeUsers;
        document.getElementById('messages-today').textContent = stats.messagesToday;
        document.getElementById('messages-total').textContent = stats.messagesTotal;
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// Gestion des utilisateurs
async function loadUsers() {
    try {
        const [usersResponse, testAccountsResponse] = await Promise.all([
            fetch('/api/admin/users'),
            fetch('/api/admin/test-accounts')
        ]);
        
        currentUsers = await usersResponse.json();
        currentTestAccounts = await testAccountsResponse.json();
        
        renderUsersTable();
        renderTestAccountsTable();
        loadPacksForSelect();
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = currentUsers.map(user => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.code}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.packId?.name || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.messagesUsedToday}/${user.packId?.dailyLimit || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${user.isActive ? 'Actif' : 'Inactif'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="editUser('${user._id}')" class="text-blue-600 hover:text-blue-900">Éditer</button>
                <button onclick="toggleUser('${user._id}')" class="text-yellow-600 hover:text-yellow-900">
                    ${user.isActive ? 'Désactiver' : 'Activer'}
                </button>
                <button onclick="resetUserQuota('${user._id}')" class="text-green-600 hover:text-green-900">Reset</button>
                <button onclick="deleteUser('${user._id}')" class="text-red-600 hover:text-red-900">Supprimer</button>
            </td>
        </tr>
    `).join('');
}

function renderTestAccountsTable() {
    const tbody = document.getElementById('test-accounts-table');
    tbody.innerHTML = currentTestAccounts.map(account => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${account.ipAddress}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${account.messagesUsedToday}/5</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(account.lastResetDate).toLocaleDateString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(account.createdAt).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function showCreateUserModal() {
    document.getElementById('user-modal-title').textContent = 'Créer un utilisateur';
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-modal').classList.remove('hidden');
}

function hideUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

function editUser(userId) {
    const user = currentUsers.find(u => u._id === userId);
    if (!user) return;
    
    document.getElementById('user-modal-title').textContent = 'Éditer l\'utilisateur';
    document.getElementById('user-id').value = user._id;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-pack').value = user.packId?._id || '';
    document.getElementById('user-modal').classList.remove('hidden');
}

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('user-id').value;
    const userData = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        packId: document.getElementById('user-pack').value
    };
    
    try {
        const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            toastr.success(userId ? 'Utilisateur modifié' : 'Utilisateur créé');
            hideUserModal();
            loadUsers();
        } else {
            toastr.error(data.message);
        }
    } catch (error) {
        toastr.error('Erreur lors de l\'opération');
    }
});

async function toggleUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle`, { method: 'PUT' });
        const data = await response.json();
        
        if (data.success) {
            toastr.success('Statut modifié');
            loadUsers();
        }
    } catch (error) {
        toastr.error('Erreur lors de la modification');
    }
}

async function resetUserQuota(userId) {
    if (!confirm('Réinitialiser le quota de cet utilisateur ?')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/reset-quota`, { method: 'PUT' });
        const data = await response.json();
        
        if (data.success) {
            toastr.success('Quota réinitialisé');
            loadUsers();
        }
    } catch (error) {
        toastr.error('Erreur lors de la réinitialisation');
    }
}

async function deleteUser(userId) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            toastr.success('Utilisateur supprimé');
            loadUsers();
        }
    } catch (error) {
        toastr.error('Erreur lors de la suppression');
    }
}

// Gestion des packs
async function loadPacks() {
    try {
        const response = await fetch('/api/admin/packs');
        currentPacks = await response.json();
        renderPacksTable();
    } catch (error) {
        console.error('Erreur chargement packs:', error);
    }
}

async function loadPacksForSelect() {
    try {
        const response = await fetch('/api/admin/packs');
        const packs = await response.json();
        
        const select = document.getElementById('user-pack');
        select.innerHTML = '<option value="">Sélectionner un pack</option>' +
            packs.map(pack => `<option value="${pack._id}">${pack.name}</option>`).join('');
    } catch (error) {
        console.error('Erreur chargement packs:', error);
    }
}

function renderPacksTable() {
    const tbody = document.getElementById('packs-table');
    tbody.innerHTML = currentPacks.map(pack => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${pack.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${pack.description}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${pack.dailyLimit}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${pack.price}€</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <button onclick="showPackUsers('${pack._id}', '${pack.name}')" class="text-blue-600 hover:text-blue-900">
                    Voir utilisateurs
                </button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pack.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${pack.isActive ? 'Actif' : 'Inactif'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="editPack('${pack._id}')" class="text-blue-600 hover:text-blue-900">Éditer</button>
                <button onclick="togglePack('${pack._id}')" class="text-yellow-600 hover:text-yellow-900">
                    ${pack.isActive ? 'Désactiver' : 'Activer'}
                </button>
                <button onclick="deletePack('${pack._id}')" class="text-red-600 hover:text-red-900">Supprimer</button>
            </td>
        </tr>
    `).join('');
}

function showCreatePackModal() {
    document.getElementById('pack-modal-title').textContent = 'Créer un pack';
    document.getElementById('pack-form').reset();
    document.getElementById('pack-id').value = '';
    document.getElementById('contact-info-section').style.display = 'none';
    document.getElementById('pack-modal').classList.remove('hidden');
}

function hidePackModal() {
    document.getElementById('pack-modal').classList.add('hidden');
}

function editPack(packId) {
    const pack = currentPacks.find(p => p._id === packId);
    if (!pack) return;
    
    document.getElementById('pack-modal-title').textContent = 'Éditer le pack';
    document.getElementById('pack-id').value = pack._id;
    document.getElementById('pack-name').value = pack.name;
    document.getElementById('pack-description').value = pack.description;
    document.getElementById('pack-limit').value = pack.dailyLimit;
    document.getElementById('pack-price').value = pack.price;
    document.getElementById('pack-free').checked = pack.isFree;
    document.getElementById('pack-contact').value = pack.contactInfo || '';
    
    document.getElementById('contact-info-section').style.display = pack.isFree ? 'none' : 'block';
    document.getElementById('pack-modal').classList.remove('hidden');
}

document.getElementById('pack-free').addEventListener('change', (e) => {
    document.getElementById('contact-info-section').style.display = e.target.checked ? 'none' : 'block';
});

document.getElementById('pack-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const packId = document.getElementById('pack-id').value;
    const isFree = document.getElementById('pack-free').checked;
    
    const packData = {
        name: document.getElementById('pack-name').value,
        description: document.getElementById('pack-description').value,
        dailyLimit: parseInt(document.getElementById('pack-limit').value),
        price: parseFloat(document.getElementById('pack-price').value),
        isFree: isFree,
        isActive: true
    };
    
    if (!isFree) {
        packData.contactInfo = document.getElementById('pack-contact').value;
    }
    
    try {
        const url = packId ? `/api/admin/packs/${packId}` : '/api/admin/packs';
        const method = packId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(packData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            toastr.success(packId ? 'Pack modifié' : 'Pack créé');
            hidePackModal();
            loadPacks();
        } else {
            toastr.error(data.message);
        }
    } catch (error) {
        toastr.error('Erreur lors de l\'opération');
    }
});

async function togglePack(packId) {
    try {
        const response = await fetch(`/api/admin/packs/${packId}/toggle`, { method: 'PUT' });
        const data = await response.json();
        
        if (data.success) {
            toastr.success('Statut modifié');
            loadPacks();
        }
    } catch (error) {
        toastr.error('Erreur lors de la modification');
    }
}

async function deletePack(packId) {
    if (!confirm('Supprimer ce pack ?')) return;
    
    try {
        const response = await fetch(`/api/admin/packs/${packId}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            toastr.success('Pack supprimé');
            loadPacks();
        }
    } catch (error) {
        toastr.error('Erreur lors de la suppression');
    }
}

async function showPackUsers(packId, packName) {
    try {
        const response = await fetch(`/api/admin/packs/${packId}/users`);
        const users = await response.json();
        
        document.getElementById('pack-users-title').textContent = `Utilisateurs du pack "${packName}"`;
        
        const tbody = document.getElementById('pack-users-table');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.code}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.messagesUsedToday}/${user.packId?.dailyLimit || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick="editUser('${user._id}')" class="text-blue-600 hover:text-blue-900">Éditer</button>
                    <button onclick="resetUserQuota('${user._id}')" class="text-green-600 hover:text-green-900">Reset</button>
                </td>
            </tr>
        `).join('');
        
        document.getElementById('pack-users-modal').classList.remove('hidden');
    } catch (error) {
        toastr.error('Erreur lors du chargement');
    }
}

function hidePackUsersModal() {
    document.getElementById('pack-users-modal').classList.add('hidden');
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
});