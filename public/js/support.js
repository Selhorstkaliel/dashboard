// Support functionality for LimitClean Dashboard

class SupportManager {
    constructor() {
        this.currentUser = null;
        this.tickets = [];
        this.init();
    }

    async init() {
        try {
            this.currentUser = await checkAuth();
            this.setupUserInfo();
            this.setupEventListeners();
            this.setupFAQ();
            this.loadTickets();
        } catch (error) {
            console.error('Support initialization error:', error);
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
        // Ticket form submission
        const ticketForm = document.getElementById('ticketForm');
        if (ticketForm) {
            ticketForm.addEventListener('submit', (e) => this.handleTicketSubmit(e));
        }

        // File upload preview
        const anexoInput = document.getElementById('anexo');
        if (anexoInput) {
            anexoInput.addEventListener('change', (e) => this.previewAttachment(e));
        }

        // Modal close on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeTicketModal();
            }
        });
    }

    setupFAQ() {
        // FAQ functionality is handled by CSS and onclick events in HTML
    }

    previewAttachment(event) {
        const file = event.target.files[0];
        const label = document.querySelector('label[for="anexo"]');
        
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Arquivo muito grande. Máximo 5MB.', 'warning');
                event.target.value = '';
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'text/plain', 
                                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            
            if (!allowedTypes.includes(file.type)) {
                showNotification('Tipo de arquivo não permitido.', 'warning');
                event.target.value = '';
                return;
            }
            
            label.innerHTML = `✅ ${file.name}`;
            label.style.borderColor = 'var(--accent-success)';
            label.style.backgroundColor = 'rgba(63, 185, 80, 0.1)';
        } else {
            this.resetAttachmentLabel();
        }
    }

    resetAttachmentLabel() {
        const label = document.querySelector('label[for="anexo"]');
        label.innerHTML = '📎 Clique para anexar arquivo (imagem, PDF ou documento)';
        label.style.borderColor = 'var(--border-primary)';
        label.style.backgroundColor = 'var(--bg-tertiary)';
    }

    async handleTicketSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitTicketBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');

        // Validate required fields
        const categoria = document.getElementById('categoria').value;
        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;

        if (!categoria || !titulo || !descricao) {
            this.showError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if (titulo.length < 5) {
            this.showError('Título deve ter pelo menos 5 caracteres.');
            return;
        }

        if (descricao.length < 10) {
            this.showError('Descrição deve ter pelo menos 10 caracteres.');
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            const formData = new FormData(e.target);
            
            const response = await fetch('/api/tickets', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess();
                this.clearForm();
                this.loadTickets(); // Refresh tickets list
            } else {
                throw new Error(result.error || 'Erro ao criar chamado');
            }

        } catch (error) {
            console.error('Ticket submit error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(loading) {
        const submitBtn = document.getElementById('submitTicketBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');
        const form = document.getElementById('ticketForm');

        if (loading) {
            submitBtn.disabled = true;
            submitText.classList.add('d-none');
            submitSpinner.classList.remove('d-none');
            form.style.opacity = '0.7';
        } else {
            submitBtn.disabled = false;
            submitText.classList.remove('d-none');
            submitSpinner.classList.add('d-none');
            form.style.opacity = '1';
        }
    }

    clearForm() {
        const form = document.getElementById('ticketForm');
        form.reset();
        this.resetAttachmentLabel();
    }

    async loadTickets() {
        try {
            const response = await fetch('/api/tickets', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro ao carregar chamados');

            this.tickets = await response.json();
            this.renderTicketsTable();

        } catch (error) {
            console.error('Error loading tickets:', error);
            this.renderTicketsTable([]);
        }
    }

    renderTicketsTable(tickets = this.tickets) {
        const tbody = document.getElementById('ticketsTableBody');
        
        if (!tickets || tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        Nenhum chamado encontrado
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = tickets.map(ticket => `
            <tr>
                <td>#${ticket.id}</td>
                <td>
                    <span class="table-link" onclick="support.viewTicket(${ticket.id})">
                        ${ticket.titulo}
                    </span>
                </td>
                <td>
                    <span class="category-badge category-${ticket.categoria}">
                        ${this.formatCategory(ticket.categoria)}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${ticket.status === 'aberto' ? 'pendente' : ticket.status}">
                        ${this.formatStatus(ticket.status)}
                    </span>
                </td>
                <td>${this.formatDate(ticket.created_at)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="support.viewTicket(${ticket.id})">
                        👁️ Ver
                    </button>
                </td>
            </tr>
        `).join('');
    }

    viewTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const modal = document.getElementById('ticketModal');
        const modalBody = document.getElementById('ticketModalBody');

        modalBody.innerHTML = `
            <div class="mb-3">
                <h4>${ticket.titulo}</h4>
                <div class="d-flex gap-2 mb-2">
                    <span class="category-badge category-${ticket.categoria}">
                        ${this.formatCategory(ticket.categoria)}
                    </span>
                    <span class="status-badge status-${ticket.status === 'aberto' ? 'pendente' : ticket.status}">
                        ${this.formatStatus(ticket.status)}
                    </span>
                </div>
                <small class="text-muted">Criado em ${this.formatDateTime(ticket.created_at)}</small>
            </div>
            
            <div class="mb-3">
                <h5>Descrição</h5>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; white-space: pre-wrap;">
${ticket.descricao}
                </div>
            </div>
            
            ${ticket.attachment_path ? `
                <div class="mb-3">
                    <h5>Anexo</h5>
                    <a href="/api/uploads/${ticket.attachment_path}" target="_blank" class="btn btn-secondary">
                        📎 Ver Anexo
                    </a>
                </div>
            ` : ''}
            
            <div class="alert alert-info">
                <strong>Status:</strong> ${this.getStatusMessage(ticket.status)}<br>
                ${ticket.status === 'aberto' ? 
                    'Nossa equipe analisará seu chamado em breve. Você será notificado sobre atualizações.' :
                    'Este chamado foi resolvido. Se precisar de mais ajuda, abra um novo chamado.'
                }
            </div>
        `;

        modal.classList.add('active');
    }

    closeTicketModal() {
        document.getElementById('ticketModal').classList.remove('active');
    }

    // FAQ functionality
    toggleFAQ(questionElement) {
        const faqItem = questionElement.closest('.faq-item');
        const answer = faqItem.querySelector('.faq-answer');
        const toggle = faqItem.querySelector('.faq-toggle');
        
        if (answer.classList.contains('d-none')) {
            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                if (item !== faqItem) {
                    item.classList.remove('active');
                    item.querySelector('.faq-answer').classList.add('d-none');
                }
            });
            
            // Open this item
            faqItem.classList.add('active');
            answer.classList.remove('d-none');
        } else {
            // Close this item
            faqItem.classList.remove('active');
            answer.classList.add('d-none');
        }
    }

    // Utility functions
    formatCategory(categoria) {
        const categories = {
            'tecnico': 'Técnico',
            'financeiro': 'Financeiro',
            'bug': 'Bug',
            'geral': 'Geral'
        };
        return categories[categoria] || categoria;
    }

    formatStatus(status) {
        const statuses = {
            'aberto': 'Aberto',
            'em_andamento': 'Em Andamento',
            'resolvido': 'Resolvido',
            'fechado': 'Fechado'
        };
        return statuses[status] || status;
    }

    getStatusMessage(status) {
        const messages = {
            'aberto': 'Aguardando análise da equipe de suporte',
            'em_andamento': 'Sendo analisado pela equipe técnica',
            'resolvido': 'Chamado resolvido pela equipe',
            'fechado': 'Chamado encerrado'
        };
        return messages[status] || 'Status desconhecido';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('pt-BR');
    }

    showSuccess() {
        const successAlert = document.getElementById('successAlert');
        successAlert.classList.remove('d-none');
        
        setTimeout(() => {
            successAlert.classList.add('d-none');
        }, 8000);
    }

    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 8000);
    }
}

// Global functions for HTML onclick events
window.loadTickets = () => window.support?.loadTickets();
window.closeTicketModal = () => window.support?.closeTicketModal();
window.toggleFAQ = (element) => window.support?.toggleFAQ(element);

// Initialize support manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.support = new SupportManager();
});

// Add FAQ styling and interaction
document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers to FAQ questions that don't use onclick
    document.querySelectorAll('.faq-question').forEach(question => {
        if (!question.hasAttribute('onclick')) {
            question.addEventListener('click', () => {
                window.support?.toggleFAQ(question);
            });
        }
    });
});