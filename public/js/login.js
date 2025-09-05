// Login functionality for LimitClean Dashboard

class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
                this.handleLogin(e);
            }
        });
    }

    async checkExistingSession() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                // User is already logged in, redirect to dashboard
                window.location.href = '/';
            }
        } catch (error) {
            // Not logged in, stay on login page
            console.log('No existing session found');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const loginBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        const loginSpinner = document.getElementById('loginSpinner');
        const errorAlert = document.getElementById('errorAlert');
        
        // Get form data
        const formData = new FormData(document.getElementById('loginForm'));
        const loginData = Object.fromEntries(formData);
        
        // Validate input
        if (!loginData.username || !loginData.password) {
            this.showError('Por favor, preencha todos os campos');
            return;
        }

        // Show loading state
        this.setLoadingState(true);
        this.hideError();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Success! Store user info and redirect
                sessionStorage.setItem('user', JSON.stringify(result.user));
                
                // Show success message briefly
                this.showSuccess('Login realizado com sucesso! Redirecionando...');
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
                
            } else {
                // Login failed
                this.showError(result.error || 'Erro no login. Verifique suas credenciais.');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showError('Erro de conexão. Tente novamente.');
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(loading) {
        const loginBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        const loginSpinner = document.getElementById('loginSpinner');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (loading) {
            loginBtn.disabled = true;
            loginText.classList.add('d-none');
            loginSpinner.classList.remove('d-none');
            usernameInput.disabled = true;
            passwordInput.disabled = true;
        } else {
            loginBtn.disabled = false;
            loginText.classList.remove('d-none');
            loginSpinner.classList.add('d-none');
            usernameInput.disabled = false;
            passwordInput.disabled = false;
        }
    }

    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        const errorAlert = document.getElementById('errorAlert');
        errorAlert.classList.add('d-none');
    }

    showSuccess(message) {
        // Create temporary success alert
        const successAlert = document.createElement('div');
        successAlert.className = 'alert alert-success';
        successAlert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1001; max-width: 400px;';
        successAlert.innerHTML = `<span>${message}</span>`;
        
        document.body.appendChild(successAlert);
        
        setTimeout(() => {
            successAlert.remove();
        }, 3000);
    }

    // Utility function to handle "remember me" (future enhancement)
    handleRememberMe(remember) {
        if (remember) {
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('rememberMe');
        }
    }
}

// Global logout function (used across all pages)
window.logout = async function() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        // Clear session storage
        sessionStorage.clear();
        
        // Redirect to login
        window.location.href = '/login.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect anyway
        window.location.href = '/login.html';
    }
};

// Global function to check authentication
window.checkAuth = async function() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Not authenticated');
        }
        
        const user = await response.json();
        return user;
    } catch (error) {
        // Not authenticated, redirect to login
        window.location.href = '/login.html';
        return null;
    }
};

// Global function to format phone numbers
window.formatPhone = function(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
        value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    
    input.value = value;
};

// Global function to handle API errors
window.handleApiError = function(error, defaultMessage = 'Erro inesperado') {
    if (error.status === 401) {
        window.location.href = '/login.html';
        return;
    }
    
    let message = defaultMessage;
    if (error.message) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    }
    
    return message;
};

// Global function to show notifications
window.showNotification = function(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1001; max-width: 400px; animation: fadeInUp 0.3s ease;';
    notification.innerHTML = `<span>${message}</span>`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
};

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);