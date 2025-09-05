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
            await loadCharts();
            
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
            const response = await fetch('/api/stats', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const stats = await response.json();
                
                document.getElementById('limpezasCount').textContent = stats.limpezas_count;
                document.getElementById('ratingsCount').textContent = stats.ratings_count;
                document.getElementById('totalBruto').textContent = formatCurrency(stats.total_bruto);
                document.getElementById('totalLiquido').textContent = formatCurrency(stats.total_liquido);
            } else {
                throw new Error('Failed to load stats');
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Load entries
    async function loadEntries() {
        try {
            const response = await fetch('/api/entries?limit=50', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const entries = await response.json();
                updateEntriesTable(entries);
            } else {
                throw new Error('Failed to load entries');
            }
        } catch (error) {
            console.error('Error loading entries:', error);
            const tableBody = document.getElementById('entriesTableBody');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">Erro ao carregar cadastros.</td>
                </tr>
            `;
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

    // Update entries table
    function updateEntriesTable(entries) {
        const tableBody = document.getElementById('entriesTableBody');
        
        if (!entries || entries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">Nenhum cadastro encontrado.</td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = entries.map(entry => `
            <tr>
                <td>${entry.nome}</td>
                <td>${entry.doc}</td>
                <td>${entry.type === 'limpeza' ? 'Limpeza' : `Rating ${entry.rating_subtype || ''}`}</td>
                <td>${entry.vendedor || '-'}</td>
                <td>${formatStatus(entry.status)}</td>
                <td>${formatDate(entry.created_at)}</td>
                ${currentUser.role === 'admin' ? `
                    <td>
                        <button class="btn-small btn-edit" onclick="editStatus(${entry.id}, '${entry.status}')">
                            Editar
                        </button>
                    </td>
                ` : ''}
            </tr>
        `).join('');
    }

    // Load charts
    async function loadCharts() {
        try {
            const filters = getFilters();
            await Promise.all([
                loadVendasChart(filters),
                loadRatingChart(filters)
            ]);
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    }

    // Load vendas chart
    async function loadVendasChart(filters) {
        try {
            const params = new URLSearchParams();
            if (filters.year) params.append('year', filters.year);
            if (filters.month) params.append('month', filters.month);
            if (filters.half) params.append('half', filters.half);
            
            const response = await fetch(`/api/charts/vendas?${params}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                renderVendasChart(data);
            }
        } catch (error) {
            console.error('Error loading vendas chart:', error);
        }
    }

    // Load rating chart
    async function loadRatingChart(filters) {
        try {
            const params = new URLSearchParams();
            if (filters.year) params.append('year', filters.year);
            if (filters.month) params.append('month', filters.month);
            if (filters.half) params.append('half', filters.half);
            
            const response = await fetch(`/api/charts/rating?${params}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                renderRatingChart(data);
            }
        } catch (error) {
            console.error('Error loading rating chart:', error);
        }
    }

    // Render vendas chart
    function renderVendasChart(data) {
        const ctx = document.getElementById('limpezasChart');
        
        if (window.vendasChart) {
            window.vendasChart.destroy();
        }
        
        window.vendasChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: 'Limpezas',
                    data: data.map(d => d.count),
                    borderColor: '#00ffff',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: '#333333'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: '#333333'
                        }
                    }
                }
            }
        });
    }

    // Render rating chart
    function renderRatingChart(data) {
        const ctx = document.getElementById('ratingsChart');
        
        if (window.ratingChart) {
            window.ratingChart.destroy();
        }
        
        window.ratingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [
                    {
                        label: 'Feitos',
                        data: data.map(d => d.feito),
                        backgroundColor: '#00ff88'
                    },
                    {
                        label: 'Não Feitos',
                        data: data.map(d => d.nao_feito),
                        backgroundColor: '#ff4444'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: '#333333'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: '#333333'
                        }
                    }
                }
            }
        });
    }

    // Get current filters
    function getFilters() {
        return {
            year: document.getElementById('filterYear').value,
            month: document.getElementById('filterMonth').value,
            half: document.getElementById('filterHalf').value
        };
    }

    // Global function for editing status (admin only)
    window.editStatus = function(entryId, currentStatus) {
        if (currentUser.role !== 'admin') return;
        
        const statuses = ['Restrição', 'Finalizado', 'Reprotocolo'];
        const newStatus = prompt(`Status atual: ${currentStatus}\n\nEscolha o novo status:\n1 - Restrição\n2 - Finalizado\n3 - Reprotocolo\n\nDigite o número:`);
        
        if (newStatus && newStatus >= 1 && newStatus <= 3) {
            const statusName = statuses[parseInt(newStatus) - 1];
            updateEntryStatus(entryId, statusName);
        }
    };

    // Update entry status
    async function updateEntryStatus(entryId, status) {
        try {
            const response = await fetch(`/api/entries/${entryId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status }),
                credentials: 'include'
            });
            
            if (response.ok) {
                alert('Status atualizado com sucesso!');
                loadDashboardData(); // Reload data
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao atualizar status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erro ao atualizar status: ' + error.message);
        }
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