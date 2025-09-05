// Enhanced Login functionality for LimitClean Dashboard with better debugging

class LoginManager {
    constructor() {
        this.debug = true; // Enable debug mode
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
        this.log('Login manager initialized');
    }

    log(message) {
        if (this.debug) {
            console.log(`[LoginManager] ${message}`);
            const debugElement = document.getElementById('debugText');
            if (debugElement) {
                debugElement.textContent = message;
                document.getElementById('debugInfo').style.display = 'block';
            }
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
                e.preventDefault();
                this.handleLogin(e);
            }
        });

        this.log('Event listeners set up');
    }

    async checkExistingSession() {
        try {
            this.log('Checking existing session...');
            
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            this.log(`Session check response: ${response.status}`);
            
            if (response.ok) {
                const user = await response.json();
                this.log(`User already logged in: ${user.username}`);
                this.showSuccess('Sessão já ativa, redirecionando...');
                
                // Small delay to show message
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
                
                return;
            }
            
            this.log('No existing session found');
        } catch (error) {
            this.log(`Session check error: ${error.message}`);
            // Not logged in, stay on login page
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        this.log('Starting login process...');
        
        // Get form data
        const formData = new FormData(document.getElementById('loginForm'));
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        // Validate input
        if (!loginData.username || !loginData.password) {
            this.showError('Por favor, preencha todos os campos');
            return;
        }

        this.log(`Attempting login for user: ${loginData.username}`);

        // Show loading state
        this.setLoadingState(true);
        this.hideMessages();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(loginData),
                credentials: 'include' // Important for cookies
            });

            this.log(`Login response status: ${response.status}`);

            const result = await response.json();
            this.log(`Login response body: ${JSON.stringify(result)}`);

            if (response.ok && result.success) {
                this.log('Login successful, setting up redirect...');
                
                // Store user info in session storage as backup
                sessionStorage.setItem('user', JSON.stringify(result.user));
                
                // Show success message
                this.showSuccess(`Login realizado com sucesso! Bem-vindo, ${result.user.name}. Redirecionando...`);
                
                // Redirect after showing success message
                setTimeout(() => {
                    this.log('Redirecting to dashboard...');
                    window.location.href = '/';
                }, 2000);
                
            } else {
                // Login failed
                this.log(`Login failed: ${result.error || 'Unknown error'}`);
                this.showError(result.error || 'Erro no login. Verifique suas credenciais.');
            }

        } catch (error) {
            this.log(`Login request error: ${error.message}`);
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
            this.log('Loading state: ON');
        } else {
            loginBtn.disabled = false;
            loginText.classList.remove('d-none');
            loginSpinner.classList.add('d-none');
            usernameInput.disabled = false;
            passwordInput.disabled = false;
            this.log('Loading state: OFF');
        }
    }

    showError(message) {
        this.log(`Showing error: ${message}`);
        
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            this.hideError();
        }, 8000);
    }

    hideError() {
        const errorAlert = document.getElementById('errorAlert');
        errorAlert.classList.add('d-none');
    }

    showSuccess(message) {
        this.log(`Showing success: ${message}`);
        
        const successAlert = document.getElementById('successAlert');
        const successMessage = document.getElementById('successMessage');
        
        successMessage.textContent = message;
        successAlert.classList.remove('d-none');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideSuccess();
        }, 5000);
    }

    hideSuccess() {
        const successAlert = document.getElementById('successAlert');
        successAlert.classList.add('d-none');
    }

    hideMessages() {
        this.hideError();
        this.hideSuccess();
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.loginManager = new LoginManager();
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