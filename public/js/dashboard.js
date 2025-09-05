// Dashboard functionality for LimitClean Dashboard

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.currentPage = 1;
        this.currentFilters = {};
        this.refreshInterval = null;
        this.charts = {};
        this.selectedEntryId = null;
        
        this.init();
    }

    async init() {
        try {
            this.currentUser = await checkAuth();
            this.setupUserInfo();
            this.setupEventListeners();
            await this.loadDashboardData();
            this.setupAutoRefresh();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
        }
    }

    setupUserInfo() {
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        
        if (this.currentUser) {
            userAvatar.textContent = this.currentUser.name.charAt(0).toUpperCase();
            userName.textContent = this.currentUser.name;
        }
    }

    setupEventListeners() {
        // Chart period change
        const chartPeriod = document.getElementById('chartPeriod');
        if (chartPeriod) {
            chartPeriod.addEventListener('change', () => this.updateCharts());
        }

        // Filter inputs
        ['filterStatus', 'filterType', 'filterVendedor', 'searchInput'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    clearTimeout(this.filterTimeout);
                    this.filterTimeout = setTimeout(() => this.applyFilters(), 500);
                });
            }
        });

        // Modal close on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModals();
            }
        });
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadKPIs(),
                this.loadEntries(),
                this.loadCharts()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showNotification('Erro ao carregar dados do dashboard', 'danger');
        }
    }

    async loadKPIs() {
        try {
            const response = await fetch('/api/stats', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro ao carregar estatísticas');

            const stats = await response.json();
            
            // Update KPI cards
            document.getElementById('limpezaCount').textContent = stats.vendas_limpeza?.count || 0;
            document.getElementById('ratingCount').textContent = stats.vendas_rating?.count || 0;
            document.getElementById('totalBruto').textContent = this.formatCurrency(stats.totals?.total_bruto || 0);
            document.getElementById('totalLiquido').textContent = this.formatCurrency(stats.totals?.total_liquido || 0);

        } catch (error) {
            console.error('Error loading KPIs:', error);
        }
    }

    async loadEntries() {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: 20,
                ...this.currentFilters
            });

            const response = await fetch(`/api/entries?${queryParams}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro ao carregar entradas');

            const data = await response.json();
            this.renderEntriesTable(data.entries);
            this.updatePagination(data);

        } catch (error) {
            console.error('Error loading entries:', error);
            this.renderEntriesTable([]);
        }
    }

    renderEntriesTable(entries) {
        const tbody = document.getElementById('entriesTableBody');
        
        if (entries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">
                        Nenhum cadastro encontrado
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = entries.map(entry => `
            <tr>
                <td>
                    <span class="table-link" onclick="dashboard.openEntryDetails(${entry.id})">
                        ${entry.nome}
                    </span>
                </td>
                <td>${this.formatDocument(entry.doc, entry.doc_type)}</td>
                <td>${this.formatType(entry.type)}</td>
                <td>${entry.vendedor}</td>
                <td>${this.formatCurrency(entry.valor_bruto)}</td>
                <td>${this.formatCurrency(entry.valor_liquido)}</td>
                <td><span class="status-badge status-${entry.status}">${this.formatStatus(entry.status)}</span></td>
                <td>${this.formatDate(entry.created_at)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="dashboard.openEntryDetails(${entry.id})">
                        Ver
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async openEntryDetails(entryId) {
        if (this.currentUser.role !== 'admin') {
            showNotification('Apenas administradores podem ver detalhes completos', 'warning');
            return;
        }

        this.selectedEntryId = entryId;
        const modal = document.getElementById('entryModal');
        const modalBody = document.getElementById('entryModalBody');
        const editStatusBtn = document.getElementById('editStatusBtn');

        modal.classList.add('active');
        modalBody.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        if (this.currentUser.role === 'admin') {
            editStatusBtn.style.display = 'block';
        }

        try {
            const response = await fetch(`/api/entries/${entryId}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro ao carregar detalhes');

            const entry = await response.json();
            this.renderEntryDetails(entry);

        } catch (error) {
            console.error('Error loading entry details:', error);
            modalBody.innerHTML = `<div class="alert alert-danger">Erro ao carregar detalhes: ${error.message}</div>`;
        }
    }

    renderEntryDetails(entry) {
        const modalBody = document.getElementById('entryModalBody');
        
        const sensitiveData = entry.sensitive_data || {};
        
        modalBody.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <h4>📋 Dados Básicos</h4>
                    <div class="mb-3">
                        <strong>Nome:</strong> ${entry.nome}<br>
                        <strong>Documento:</strong> ${this.formatDocument(entry.doc, entry.doc_type)}<br>
                        <strong>Telefone:</strong> ${entry.telefone}<br>
                        <strong>E-mail:</strong> ${sensitiveData.email || 'Não informado'}<br>
                        <strong>Tipo:</strong> ${this.formatType(entry.type)}<br>
                        <strong>Vendedor:</strong> ${entry.vendedor}
                    </div>

                    <h4>🏠 Endereço</h4>
                    <div class="mb-3">
                        <strong>CEP:</strong> ${sensitiveData.cep || 'Não informado'}<br>
                        <strong>Endereço:</strong> ${sensitiveData.endereco || 'Não informado'}<br>
                        <strong>Cidade:</strong> ${sensitiveData.cidade || 'Não informado'}<br>
                        <strong>Estado:</strong> ${sensitiveData.estado || 'Não informado'}
                    </div>
                </div>

                <div>
                    <h4>💰 Valores</h4>
                    <div class="mb-3">
                        <strong>Valor Bruto:</strong> ${this.formatCurrency(entry.valor_bruto)}<br>
                        <strong>Desconto:</strong> ${this.formatCurrency(entry.desconto_aplicado)}<br>
                        <strong>Valor Líquido:</strong> ${this.formatCurrency(entry.valor_liquido)}<br>
                        <strong>Status:</strong> <span class="status-badge status-${entry.status}">${this.formatStatus(entry.status)}</span>
                    </div>

                    <h4>📅 Datas</h4>
                    <div class="mb-3">
                        <strong>Cadastrado em:</strong> ${this.formatDateTime(entry.created_at)}<br>
                        <strong>Atualizado em:</strong> ${this.formatDateTime(entry.updated_at)}
                    </div>
                </div>
            </div>

            ${entry.doc_type === 'cpf' ? `
                <h4>👤 Dados Pessoa Física</h4>
                <div class="mb-3">
                    <strong>RG:</strong> ${sensitiveData.rg || 'Não informado'}<br>
                    <strong>Data Nascimento:</strong> ${sensitiveData.data_nascimento ? this.formatDate(sensitiveData.data_nascimento) : 'Não informada'}
                </div>
            ` : `
                <h4>🏢 Dados Pessoa Jurídica</h4>
                <div class="mb-3">
                    <strong>Razão Social:</strong> ${sensitiveData.razao_social || 'Não informada'}<br>
                    <strong>Nome Fantasia:</strong> ${sensitiveData.nome_fantasia || 'Não informado'}<br>
                    <strong>Inscrição Estadual:</strong> ${sensitiveData.inscricao_estadual || 'Não informada'}<br>
                    <strong>Inscrição Municipal:</strong> ${sensitiveData.inscricao_municipal || 'Não informada'}
                </div>
            `}

            ${entry.attachments && entry.attachments.length > 0 ? `
                <h4>📎 Anexos</h4>
                <div class="d-flex gap-2 flex-wrap">
                    ${entry.attachments.map(att => `
                        <a href="/api/uploads/${att.filename}" target="_blank" class="btn btn-secondary btn-sm">
                            📄 ${att.original_name}
                        </a>
                    `).join('')}
                </div>
            ` : ''}

            ${entry.contract_filename ? `
                <h4>📋 Contrato</h4>
                <a href="/api/contracts/${entry.contract_filename}" target="_blank" class="btn btn-success">
                    📄 Download Contrato PDF
                </a>
            ` : ''}
        `;
    }

    async loadCharts() {
        try {
            const period = document.getElementById('chartPeriod').value;
            const response = await fetch(`/api/charts/vendas?period=${period}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro ao carregar dados dos gráficos');

            const data = await response.json();
            this.renderCharts(data);

        } catch (error) {
            console.error('Error loading charts:', error);
        }
    }

    renderCharts(data) {
        // Sales Chart
        this.renderSalesChart(data);
        
        // Status Chart
        this.renderStatusChart();
    }

    renderSalesChart(data) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        const periods = [...new Set(data.map(d => d.period))];
        const limpezaData = periods.map(p => {
            const item = data.find(d => d.period === p && d.type === 'limpeza');
            return item ? item.total : 0;
        });
        const ratingData = periods.map(p => {
            const pf = data.find(d => d.period === p && d.type === 'rating_pf');
            const pj = data.find(d => d.period === p && d.type === 'rating_pj');
            return (pf?.total || 0) + (pj?.total || 0);
        });

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periods,
                datasets: [{
                    label: 'Limpeza',
                    data: limpezaData,
                    borderColor: 'rgb(0, 212, 170)',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Rating',
                    data: ratingData,
                    borderColor: 'rgb(9, 132, 227)',
                    backgroundColor: 'rgba(9, 132, 227, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#f0f6fc' }
                    }
                },
                scales: {
                    x: { 
                        ticks: { color: '#8b949e' },
                        grid: { color: '#30363d' }
                    },
                    y: { 
                        ticks: { color: '#8b949e' },
                        grid: { color: '#30363d' }
                    }
                }
            }
        });
    }

    async renderStatusChart() {
        try {
            const response = await fetch('/api/stats', {
                credentials: 'include'
            });

            if (!response.ok) return;

            const stats = await response.json();
            const statusData = stats.status_distribution || [];

            const ctx = document.getElementById('statusChart');
            if (!ctx) return;

            if (this.charts.status) {
                this.charts.status.destroy();
            }

            const colors = {
                'pendente': '#ffab00',
                'processando': '#0984e3',
                'concluido': '#3fb950',
                'cancelado': '#f85149'
            };

            this.charts.status = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: statusData.map(s => this.formatStatus(s.status)),
                    datasets: [{
                        data: statusData.map(s => s.count),
                        backgroundColor: statusData.map(s => colors[s.status] || '#8b949e'),
                        borderWidth: 2,
                        borderColor: '#161b22'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#f0f6fc' }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading status chart:', error);
        }
    }

    // Event handlers
    updateCharts() {
        this.loadCharts();
    }

    applyFilters() {
        this.currentFilters = {
            status: document.getElementById('filterStatus').value,
            type: document.getElementById('filterType').value,
            vendedor: document.getElementById('filterVendedor').value,
            search: document.getElementById('searchInput').value
        };
        
        // Remove empty filters
        Object.keys(this.currentFilters).forEach(key => {
            if (!this.currentFilters[key]) {
                delete this.currentFilters[key];
            }
        });

        this.currentPage = 1;
        this.loadEntries();
    }

    clearFilters() {
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterVendedor').value = '';
        document.getElementById('searchInput').value = '';
        
        this.currentFilters = {};
        this.currentPage = 1;
        this.loadEntries();
    }

    changePage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.loadEntries();
    }

    refreshData() {
        this.loadDashboardData();
        showNotification('Dados atualizados!', 'success', 2000);
    }

    exportData() {
        // Future enhancement: export to CSV/Excel
        showNotification('Funcionalidade de exportação em desenvolvimento', 'info');
    }

    closeEntryModal() {
        document.getElementById('entryModal').classList.remove('active');
    }

    editEntryStatus() {
        if (!this.selectedEntryId) return;
        
        const statusModal = document.getElementById('statusModal');
        statusModal.classList.add('active');
    }

    closeStatusModal() {
        document.getElementById('statusModal').classList.remove('active');
    }

    async updateStatus() {
        if (!this.selectedEntryId) return;

        const newStatus = document.getElementById('newStatus').value;
        const observacao = document.getElementById('statusObservacao').value;

        if (!newStatus) {
            showNotification('Selecione um status', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/entries/${this.selectedEntryId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus, observacao })
            });

            if (!response.ok) throw new Error('Erro ao atualizar status');

            showNotification('Status atualizado com sucesso!', 'success');
            this.closeStatusModal();
            this.closeEntryModal();
            this.loadEntries();

        } catch (error) {
            console.error('Error updating status:', error);
            showNotification('Erro ao atualizar status', 'danger');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    updatePagination(data) {
        const showingInfo = document.getElementById('showingInfo');
        const pageInfo = document.getElementById('pageInfo');
        
        showingInfo.textContent = `${data.entries.length} registros`;
        pageInfo.textContent = `Página ${data.page}`;

        // Update last update time
        const lastUpdate = document.getElementById('lastUpdate');
        lastUpdate.textContent = `Última atualização: ${new Date().toLocaleTimeString()}`;
    }

    setupAutoRefresh() {
        // Refresh every 60 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 60000);
    }

    // Utility functions
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatDocument(doc, type) {
        if (!doc) return '';
        
        const numbers = doc.replace(/\D/g, '');
        
        if (type === 'cpf' && numbers.length === 11) {
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (type === 'cnpj' && numbers.length === 14) {
            return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        
        return doc;
    }

    formatType(type) {
        const types = {
            'limpeza': 'Limpeza',
            'rating_pf': 'Rating PF',
            'rating_pj': 'Rating PJ'
        };
        return types[type] || type;
    }

    formatStatus(status) {
        const statuses = {
            'pendente': 'Pendente',
            'processando': 'Processando',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado'
        };
        return statuses[status] || status;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('pt-BR');
    }
}

// Global dashboard instance
window.dashboard = null;

// Global functions for HTML onclick events
window.applyFilters = () => dashboard?.applyFilters();
window.clearFilters = () => dashboard?.clearFilters();
window.changePage = (direction) => dashboard?.changePage(direction);
window.refreshData = () => dashboard?.refreshData();
window.exportData = () => dashboard?.exportData();
window.closeEntryModal = () => dashboard?.closeEntryModal();
window.editEntryStatus = () => dashboard?.editEntryStatus();
window.closeStatusModal = () => dashboard?.closeStatusModal();
window.updateStatus = () => dashboard?.updateStatus();

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
});