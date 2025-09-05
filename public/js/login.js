// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    // Check if already logged in
    checkAuth();

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            showLoading(true);
            hideError();

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                credentials: 'include' // Include cookies
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Login successful
                console.log('Login successful:', data.user);
                window.location.href = '/index.html';
            } else {
                showError(data.error || 'Erro ao fazer login');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Erro de conexão. Tente novamente.');
        } finally {
            showLoading(false);
        }
    });

    // Check if user is already authenticated
    async function checkAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.ok) {
                // Already logged in, redirect
                window.location.href = '/index.html';
            }
        } catch (error) {
            // Not logged in, stay on login page
            console.log('Not authenticated');
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function showLoading(loading) {
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (loading) {
            submitButton.textContent = 'Entrando...';
            submitButton.disabled = true;
            loginForm.classList.add('loading');
        } else {
            submitButton.textContent = 'Entrar';
            submitButton.disabled = false;
            loginForm.classList.remove('loading');
        }
    }
});

// Utility function to handle API errors
function handleApiError(error, defaultMessage = 'Erro interno') {
    console.error('API Error:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return 'Erro de conexão. Verifique sua internet.';
    }
    
    return error.message || defaultMessage;
}