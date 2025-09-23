// Configuration Toastr
toastr.options = {
  "closeButton": true,
  "progressBar": true,
  "positionClass": "toast-top-right",
  "timeOut": "3000"
};

// Login
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
      loadDashboard();
      toastr.success('Connexion réussie');
    } else {
      toastr.error(data.message || 'Erreur de connexion');
    }
  } catch (error) {
    toastr.error('Erreur de connexion');
  }
});

// Logout
const logout = () => {
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('admin-dashboard').classList.add('hidden');
};

// Tabs
const showTab = (tabName) => {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('border-blue-500', 'text-blue-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });
  
  document.getElementById(`${tabName}-tab`).classList.remove('hidden');
  event.target.classList.remove('border-transparent', 'text-gray-500');
  event.target.classList.add('border-blue-500', 'text-blue-600');
  
  if (tabName === 'stats') loadStats();
  if (tabName === 'users') loadUsers();
  if (tabName === 'packs') loadPacks();
};

// Load Dashboard
const loadDashboard = () => {
  loadStats();
  loadUsers();
  loadPacks();
};

// Load Stats
const loadStats = async () => {
  try {
    const response = await fetch('/api/admin/stats');
    const data = await response.json();
    
    document.getElementById('total-users').textContent = data.totalUsers;
    document.getElementById('messages-today').textContent = data.messagesToday;
    document.getElementById('messages-total').textContent = data.messagesTotal;
    document.getElementById('active-users').textContent = data.activeUsers;
  } catch (error) {
    toastr.error('Erreur lors du chargement des statistiques');
  }
};

// Load Users
const loadUsers = async () => {
  try {
    const response = await fetch('/api/admin/users');
    const users = await response.json();
    
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pack</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages Utilisés</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${users.map(user => `
              <tr>
                <td class="px-6 py-4 whitespace-nowrap font-mono text-sm">${user.code}</td>
                <td class="px-6 py-4 whitespace-nowrap">${user.name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">${user.packId?.name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${user.messagesUsedToday}/${user.packId?.dailyLimit || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${user.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button onclick="toggleUserStatus('${user._id}')" class="text-blue-600 hover:text-blue-900 mr-2">
                    ${user.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  <button onclick="deleteUser('${user._id}')" class="text-red-600 hover:text-red-900">Supprimer</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    toastr.error('Erreur lors du chargement des utilisateurs');
  }
};

// Load Packs
const loadPacks = async () => {
  try {
    const response = await fetch('/api/admin/packs');
    const packs = await response.json();
    
    const packsList = document.getElementById('packs-list');
    packsList.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${packs.map(pack => `
          <div class="border rounded-lg p-6 ${pack.name === 'Test' ? 'border-yellow-400 bg-yellow-50' : ''}">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-lg font-semibold">${pack.name}</h3>
              ${pack.isFree ? '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Gratuit</span>' : ''}
              ${pack.name === 'Test' ? '<span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Test</span>' : ''}
            </div>
            <p class="text-gray-600 mb-4">${pack.description}</p>
            <div class="mb-4">
              <span class="text-2xl font-bold text-blue-600">${pack.dailyLimit}</span>
              <span class="text-gray-500"> messages/jour</span>
            </div>
            <div class="mb-4">
              <span class="text-xl font-semibold">${pack.isFree ? 'Gratuit' : pack.price + '€'}</span>
            </div>
            ${!pack.isFree && pack.contactInfo ? `
              <div class="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                <strong>Contact:</strong><br>
                ${pack.contactInfo}
              </div>
            ` : ''}
            ${pack.name === 'Test' ? `
              <div class="mb-4 p-3 bg-yellow-100 rounded text-sm text-yellow-800">
                <strong>Code d'accès:</strong> TEST2024
              </div>
            ` : ''}
            <div class="flex gap-2">
              <button onclick="togglePackStatus('${pack._id}')" class="flex-1 px-3 py-2 text-sm rounded ${pack.isActive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                ${pack.isActive ? 'Désactiver' : 'Activer'}
              </button>
              <button onclick="deletePack('${pack._id}')" class="px-3 py-2 text-sm bg-red-100 text-red-700 rounded">Supprimer</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    toastr.error('Erreur lors du chargement des packs');
  }
};

// Create User Modal
const showCreateUserModal = async () => {
  // Load packs for select
  const response = await fetch('/api/admin/packs');
  const packs = await response.json();
  
  const packSelect = document.getElementById('user-pack');
  packSelect.innerHTML = packs.map(pack => 
    `<option value="${pack._id}">${pack.name} (${pack.dailyLimit} msg/jour)</option>`
  ).join('');
  
  document.getElementById('create-user-modal').classList.remove('hidden');
};

const hideCreateUserModal = () => {
  document.getElementById('create-user-modal').classList.add('hidden');
  document.getElementById('create-user-form').reset();
};

// Create Pack Modal
const showCreatePackModal = () => {
  document.getElementById('create-pack-modal').classList.remove('hidden');
  toggleContactField();
};

// Toggle contact field based on price
const toggleContactField = () => {
  const priceInput = document.getElementById('pack-price');
  const contactField = document.getElementById('contact-field');
  
  if (priceInput && contactField) {
    const price = parseFloat(priceInput.value) || 0;
    contactField.style.display = price > 0 ? 'block' : 'none';
  }
};

const hideCreatePackModal = () => {
  document.getElementById('create-pack-modal').classList.add('hidden');
  document.getElementById('create-pack-form').reset();
  document.getElementById('contact-field').style.display = 'none';
};

// Create User
document.getElementById('create-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userData = {
    name: document.getElementById('user-name').value,
    email: document.getElementById('user-email').value,
    packId: document.getElementById('user-pack').value
  };
  
  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success(`Utilisateur créé avec le code: ${data.user.code}`);
      hideCreateUserModal();
      loadUsers();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la création');
  }
});

