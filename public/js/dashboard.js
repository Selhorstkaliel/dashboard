// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    let entriesData = [];

    // Initialize dashboard
    init();

    async function init() {
        try {
            await checkAuth();
            await loadUserInfo();
            setupEventListeners();
            populateYearFilter();
            await loadDashboardData();
        } catch (error) {
            console.error('Initialization error:', error);
            redirectToLogin();
        }
    }

    // Check authentication
    async function checkAuth() {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Not authenticated');
        }

        currentUser = await response.json();
        return currentUser;
    }

    // Load user info
    async function loadUserInfo() {
        document.getElementById('userName').textContent = currentUser.name || currentUser.username;
        document.getElementById('userRole').textContent = currentUser.role;

        // Show/hide admin features
        if (currentUser.role === 'admin') {
            document.getElementById('actionsHeader').style.display = 'table-cell';
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Filter buttons
        document.getElementById('applyFilters').addEventListener('click', applyFilters);

        // Navigation
        setupNavigation();
    }

    // Setup navigation highlighting
    function setupNavigation() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath || 
                (currentPath === '/' && link.getAttribute('href') === '/index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Populate year filter
    function populateYearFilter() {
        const yearSelect = document.getElementById('filterYear');
        const currentYear = new Date().getFullYear();
        
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    // Load dashboard data
    async function loadDashboardData() {
        try {
            showLoading(true);
            
            // Load stats (placeholder - will be implemented when stats API is ready)
            await loadStats();
            
            // Load entries
            await loadEntries();
            
            // Load charts (placeholder)
            // await loadCharts();
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showError('Erro ao carregar dados do dashboard');
        } finally {
            showLoading(false);
        }
    }

    // Load statistics
    async function loadStats() {
        try {
            // For now, show placeholder values
            document.getElementById('limpezasCount').textContent = '0';
            document.getElementById('ratingsCount').textContent = '0';
            document.getElementById('totalBruto').textContent = 'R$ 0,00';
            document.getElementById('totalLiquido').textContent = 'R$ 0,00';
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Load entries
    async function loadEntries() {
        try {
            // For now, show placeholder message
            const tableBody = document.getElementById('entriesTableBody');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">Nenhum cadastro encontrado. Sistema em desenvolvimento.</td>
                </tr>
            `;
        } catch (error) {
            console.error('Error loading entries:', error);
        }
    }

    // Apply filters
    function applyFilters() {
        const filters = {
            year: document.getElementById('filterYear').value,
            month: document.getElementById('filterMonth').value,
            half: document.getElementById('filterHalf').value
        };

        console.log('Applying filters:', filters);
        // Reload data with filters
        loadDashboardData();
    }

    // Logout
    async function logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                window.location.href = '/login.html';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout API fails
            window.location.href = '/login.html';
        }
    }

    // Redirect to login
    function redirectToLogin() {
        window.location.href = '/login.html';
    }

    // Show loading state
    function showLoading(loading) {
        const mainContent = document.querySelector('.main-content');
        if (loading) {
            mainContent.classList.add('loading');
        } else {
            mainContent.classList.remove('loading');
        }
    }

    // Show error message
    function showError(message) {
        // For now, just log to console
        console.error('Dashboard error:', message);
        // TODO: Implement proper error display
    }

    // Format currency
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Format date
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    // Format status badge
    function formatStatus(status) {
        const badges = {
            'Restrição': 'status-restricao',
            'Finalizado': 'status-finalizado',
            'Reprotocolo': 'status-reprotocolo'
        };
        
        return `<span class="status-badge ${badges[status] || ''}">${status}</span>`;
    }
});

// Utility functions available globally
window.DashboardUtils = {
    formatCurrency: function(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    
    formatDate: function(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    },
    
    handleApiError: function(error, defaultMessage = 'Erro interno') {
        console.error('API Error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return 'Erro de conexão. Verifique sua internet.';
        }
        
        return error.message || defaultMessage;
    }
};