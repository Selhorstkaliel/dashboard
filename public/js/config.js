// Configuration functionality for LimitClean Dashboard

class ConfigManager {
    constructor() {
        this.currentUser = null;
        this.representatives = [];
        this.init();
    }

    async init() {
        try {
            this.currentUser = await checkAuth();
            this.setupUserInfo();
            this.setupEventListeners();
            this.loadUserProfile();
            this.setupRoleBasedAccess();
        } catch (error) {
            console.error('Config initialization error:', error);
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
        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // New user form
        const newUserForm = document.getElementById('newUserForm');
        if (newUserForm) {
            newUserForm.addEventListener('submit', (e) => this.handleNewUser(e));
        }

        // Edit user form  
        const editUserForm = document.getElementById('editUserForm');
        if (editUserForm) {
            editUserForm.addEventListener('submit', (e) => this.handleEditUser(e));
        }

        // Role change handler
        const newRole = document.getElementById('newRole');
        if (newRole) {
            newRole.addEventListener('change', () => this.toggleRepSelect());
        }
    }

    setupRoleBasedAccess() {
        const userManagementCard = document.getElementById('userManagementCard');
        const discountCard = document.getElementById('discountCard');
        const systemCard = document.getElementById('systemCard');

        if (this.currentUser.role === 'admin') {
            userManagementCard.style.display = 'block';
            discountCard.style.display = 'block';
            systemCard.style.display = 'block';
            this.loadUsers();
        } else if (this.currentUser.role === 'representante') {
            userManagementCard.style.display = 'block';
            discountCard.style.display = 'block';
            this.loadUsers();
        } else {
            discountCard.style.display = 'block';
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro ao carregar perfil');

            const profile = await response.json();
            this.populateProfileForm(profile);

        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Erro ao carregar perfil');
        }
    }

    populateProfileForm(profile) {
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profilePhone').value = profile.phone || '';
        document.getElementById('profileRole').value = this.formatRole(profile.role);
        document.getElementById('userDiscount').value = profile.discount_value || 0;
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const profileData = Object.fromEntries(formData);

        // Remove empty fields
        Object.keys(profileData).forEach(key => {
            if (!profileData[key]) {
                delete profileData[key];
            }
        });

        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('Perfil atualizado com sucesso!');
                
                // Update header if name changed
                if (profileData.name) {
                    document.getElementById('userName').textContent = profileData.name;
                    document.getElementById('userAvatar').textContent = profileData.name.charAt(0).toUpperCase();
                }
                
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                
            } else {
                throw new Error(result.error || 'Erro ao atualizar perfil');
            }

        } catch (error) {
            console.error('Profile update error:', error);
            this.showError(error.message);
        }
    }

    async loadUsers() {
        if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'representante') {
            return;
        }

        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro ao carregar usuários');

            const users = await response.json();
            this.renderUsersTable(users);
            this.loadRepresentatives(users);

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Erro ao carregar usuários');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        
        // Filter users based on role
        let filteredUsers = users;
        if (this.currentUser.role === 'representante') {
            // Representante only sees vendedores under them
            filteredUsers = users.filter(u => 
                u.rep_id === this.currentUser.id || 
                u.id === this.currentUser.id
            );
        }

        if (filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        Nenhum usuário encontrado
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="status-badge status-${user.role}">${this.formatRole(user.role)}</span></td>
                <td>${user.discount_value}%</td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="config.editUser(${user.id})">
                        ✏️ Editar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    loadRepresentatives(users) {
        this.representatives = users.filter(u => u.role === 'representante');
        
        const repSelect = document.getElementById('newRepId');
        repSelect.innerHTML = '<option value="">Selecione o representante</option>';
        
        this.representatives.forEach(rep => {
            repSelect.innerHTML += `<option value="${rep.id}">${rep.name}</option>`;
        });
    }

    openNewUserModal() {
        const modal = document.getElementById('newUserModal');
        modal.classList.add('active');
        
        // Reset form
        document.getElementById('newUserForm').reset();
        this.toggleRepSelect();
    }

    closeNewUserModal() {
        document.getElementById('newUserModal').classList.remove('active');
    }

    toggleRepSelect() {
        const role = document.getElementById('newRole').value;
        const repGroup = document.getElementById('repSelectGroup');
        
        if (role === 'vendedor') {
            repGroup.style.display = 'block';
        } else {
            repGroup.style.display = 'none';
        }
    }

    async handleNewUser(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData);

        // Validate required fields
        const required = ['username', 'name', 'email', 'phone', 'role', 'password'];
        for (const field of required) {
            if (!userData[field]) {
                this.showError(`Campo obrigatório: ${field}`);
                return;
            }
        }

        // Validate representante selection for vendedor
        if (userData.role === 'vendedor' && !userData.rep_id) {
            this.showError('Selecione um representante para o vendedor');
            return;
        }

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('Usuário criado com sucesso!');
                this.closeNewUserModal();
                this.loadUsers();
            } else {
                throw new Error(result.error || 'Erro ao criar usuário');
            }

        } catch (error) {
            console.error('Create user error:', error);
            this.showError(error.message);
        }
    }

    editUser(userId) {
        // Find user in current list
        const users = Array.from(document.querySelectorAll('#usersTableBody tr')).map((row, index) => {
            const cells = row.querySelectorAll('td');
            return {
                name: cells[0]?.textContent,
                email: cells[1]?.textContent,
                // This is a simplified approach - in production, you'd store the user data
            };
        });

        // For now, show edit modal with basic functionality
        const modal = document.getElementById('editUserModal');
        document.getElementById('editUserId').value = userId;
        modal.classList.add('active');
    }

    closeEditUserModal() {
        document.getElementById('editUserModal').classList.remove('active');
    }

    async handleEditUser(e) {
        e.preventDefault();
        
        // This would implement user editing functionality
        this.showError('Funcionalidade de edição em desenvolvimento');
    }

    async deleteUser() {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) {
            return;
        }
        
        // This would implement user deletion functionality
        this.showError('Funcionalidade de exclusão em desenvolvimento');
    }

    async runScheduler() {
        if (this.currentUser.role !== 'admin') {
            this.showError('Apenas administradores podem executar o scheduler');
            return;
        }

        try {
            const response = await fetch('/api/scheduler/run', {
                method: 'POST',
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('Atualização automática executada com sucesso!');
            } else {
                throw new Error(result.message || 'Erro ao executar scheduler');
            }

        } catch (error) {
            console.error('Scheduler error:', error);
            this.showError(error.message);
        }
    }

    showSystemInfo() {
        const systemInfo = document.getElementById('systemInfo');
        const systemInfoContent = document.getElementById('systemInfoContent');
        
        if (systemInfo.classList.contains('d-none')) {
            systemInfoContent.innerHTML = `
                <div class="mb-2"><strong>Usuário:</strong> ${this.currentUser.name} (${this.formatRole(this.currentUser.role)})</div>
                <div class="mb-2"><strong>Última atualização:</strong> ${new Date().toLocaleString('pt-BR')}</div>
                <div class="mb-2"><strong>Status:</strong> <span class="text-success">Sistema operacional</span></div>
                <div class="mb-2"><strong>Versão:</strong> 1.0.0</div>
            `;
            systemInfo.classList.remove('d-none');
        } else {
            systemInfo.classList.add('d-none');
        }
    }

    // Utility functions
    formatRole(role) {
        const roles = {
            'admin': 'Administrador',
            'representante': 'Representante', 
            'vendedor': 'Vendedor'
        };
        return roles[role] || role;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    showSuccess(message) {
        const successAlert = document.getElementById('successAlert');
        const successMessage = document.getElementById('successMessage');
        
        successMessage.textContent = message;
        successAlert.classList.remove('d-none');
        
        setTimeout(() => {
            successAlert.classList.add('d-none');
        }, 5000);
    }

    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 5000);
    }
}

// Global functions for HTML onclick events  
window.openNewUserModal = () => window.config?.openNewUserModal();
window.closeNewUserModal = () => window.config?.closeNewUserModal();
window.toggleRepSelect = () => window.config?.toggleRepSelect();
window.closeEditUserModal = () => window.config?.closeEditUserModal();
window.createUser = () => {
    const form = document.getElementById('newUserForm');
    form.dispatchEvent(new Event('submit'));
};
window.updateUser = () => {
    const form = document.getElementById('editUserForm');
    form.dispatchEvent(new Event('submit'));
};
window.deleteUser = () => window.config?.deleteUser();
window.runScheduler = () => window.config?.runScheduler();
window.showSystemInfo = () => window.config?.showSystemInfo();

// Initialize config manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.config = new ConfigManager();
});