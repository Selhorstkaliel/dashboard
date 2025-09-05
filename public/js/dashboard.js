class DashboardAPI {
    static async request(url, options = {}) {
        const token = localStorage.getItem('token');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    static async validateToken() {
        return this.request('/api/auth/validate');
    }

    static async getEntries() {
        return this.request('/api/entries');
    }

    static async getAdminUsers() {
        return this.request('/api/admin/users');
    }

    static async getChartsData() {
        return this.request('/api/charts/users');
    }

    static async register(userData) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: userData
        });
    }
}

let currentUser = null;

function showAlert(message, type = 'danger') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.innerHTML = '';
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await DashboardAPI.validateToken();
        currentUser = response.user;
        
        // Update user info in header
        document.getElementById('user-name').textContent = currentUser.username;
        document.getElementById('user-type').textContent = currentUser.user_type.toUpperCase();
        
        // Show/hide admin tab based on user type
        if (currentUser.user_type === 'admin') {
            document.getElementById('admin-tab').style.display = 'block';
        }
        
        // Load initial data
        await loadOverviewData();
        
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

function setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Hide all content
            contents.forEach(content => content.classList.add('hidden'));
            
            // Show selected content
            const targetContent = document.getElementById(`${tabName}-tab`) || 
                                  document.getElementById(`${tabName}-tab-content`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
            
            // Load data for specific tabs
            switch(tabName) {
                case 'entries':
                    loadEntriesData();
                    break;
                case 'admin':
                    loadAdminData();
                    break;
                case 'register':
                    setupRegisterForm();
                    break;
            }
        });
    });
}

async function loadOverviewData() {
    try {
        // Load basic stats - simplified for demo
        const entries = await DashboardAPI.getEntries();
        document.getElementById('total-users').textContent = entries.length;
        
        // Load charts data
        const chartsData = await DashboardAPI.getChartsData();
        renderUsersChart(chartsData);
        
    } catch (error) {
        console.error('Error loading overview data:', error);
    }
}

async function loadEntriesData() {
    try {
        const entries = await DashboardAPI.getEntries();
        renderEntriesTable(entries);
    } catch (error) {
        showAlert('Erro ao carregar entradas: ' + error.message);
    }
}

async function loadAdminData() {
    if (currentUser.user_type !== 'admin') return;
    
    try {
        const users = await DashboardAPI.getAdminUsers();
        renderAdminUsersTable(users);
    } catch (error) {
        showAlert('Erro ao carregar dados administrativos: ' + error.message);
    }
}

function renderEntriesTable(entries) {
    const container = document.getElementById('entries-table');
    
    if (entries.length === 0) {
        container.innerHTML = '<p>Nenhuma entrada encontrada.</p>';
        return;
    }
    
    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuário</th>
                    <th>Email</th>
                    <th>Tipo</th>
                    <th>Desconto</th>
                    <th>Data</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    entries.forEach(entry => {
        html += `
            <tr>
                <td>${entry.id}</td>
                <td>${entry.username}</td>
                <td>${entry.email}</td>
                <td>${entry.user_type}</td>
                <td>${entry.discount_percentage}%</td>
                <td>${new Date(entry.created_at).toLocaleDateString('pt-BR')}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderAdminUsersTable(users) {
    const container = document.getElementById('admin-users-table');
    
    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuário</th>
                    <th>Email</th>
                    <th>Tipo</th>
                    <th>Desconto</th>
                    <th>Superior</th>
                    <th>Data</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        html += `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.user_type}</td>
                <td>${user.discount_percentage}%</td>
                <td>${user.parent_username || '-'}</td>
                <td>${new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderUsersChart(data) {
    const container = document.getElementById('users-chart');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p>Nenhum dado disponível para o gráfico.</p>';
        return;
    }
    
    let html = '<div class="grid grid-3">';
    data.forEach(item => {
        html += `
            <div class="stat-card">
                <div class="stat-number">${item.count}</div>
                <div class="stat-label">${item.user_type}</div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function setupRegisterForm() {
    const userTypeSelect = document.getElementById('reg-user-type');
    userTypeSelect.innerHTML = '<option value="">Selecione o tipo</option>';
    
    if (currentUser.user_type === 'admin') {
        userTypeSelect.innerHTML += `
            <option value="representante">Representante</option>
            <option value="vendedor">Vendedor</option>
        `;
    } else if (currentUser.user_type === 'representante') {
        userTypeSelect.innerHTML += `
            <option value="vendedor">Vendedor</option>
            <option value="cliente">Cliente</option>
        `;
    } else if (currentUser.user_type === 'vendedor') {
        userTypeSelect.innerHTML += `
            <option value="cliente">Cliente</option>
        `;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupTabs();
    
    // Logout handler
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
    
    // Register form handler
    document.getElementById('registerUserForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('reg-username').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            user_type: document.getElementById('reg-user-type').value,
            discount_percentage: parseFloat(document.getElementById('reg-discount').value) || 0
        };
        
        try {
            await DashboardAPI.register(formData);
            showAlert('Usuário cadastrado com sucesso!', 'success');
            this.reset();
            
            // Refresh data if needed
            if (document.querySelector('.nav-tab[data-tab="entries"]').classList.contains('active')) {
                loadEntriesData();
            }
            if (document.querySelector('.nav-tab[data-tab="admin"]').classList.contains('active')) {
                loadAdminData();
            }
            
        } catch (error) {
            showAlert(error.message);
        }
    });
});