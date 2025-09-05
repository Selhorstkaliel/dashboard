// Support functionality
document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;

    // Initialize
    init();

    async function init() {
        try {
            await checkAuth();
            await loadUserInfo();
            setupEventListeners();
            await loadTickets();
        } catch (error) {
            console.error('Initialization error:', error);
            window.location.href = '/login.html';
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
    }

    // Setup event listeners
    function setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Ticket form
        document.getElementById('ticketForm').addEventListener('submit', handleTicketSubmit);
    }

    // Handle ticket submission
    async function handleTicketSubmit(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            
            const response = await fetch('/api/tickets', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert('Chamado criado com sucesso!');
                event.target.reset();
                await loadTickets(); // Reload tickets
            } else {
                throw new Error(result.error || 'Erro ao criar chamado');
            }
            
        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Erro ao criar chamado: ' + error.message);
        }
    }

    // Load user tickets
    async function loadTickets() {
        try {
            const response = await fetch('/api/tickets', {
                credentials: 'include'
            });

            if (response.ok) {
                const tickets = await response.json();
                displayTickets(tickets);
            } else {
                throw new Error('Failed to load tickets');
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            document.getElementById('ticketsList').innerHTML = `
                <div class="no-tickets">Erro ao carregar chamados.</div>
            `;
        }
    }

    // Display tickets
    function displayTickets(tickets) {
        const container = document.getElementById('ticketsList');
        
        if (!tickets || tickets.length === 0) {
            container.innerHTML = `
                <div class="no-tickets">Nenhum chamado encontrado.</div>
            `;
            return;
        }

        container.innerHTML = tickets.map(ticket => `
            <div class="ticket-card">
                <div class="ticket-header">
                    <h4>${ticket.titulo}</h4>
                    <span class="ticket-status status-${ticket.status}">
                        ${getStatusText(ticket.status)}
                    </span>
                </div>
                <div class="ticket-body">
                    <p>${ticket.descricao}</p>
                    ${ticket.attachment_path ? `
                        <div class="ticket-attachment">
                            <a href="/uploads/${ticket.attachment_path}" target="_blank">
                                📎 Ver Anexo
                            </a>
                        </div>
                    ` : ''}
                </div>
                <div class="ticket-footer">
                    <small>Criado em: ${formatDate(ticket.created_at)}</small>
                    ${ticket.updated_at !== ticket.created_at ? `
                        <small>Atualizado em: ${formatDate(ticket.updated_at)}</small>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Get status text
    function getStatusText(status) {
        const statusMap = {
            'aberto': 'Aberto',
            'em_andamento': 'Em Andamento',
            'fechado': 'Fechado'
        };
        return statusMap[status] || status;
    }

    // Format date
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
            window.location.href = '/login.html';
        }
    }
});