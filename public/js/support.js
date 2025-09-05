class SupportAPI {
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

    static async getTickets() {
        return this.request('/api/tickets');
    }

    static async createTicket(ticketData) {
        return this.request('/api/tickets', {
            method: 'POST',
            body: ticketData
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
        const response = await SupportAPI.validateToken();
        currentUser = response.user;
        
        // Update user info in header
        document.getElementById('user-name').textContent = currentUser.username;
        
        // Load tickets
        await loadTickets();
        
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

async function loadTickets() {
    try {
        const tickets = await SupportAPI.getTickets();
        renderTicketsList(tickets);
    } catch (error) {
        showAlert('Erro ao carregar tickets: ' + error.message);
    }
}

function renderTicketsList(tickets) {
    const container = document.getElementById('tickets-list');
    
    if (tickets.length === 0) {
        container.innerHTML = '<p>Nenhum ticket encontrado.</p>';
        return;
    }
    
    let html = '';
    tickets.forEach(ticket => {
        const statusClass = ticket.status === 'open' ? 'alert-danger' : 
                           ticket.status === 'resolved' ? 'alert-success' : 'alert-secondary';
        
        html += `
            <div class="alert ${statusClass}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>#${ticket.id} - ${ticket.subject}</strong>
                        <br>
                        <small>Prioridade: ${ticket.priority} | Status: ${ticket.status}</small>
                        <br>
                        <small>Criado em: ${new Date(ticket.created_at).toLocaleString('pt-BR')}</small>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    ${ticket.message}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Back button handler
    document.getElementById('back-btn').addEventListener('click', function() {
        window.location.href = '/dashboard';
    });
    
    // Ticket form handler
    document.getElementById('ticketForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const ticketData = {
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value,
            priority: document.getElementById('priority').value
        };
        
        try {
            await SupportAPI.createTicket(ticketData);
            showAlert('Ticket criado com sucesso!', 'success');
            this.reset();
            
            // Refresh tickets list
            await loadTickets();
            
        } catch (error) {
            showAlert(error.message);
        }
    });
});