// Create Pack
document.getElementById('create-pack-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const price = parseFloat(document.getElementById('pack-price').value);
  const packData = {
    name: document.getElementById('pack-name').value,
    description: document.getElementById('pack-description').value,
    dailyLimit: parseInt(document.getElementById('pack-limit').value),
    price: price,
    isFree: price === 0,
    contactInfo: price > 0 ? document.getElementById('pack-contact').value : null
  };
  
  try {
    const response = await fetch('/api/admin/packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Pack créé avec succès');
      hideCreatePackModal();
      loadPacks();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la création');
  }
});

// Toggle User Status
const toggleUserStatus = async (userId) => {
  try {
    const response = await fetch(`/api/admin/users/${userId}/toggle`, {
      method: 'PUT'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Statut utilisateur modifié');
      loadUsers();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la modification');
  }
};

// Delete User
const deleteUser = async (userId) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
  
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Utilisateur supprimé');
      loadUsers();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la suppression');
  }
};

// Toggle Pack Status
const togglePackStatus = async (packId) => {
  try {
    const response = await fetch(`/api/admin/packs/${packId}/toggle`, {
      method: 'PUT'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Statut pack modifié');
      loadPacks();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la modification');
  }
};

// Delete Pack
const deletePack = async (packId) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce pack ?')) return;
  
  try {
    const response = await fetch(`/api/admin/packs/${packId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Pack supprimé');
      loadPacks();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la suppression');
  }
};
    
    if (data.success) {
      toastr.success('Pack créé avec succès');
      hideCreatePackModal();
      loadPacks();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la création');
  }
});

// Toggle User Status
const toggleUserStatus = async (userId) => {
  try {
    const response = await fetch(`/api/admin/users/${userId}/toggle`, {
      method: 'PUT'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Statut modifié');
      loadUsers();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la modification');
  }
};

// Delete User
const deleteUser = async (userId) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
  
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Utilisateur supprimé');
      loadUsers();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la suppression');
  }
};

// Toggle Pack Status
const togglePackStatus = async (packId) => {
  try {
    const response = await fetch(`/api/admin/packs/${packId}/toggle`, {
      method: 'PUT'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Statut modifié');
      loadPacks();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la modification');
  }
};

// Delete Pack
const deletePack = async (packId) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce pack ?')) return;
  
  try {
    const response = await fetch(`/api/admin/packs/${packId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toastr.success('Pack supprimé');
      loadPacks();
    } else {
      toastr.error(data.message);
    }
  } catch (error) {
    toastr.error('Erreur lors de la suppression');
  }
};