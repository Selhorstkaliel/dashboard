// Cadastro functionality
document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;

    // Initialize
    init();

    async function init() {
        try {
            await checkAuth();
            await loadUserInfo();
            setupEventListeners();
            setupFormValidation();
            await loadVendedores();
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

    // Load vendedores for select options
    async function loadVendedores() {
        try {
            // For now, just add current user as option if they are a vendedor
            const vendedoresSelects = [
                'limpeza_vendedor',
                'pf_vendedor', 
                'pj_vendedor'
            ];

            vendedoresSelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Clear existing options except first
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    
                    // Add current user if vendedor
                    if (currentUser.role === 'vendedor') {
                        const option = document.createElement('option');
                        option.value = currentUser.username;
                        option.textContent = currentUser.name || currentUser.username;
                        option.selected = true;
                        select.appendChild(option);
                    }
                }
            });
        } catch (error) {
            console.error('Error loading vendedores:', error);
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Type selection buttons
        document.querySelectorAll('.btn-type').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.dataset.type;
                switchType(type);
            });
        });

        // Rating subtype buttons
        document.querySelectorAll('.btn-rating-type').forEach(btn => {
            btn.addEventListener('click', function() {
                const subtype = this.dataset.subtype;
                switchRatingSubtype(subtype);
            });
        });

        // Document type change handlers
        document.getElementById('limpeza_tipo_doc')?.addEventListener('change', function() {
            const docInput = document.getElementById('limpeza_documento');
            updateDocumentMask(docInput, this.value);
        });

        // Form submissions
        document.getElementById('limpezaForm')?.addEventListener('submit', handleLimpezaSubmit);
        document.getElementById('ratingPFForm')?.addEventListener('submit', handleRatingPFSubmit);
        document.getElementById('ratingPJForm')?.addEventListener('submit', handleRatingPJSubmit);

        // Reset buttons
        document.getElementById('limpezaReset')?.addEventListener('click', () => {
            document.getElementById('limpezaForm').reset();
        });
        
        document.getElementById('ratingPFReset')?.addEventListener('click', () => {
            document.getElementById('ratingPFForm').reset();
        });
        
        document.getElementById('ratingPJReset')?.addEventListener('click', () => {
            document.getElementById('ratingPJForm').reset();
        });
    }

    // Switch between Limpeza and Rating
    function switchType(type) {
        // Update buttons
        document.querySelectorAll('.btn-type').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // Show/hide forms
        document.getElementById('formLimpeza').classList.toggle('active', type === 'limpeza');
        document.getElementById('formRating').classList.toggle('active', type === 'rating');
    }

    // Switch between Rating PF and PJ
    function switchRatingSubtype(subtype) {
        // Update buttons
        document.querySelectorAll('.btn-rating-type').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtype === subtype);
        });

        // Show/hide subforms
        document.getElementById('ratingPF').classList.toggle('active', subtype === 'PF');
        document.getElementById('ratingPJ').classList.toggle('active', subtype === 'PJ');
    }

    // Setup form validation
    function setupFormValidation() {
        // Document validation
        const docInputs = [
            'limpeza_documento',
            'pf_cpf',
            'pj_cnpj'
        ];

        docInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('blur', validateDocument);
                input.addEventListener('input', formatDocumentInput);
            }
        });

        // Phone formatting
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(input => {
            input.addEventListener('input', formatPhoneInput);
        });

        // Money formatting
        const moneyInputs = document.querySelectorAll('.money-input');
        moneyInputs.forEach(input => {
            input.addEventListener('input', formatMoneyInput);
            input.addEventListener('blur', formatMoneyInput);
        });

        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', validateEmail);
        });
    }

    // Document validation
    async function validateDocument(event) {
        const input = event.target;
        const value = input.value;
        const feedbackDiv = input.parentElement.querySelector('.validation-feedback');

        if (!value) {
            updateValidationFeedback(feedbackDiv, '', '');
            return;
        }

        try {
            const response = await fetch(`/api/validate?doc=${encodeURIComponent(value)}`, {
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.valid) {
                updateValidationFeedback(feedbackDiv, `✓ ${result.type.toUpperCase()} válido`, 'valid');
                input.value = result.formatted;
            } else {
                updateValidationFeedback(feedbackDiv, `✗ ${result.type ? result.type.toUpperCase() : 'Documento'} inválido`, 'invalid');
            }
        } catch (error) {
            console.error('Validation error:', error);
            updateValidationFeedback(feedbackDiv, 'Erro na validação', 'invalid');
        }
    }

    // Update validation feedback
    function updateValidationFeedback(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `validation-feedback ${type}`;
    }

    // Format document input
    function formatDocumentInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^\d]/g, '');
        
        // Auto-detect type and format
        if (value.length <= 11) {
            // CPF formatting
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else {
            // CNPJ formatting  
            value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        
        input.value = value;
    }

    // Update document mask based on type
    function updateDocumentMask(input, type) {
        if (!input) return;
        
        if (type === 'cpf') {
            input.placeholder = '000.000.000-00';
            input.maxLength = 14;
        } else if (type === 'cnpj') {
            input.placeholder = '00.000.000/0000-00';
            input.maxLength = 18;
        }
    }

    // Format phone input
    function formatPhoneInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^\d]/g, '');
        
        if (value.length <= 10) {
            value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        
        input.value = value;
    }

    // Format money input
    function formatMoneyInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^\d]/g, '');
        
        if (!value) {
            input.value = '';
            return;
        }
        
        // Convert to cents then to reais
        const cents = parseInt(value);
        const reais = cents / 100;
        
        input.value = reais.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    // Email validation
    function validateEmail(event) {
        const input = event.target;
        const value = input.value;
        
        if (!value) return;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (emailRegex.test(value)) {
            input.classList.remove('invalid');
            input.classList.add('valid');
        } else {
            input.classList.remove('valid');
            input.classList.add('invalid');
        }
    }

    // Handle Limpeza form submission
    async function handleLimpezaSubmit(event) {
        event.preventDefault();
        
        try {
            showLoading(true);
            
            const formData = new FormData(event.target);

            const response = await fetch('/api/entries', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert('Cadastro de limpeza salvo com sucesso!');
                
                if (result.contract_url) {
                    const downloadContract = confirm('Contrato gerado com sucesso! Deseja fazer o download agora?');
                    if (downloadContract) {
                        window.open(result.contract_url, '_blank');
                    }
                }
                
                event.target.reset();
            } else {
                throw new Error(result.error || 'Erro ao salvar cadastro');
            }
            
        } catch (error) {
            console.error('Error saving limpeza:', error);
            alert('Erro ao salvar cadastro: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    // Handle Rating PF form submission
    async function handleRatingPFSubmit(event) {
        event.preventDefault();
        
        try {
            showLoading(true);
            
            const formData = new FormData(event.target);
            
            // Check if terms are accepted
            if (!formData.get('aceito_termos')) {
                alert('Você deve aceitar os termos e condições.');
                return;
            }

            // Add form metadata
            formData.append('type', 'rating');
            formData.append('subtype', 'PF');

            const response = await fetch('/api/entries', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert('Cadastro de rating PF salvo com sucesso!');
                
                if (result.contract_url) {
                    const downloadContract = confirm('Contrato gerado com sucesso! Deseja fazer o download agora?');
                    if (downloadContract) {
                        window.open(result.contract_url, '_blank');
                    }
                }
                
                event.target.reset();
            } else {
                throw new Error(result.error || 'Erro ao salvar cadastro');
            }
            
        } catch (error) {
            console.error('Error saving rating PF:', error);
            alert('Erro ao salvar cadastro: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    // Handle Rating PJ form submission  
    async function handleRatingPJSubmit(event) {
        event.preventDefault();
        
        try {
            showLoading(true);
            
            const formData = new FormData(event.target);
            
            // Check if terms are accepted
            if (!formData.get('aceito_termos')) {
                alert('Você deve aceitar os termos e condições.');
                return;
            }

            // Add form metadata
            formData.append('type', 'rating');
            formData.append('subtype', 'PJ');

            const response = await fetch('/api/entries', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert('Cadastro de rating PJ salvo com sucesso!');
                
                if (result.contract_url) {
                    const downloadContract = confirm('Contrato gerado com sucesso! Deseja fazer o download agora?');
                    if (downloadContract) {
                        window.open(result.contract_url, '_blank');
                    }
                }
                
                event.target.reset();
            } else {
                throw new Error(result.error || 'Erro ao salvar cadastro');
            }
            
        } catch (error) {
            console.error('Error saving rating PJ:', error);
            alert('Erro ao salvar cadastro: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    // Parse money value to number
    function parseMoney(value) {
        if (!value) return 0;
        
        // Remove currency formatting and convert to number
        const cleanValue = value.toString()
            .replace(/[^\d,]/g, '')
            .replace(',', '.');
        
        return parseFloat(cleanValue) || 0;
    }

    // Show/hide loading overlay
    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
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