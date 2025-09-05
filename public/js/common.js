// Common utilities for LimitClean Dashboard
// This file contains shared functions used across multiple pages

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

// Global function to format currency
window.formatCurrency = function(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Global function to parse currency from string
window.parseCurrency = function(value) {
    if (typeof value === 'number') return value;
    return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
};

// Add CSS for animations if not already present
if (!document.getElementById('common-animations')) {
    const style = document.createElement('style');
    style.id = 'common-animations';
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
}

// Initialize common functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('LimitClean Dashboard Common Utils loaded');
});

// Export functions for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAuth: window.checkAuth,
        logout: window.logout,
        formatPhone: window.formatPhone,
        handleApiError: window.handleApiError,
        showNotification: window.showNotification,
        formatCurrency: window.formatCurrency,
        parseCurrency: window.parseCurrency
    };
}