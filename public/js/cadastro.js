// Cadastro functionality for LimitClean Dashboard

class CadastroManager {
    constructor() {
        this.currentUser = null;
        this.contractUrl = null;
        this.servicePrices = {
            'limpeza': 150.00,
            'rating_pf': 200.00,
            'rating_pj': 350.00
        };
        
        this.init();
    }

    async init() {
        try {
            this.currentUser = await checkAuth();
            this.setupUserInfo();
            this.setupEventListeners();
            this.setupFormValidation();
            this.loadUserDiscount();
        } catch (error) {
            console.error('Cadastro initialization error:', error);
        }
    }

    setupUserInfo() {
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        
        if (this.currentUser) {
            userAvatar.textContent = this.currentUser.name.charAt(0).toUpperCase();
            userName.textContent = this.currentUser.name;
            
            // Set default vendedor
            document.getElementById('vendedor').value = this.currentUser.name;
        }
    }

    setupEventListeners() {
        const form = document.getElementById('cadastroForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Document type change
        document.querySelectorAll('input[name="doc_type"]').forEach(radio => {
            radio.addEventListener('change', () => this.toggleDocumentType());
        });

        // Service type change
        document.getElementById('tipo').addEventListener('change', () => this.updatePricing());

        // File upload previews
        this.setupFileUploadPreviews();
    }

    setupFileUploadPreviews() {
        ['selfie', 'cnhRg', 'docPj'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', (e) => this.previewFile(e, id));
            }
        });
    }

    previewFile(event, inputId) {
        const file = event.target.files[0];
        const label = document.querySelector(`label[for="${inputId}"]`);
        
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Arquivo muito grande. Máximo 5MB.', 'warning');
                event.target.value = '';
                return;
            }
            
            label.innerHTML = `✅ ${file.name}`;
            label.style.borderColor = 'var(--accent-success)';
            label.style.backgroundColor = 'rgba(63, 185, 80, 0.1)';
        } else {
            this.resetFileLabel(inputId);
        }
    }

    resetFileLabel(inputId) {
        const label = document.querySelector(`label[for="${inputId}"]`);
        const defaultTexts = {
            'selfie': '📷 Clique para enviar selfie',
            'cnhRg': '🆔 Clique para enviar documento',
            'docPj': '📄 Clique para enviar documentos'
        };
        
        label.innerHTML = defaultTexts[inputId];
        label.style.borderColor = 'var(--border-primary)';
        label.style.backgroundColor = 'var(--bg-tertiary)';
    }

    setupFormValidation() {
        // Real-time validation for document
        const docInput = document.getElementById('documento');
        docInput.addEventListener('input', (e) => {
            this.formatDocument(e.target);
            this.validateDocumentInput();
        });

        // Phone formatting
        const phoneInput = document.getElementById('telefone');
        phoneInput.addEventListener('input', (e) => {
            formatPhone(e.target);
        });

        // CEP formatting and lookup
        const cepInput = document.getElementById('cep');
        cepInput.addEventListener('input', (e) => {
            this.formatCEP(e.target);
        });
        cepInput.addEventListener('blur', () => this.buscarCEP());

        // Currency formatting for values
        ['valorBruto', 'desconto'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', (e) => {
                this.formatCurrency(e.target);
                this.calculateValues();
            });
        });
    }

    toggleDocumentType() {
        const docType = document.querySelector('input[name="doc_type"]:checked')?.value;
        const pfFields = document.getElementById('pfFields');
        const pjFields = document.getElementById('pjFields');
        const cnhRgLabel = document.getElementById('cnhRgLabel');
        const docPjGroup = document.getElementById('docPjGroup');
        const docLabel = document.getElementById('docLabel');

        // Reset document field
        document.getElementById('documento').value = '';
        document.getElementById('docValidation').textContent = '';

        if (docType === 'cpf') {
            pfFields.classList.remove('d-none');
            pjFields.classList.add('d-none');
            docPjGroup.classList.add('d-none');
            docLabel.textContent = 'CPF *';
            cnhRgLabel.textContent = 'CNH ou RG *';
            document.getElementById('documento').placeholder = '000.000.000-00';
        } else if (docType === 'cnpj') {
            pfFields.classList.add('d-none');
            pjFields.classList.remove('d-none');
            docPjGroup.classList.remove('d-none');
            docLabel.textContent = 'CNPJ *';
            cnhRgLabel.textContent = 'RG do Responsável *';
            document.getElementById('documento').placeholder = '00.000.000/0000-00';
        }

        this.updatePricing();
    }

    formatDocument(input) {
        const docType = document.querySelector('input[name="doc_type"]:checked')?.value;
        let value = input.value.replace(/\D/g, '');

        if (docType === 'cpf') {
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (docType === 'cnpj') {
            value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }

        input.value = value;
    }

    async validateDocumentInput() {
        const docInput = document.getElementById('documento');
        const docValidation = document.getElementById('docValidation');
        
        if (docInput.value.length < 11) {
            docValidation.textContent = '';
            return;
        }

        try {
            const response = await fetch(`/api/validate?doc=${encodeURIComponent(docInput.value)}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro na validação');

            const result = await response.json();
            
            if (result.valid) {
                docValidation.innerHTML = `✅ <span class="text-success">${result.type.toUpperCase()} válido</span>`;
                docInput.value = result.formatted;
            } else {
                docValidation.innerHTML = `❌ <span class="text-danger">Documento inválido</span>`;
            }

        } catch (error) {
            docValidation.innerHTML = `⚠️ <span class="text-warning">Erro na validação</span>`;
        }
    }

    formatCEP(input) {
        let value = input.value.replace(/\D/g, '');
        value = value.replace(/(\d{5})(\d{3})/, '$1-$2');
        input.value = value;
    }

    async buscarCEP() {
        const cepInput = document.getElementById('cep');
        const cep = cepInput.value.replace(/\D/g, '');

        if (cep.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('endereco').value = `${data.logradouro}, ${data.bairro}`;
                document.getElementById('cidade').value = data.localidade;
                document.getElementById('estado').value = data.uf;
                showNotification('Endereço encontrado!', 'success', 2000);
            }

        } catch (error) {
            console.error('CEP lookup error:', error);
        }
    }

    formatCurrency(input) {
        let value = input.value.replace(/\D/g, '');
        value = (value / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        input.value = value;
    }

    updatePricing() {
        const serviceType = document.getElementById('tipo').value;
        const docType = document.querySelector('input[name="doc_type"]:checked')?.value;
        
        let basePrice = 0;
        
        if (serviceType === 'limpeza') {
            basePrice = this.servicePrices.limpeza;
        } else if (serviceType === 'rating_pf' && docType === 'cpf') {
            basePrice = this.servicePrices.rating_pf;
        } else if (serviceType === 'rating_pj' && docType === 'cnpj') {
            basePrice = this.servicePrices.rating_pj;
        }

        if (basePrice > 0) {
            const valorBrutoInput = document.getElementById('valorBruto');
            valorBrutoInput.value = basePrice.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            this.calculateValues();
        }
    }

    async loadUserDiscount() {
        try {
            const response = await fetch('/api/profile', {
                credentials: 'include'
            });

            if (response.ok) {
                const profile = await response.json();
                const userDiscount = profile.discount_value || 0;
                
                if (userDiscount > 0) {
                    // Apply user's default discount
                    setTimeout(() => {
                        const valorBruto = this.parseValueFromInput('valorBruto');
                        if (valorBruto > 0) {
                            const discountAmount = (valorBruto * userDiscount) / 100;
                            document.getElementById('desconto').value = discountAmount.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                            this.calculateValues();
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error loading user discount:', error);
        }
    }

    calculateValues() {
        const valorBruto = this.parseValueFromInput('valorBruto');
        const desconto = this.parseValueFromInput('desconto');
        
        const valorLiquido = Math.max(0, valorBruto - desconto);
        
        document.getElementById('valorLiquido').value = valorLiquido.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Add glow effect to valor líquido
        const valorLiquidoInput = document.getElementById('valorLiquido');
        valorLiquidoInput.classList.add('glow');
        setTimeout(() => {
            valorLiquidoInput.classList.remove('glow');
        }, 1000);
    }

    parseValueFromInput(inputId) {
        const input = document.getElementById(inputId);
        const value = input.value.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(value) || 0;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            const formData = new FormData(document.getElementById('cadastroForm'));
            
            // Convert currency values
            formData.set('valor_bruto', this.parseValueFromInput('valorBruto'));
            formData.set('desconto_aplicado', this.parseValueFromInput('desconto'));
            formData.set('valor_liquido', this.parseValueFromInput('valorLiquido'));

            const response = await fetch('/api/entries', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.contractUrl = result.contract;
                this.showSuccessModal(result);
            } else {
                throw new Error(result.error || 'Erro no cadastro');
            }

        } catch (error) {
            console.error('Submit error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    validateForm() {
        const requiredFields = [
            'tipo', 'documento', 'nome', 'telefone', 'vendedor',
            'valorBruto', 'valorLiquido'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                this.showError(`Campo obrigatório não preenchido: ${field?.labels?.[0]?.textContent || fieldId}`);
                field?.focus();
                return false;
            }
        }

        // Validate document type selection
        const docType = document.querySelector('input[name="doc_type"]:checked');
        if (!docType) {
            this.showError('Selecione o tipo de documento (CPF ou CNPJ)');
            return false;
        }

        // Validate files
        const selfie = document.getElementById('selfie').files[0];
        const cnhRg = document.getElementById('cnhRg').files[0];

        if (!selfie) {
            this.showError('Selfie é obrigatória');
            return false;
        }

        if (!cnhRg) {
            this.showError('Documento de identidade é obrigatório');
            return false;
        }

        // Validate document
        const docValidation = document.getElementById('docValidation');
        if (!docValidation.textContent.includes('válido')) {
            this.showError('Documento inválido ou não validado');
            document.getElementById('documento').focus();
            return false;
        }

        return true;
    }

    setLoadingState(loading) {
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');
        const form = document.getElementById('cadastroForm');

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

    showSuccessModal(result) {
        const modal = document.getElementById('successModal');
        const modalBody = document.getElementById('successModalBody');
        const downloadBtn = document.getElementById('downloadContractBtn');

        let message = `
            <div class="text-center">
                <h4>🎉 Cadastro #${result.id} criado com sucesso!</h4>
                <p>Todos os dados foram salvos de forma segura e criptografada.</p>
            </div>
        `;

        if (result.contract) {
            message += `
                <div class="alert alert-success">
                    <strong>✅ Contrato gerado!</strong><br>
                    O contrato em PDF foi gerado automaticamente e está disponível para download.
                </div>
            `;
            downloadBtn.style.display = 'block';
        }

        modalBody.innerHTML = message;
        modal.classList.add('active');
    }

    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 8000);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    clearForm() {
        const form = document.getElementById('cadastroForm');
        form.reset();
        
        // Reset custom states
        document.getElementById('pfFields').classList.add('d-none');
        document.getElementById('pjFields').classList.add('d-none');
        document.getElementById('docValidation').textContent = '';
        
        // Reset file labels
        ['selfie', 'cnhRg', 'docPj'].forEach(id => {
            this.resetFileLabel(id);
        });

        // Reset vendedor to current user
        document.getElementById('vendedor').value = this.currentUser?.name || '';

        showNotification('Formulário limpo!', 'info', 2000);
    }

    closeSuccessModal() {
        document.getElementById('successModal').classList.remove('active');
    }

    newCadastro() {
        this.closeSuccessModal();
        this.clearForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    downloadContract() {
        if (this.contractUrl) {
            window.open(this.contractUrl, '_blank');
        } else {
            showNotification('Link do contrato não disponível', 'warning');
        }
    }
}

// Global functions for HTML onclick events
window.toggleDocumentType = () => window.cadastro?.toggleDocumentType();
window.validateDocument = () => window.cadastro?.validateDocumentInput();
window.buscarCEP = () => window.cadastro?.buscarCEP();
window.formatDocument = (input) => window.cadastro?.formatDocument(input);
window.formatCurrency = (input) => window.cadastro?.formatCurrency(input);
window.calculateValues = () => window.cadastro?.calculateValues();
window.updatePricing = () => window.cadastro?.updatePricing();
window.clearForm = () => window.cadastro?.clearForm();
window.closeSuccessModal = () => window.cadastro?.closeSuccessModal();
window.newCadastro = () => window.cadastro?.newCadastro();
window.downloadContract = () => window.cadastro?.downloadContract();
window.formatCEP = (input) => window.cadastro?.formatCEP(input);

// Initialize cadastro manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cadastro = new CadastroManager();
});