const Joi = require('joi');

class Validators {
    constructor() {
        this.schemas = this.initializeSchemas();
    }

    initializeSchemas() {
        return {
            // User login schema
            userLogin: Joi.object({
                username: Joi.string().required(),
                password: Joi.string().required()
            }),

            // Entry registration schema
            entryRegistration: Joi.object({
                type: Joi.string().valid('limpeza', 'rating_pf', 'rating_pj').required(),
                doc: Joi.string().required(),
                doc_type: Joi.string().valid('cpf', 'cnpj').required(),
                nome: Joi.string().min(2).max(200).required(),
                telefone: Joi.string().pattern(/^(\(\d{2}\)\s)?\d{4,5}-?\d{4}$/).required(),
                email: Joi.string().email().optional(),
                endereco: Joi.string().max(500).optional(),
                cidade: Joi.string().max(100).optional(),
                estado: Joi.string().length(2).optional(),
                cep: Joi.string().pattern(/^\d{5}-?\d{3}$/).optional(),
                vendedor: Joi.string().min(2).max(100).required(),
                valor_bruto: Joi.number().positive().required(),
                desconto_aplicado: Joi.number().min(0).required(),
                valor_liquido: Joi.number().positive().required(),
                // PF specific fields
                rg: Joi.when('doc_type', {
                    is: 'cpf',
                    then: Joi.string().optional(),
                    otherwise: Joi.forbidden()
                }),
                data_nascimento: Joi.when('doc_type', {
                    is: 'cpf',
                    then: Joi.date().optional(),
                    otherwise: Joi.forbidden()
                }),
                // PJ specific fields
                razao_social: Joi.when('doc_type', {
                    is: 'cnpj',
                    then: Joi.string().max(200).optional(),
                    otherwise: Joi.forbidden()
                }),
                nome_fantasia: Joi.when('doc_type', {
                    is: 'cnpj',
                    then: Joi.string().max(200).optional(),
                    otherwise: Joi.forbidden()
                }),
                inscricao_estadual: Joi.when('doc_type', {
                    is: 'cnpj',
                    then: Joi.string().optional(),
                    otherwise: Joi.forbidden()
                }),
                inscricao_municipal: Joi.when('doc_type', {
                    is: 'cnpj',
                    then: Joi.string().optional(),
                    otherwise: Joi.forbidden()
                })
            }),

            // Status update schema
            statusUpdate: Joi.object({
                status: Joi.string().valid('pendente', 'processando', 'concluido', 'cancelado').required(),
                observacao: Joi.string().max(1000).optional()
            }),

            // Support ticket schema
            supportTicket: Joi.object({
                titulo: Joi.string().min(5).max(200).required(),
                descricao: Joi.string().min(10).max(2000).required(),
                categoria: Joi.string().valid('tecnico', 'financeiro', 'geral', 'bug').default('geral')
            }),

            // Search filters schema
            searchFilters: Joi.object({
                status: Joi.string().valid('pendente', 'processando', 'concluido', 'cancelado').optional(),
                type: Joi.string().valid('limpeza', 'rating_pf', 'rating_pj').optional(),
                vendedor: Joi.string().max(100).optional(),
                doc_type: Joi.string().valid('cpf', 'cnpj').optional(),
                date_start: Joi.date().optional(),
                date_end: Joi.date().optional(),
                search: Joi.string().max(200).optional(),
                page: Joi.number().integer().min(1).default(1),
                limit: Joi.number().integer().min(1).max(100).default(20)
            })
        };
    }

    // Validate user login
    validateUserLogin(data) {
        return this.schemas.userLogin.validate(data, { abortEarly: false });
    }

    // Validate entry registration
    validateEntryRegistration(data) {
        return this.schemas.entryRegistration.validate(data, { abortEarly: false });
    }

    // Validate status update
    validateStatusUpdate(data) {
        return this.schemas.statusUpdate.validate(data, { abortEarly: false });
    }

    // Validate support ticket
    validateSupportTicket(data) {
        return this.schemas.supportTicket.validate(data, { abortEarly: false });
    }

    // Validate search filters
    validateSearchFilters(data) {
        return this.schemas.searchFilters.validate(data, { abortEarly: false });
    }

    // CPF validation
    validateCPF(cpf) {
        if (!cpf) return false;
        
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
            return false;
        }

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf[i]) * (10 - i);
        }
        let checkDigit1 = 11 - (sum % 11);
        if (checkDigit1 >= 10) checkDigit1 = 0;

        if (parseInt(cpf[9]) !== checkDigit1) {
            return false;
        }

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf[i]) * (11 - i);
        }
        let checkDigit2 = 11 - (sum % 11);
        if (checkDigit2 >= 10) checkDigit2 = 0;

        return parseInt(cpf[10]) === checkDigit2;
    }

    // CNPJ validation
    validateCNPJ(cnpj) {
        if (!cnpj) return false;
        
        cnpj = cnpj.replace(/[^\d]/g, '');
        
        if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
            return false;
        }

        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cnpj[i]) * weights1[i];
        }
        let checkDigit1 = 11 - (sum % 11);
        if (checkDigit1 >= 10) checkDigit1 = 0;

        if (parseInt(cnpj[12]) !== checkDigit1) {
            return false;
        }

        sum = 0;
        for (let i = 0; i < 13; i++) {
            sum += parseInt(cnpj[i]) * weights2[i];
        }
        let checkDigit2 = 11 - (sum % 11);
        if (checkDigit2 >= 10) checkDigit2 = 0;

        return parseInt(cnpj[13]) === checkDigit2;
    }

    // Validate document based on type
    validateDocument(doc, type) {
        if (type === 'cpf') {
            return this.validateCPF(doc);
        } else if (type === 'cnpj') {
            return this.validateCNPJ(doc);
        }
        return false;
    }

    // Format document
    formatDocument(doc, type) {
        if (!doc) return '';
        const numbers = doc.replace(/\D/g, '');
        
        if (type === 'cpf' && numbers.length === 11) {
            return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
        } else if (type === 'cnpj' && numbers.length === 14) {
            return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
        }
        
        return doc;
    }
}

module.exports = new Validators();