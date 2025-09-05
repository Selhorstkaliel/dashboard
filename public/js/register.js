// Include the API class from login.js
class API {
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

    static async register(userData) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: userData
        });
    }

    static async validateToken() {
        return this.request('/api/auth/validate');
    }
}

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
        const response = await API.validateToken();
        const user = response.user;
        
        // Set up user type options based on parent user type
        const userTypeSelect = document.getElementById('user_type');
        userTypeSelect.innerHTML = '<option value="">Selecione o tipo</option>';
        
        if (user.user_type === 'admin') {
            userTypeSelect.innerHTML += `
                <option value="representante">Representante</option>
                <option value="vendedor">Vendedor</option>
            `;
        } else if (user.user_type === 'representante') {
            userTypeSelect.innerHTML += `
                <option value="vendedor">Vendedor</option>
                <option value="cliente">Cliente</option>
            `;
        } else if (user.user_type === 'vendedor') {
            userTypeSelect.innerHTML += `
                <option value="cliente">Cliente</option>
            `;
        } else {
            // Cliente cannot register anyone
            showAlert('Você não tem permissão para cadastrar usuários');
            window.location.href = '/dashboard';
        }
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();

    const registerForm = document.getElementById('registerForm');
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            user_type: document.getElementById('user_type').value,
            discount_percentage: parseFloat(document.getElementById('discount_percentage').value) || 0
        };
        
        try {
            const response = await API.register(formData);
            
            showAlert('Usuário cadastrado com sucesso!', 'success');
            
            // Reset form
            registerForm.reset();
            
        } catch (error) {
            showAlert(error.message);
        }
    });
});