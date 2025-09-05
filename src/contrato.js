const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

class ContractGenerator {
    constructor() {
        this.contractsPath = path.join(__dirname, '..', 'contracts');
    }

    async generateContract(userData) {
        try {
            const pdfDoc = await PDFDocument.create();
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const page = pdfDoc.addPage([595, 842]); // A4 size
            const { width, height } = page.getSize();

            let yPosition = height - 50;

            // Header
            page.drawText('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', {
                x: 50,
                y: yPosition,
                size: 16,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0),
            });

            yPosition -= 30;
            page.drawText('LIMITCLEAN LIMPEZA E RATING', {
                x: 50,
                y: yPosition,
                size: 14,
                font: helveticaBoldFont,
                color: rgb(0.2, 0.4, 0.8),
            });

            yPosition -= 50;

            // Contract content
            const contractText = this.getContractTemplate(userData);
            const lines = contractText.split('\n');

            for (const line of lines) {
                if (yPosition < 100) {
                    // Add new page if needed
                    const newPage = pdfDoc.addPage([595, 842]);
                    yPosition = height - 50;
                }

                const fontSize = line.startsWith('CLÁUSULA') || line.startsWith('DADOS') ? 12 : 10;
                const font = line.startsWith('CLÁUSULA') || line.startsWith('DADOS') ? helveticaBoldFont : helveticaFont;

                page.drawText(line, {
                    x: 50,
                    y: yPosition,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                    maxWidth: width - 100,
                });

                yPosition -= fontSize === 12 ? 20 : 15;
            }

            // Signature section
            yPosition -= 30;
            page.drawText('ASSINATURAS:', {
                x: 50,
                y: yPosition,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0),
            });

            yPosition -= 40;
            page.drawText('_________________________________', {
                x: 50,
                y: yPosition,
                size: 10,
                font: helveticaFont,
                color: rgb(0, 0, 0),
            });

            yPosition -= 15;
            page.drawText('CONTRATANTE: ' + userData.nome, {
                x: 50,
                y: yPosition,
                size: 10,
                font: helveticaFont,
                color: rgb(0, 0, 0),
            });

            page.drawText('_________________________________', {
                x: 350,
                y: yPosition + 15,
                size: 10,
                font: helveticaFont,
                color: rgb(0, 0, 0),
            });

            page.drawText('LIMITCLEAN LIMPEZA E RATING', {
                x: 350,
                y: yPosition,
                size: 10,
                font: helveticaFont,
                color: rgb(0, 0, 0),
            });

            // Generate PDF bytes
            const pdfBytes = await pdfDoc.save();

            // Save to contracts folder
            const filename = `contrato_${userData.doc}_${Date.now()}.pdf`;
            const filepath = path.join(this.contractsPath, filename);

            await fs.writeFile(filepath, pdfBytes);

            return {
                filename,
                filepath,
                success: true
            };

        } catch (error) {
            console.error('Erro ao gerar contrato:', error);
            throw new Error('Falha na geração do contrato: ' + error.message);
        }
    }

    getContractTemplate(userData) {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        return `
DADOS DO CONTRATANTE:
Nome: ${userData.nome}
${userData.tipo === 'pf' ? 'CPF' : 'CNPJ'}: ${userData.doc}
Telefone: ${userData.telefone}
E-mail: ${userData.email || 'Não informado'}
Endereço: ${userData.endereco || 'Não informado'}

DADOS DO SERVIÇO:
Tipo de Serviço: ${userData.tipo_servico}
Valor Bruto: R$ ${userData.valor_bruto}
Desconto Aplicado: R$ ${userData.desconto_aplicado}
Valor Líquido: R$ ${userData.valor_liquido}
Data do Contrato: ${currentDate}
Vendedor Responsável: ${userData.vendedor}

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de ${userData.tipo_servico} pela empresa LIMITCLEAN LIMPEZA E RATING, conforme especificações acordadas entre as partes.

CLÁUSULA 2ª - DO VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ ${userData.valor_liquido}, já aplicado o desconto de R$ ${userData.desconto_aplicado} sobre o valor bruto de R$ ${userData.valor_bruto}.

CLÁUSULA 3ª - DAS OBRIGAÇÕES DA CONTRATADA
A LIMITCLEAN obriga-se a:
- Prestar os serviços com qualidade e pontualidade;
- Utilizar equipamentos e produtos adequados;
- Manter sigilo sobre informações confidenciais;
- Cumprir todas as normas de segurança aplicáveis.

CLÁUSULA 4ª - DAS OBRIGAÇÕES DO CONTRATANTE
O contratante obriga-se a:
- Efetuar o pagamento nas datas acordadas;
- Fornecer acesso adequado ao local dos serviços;
- Comunicar qualquer alteração necessária com antecedência;
- Manter a área de trabalho em condições adequadas.

CLÁUSULA 5ª - DA VIGÊNCIA
Este contrato tem vigência a partir da data de assinatura e permanece válido conforme os termos acordados entre as partes.

CLÁUSULA 6ª - DAS DISPOSIÇÕES GERAIS
Qualquer alteração neste contrato deve ser feita por escrito e acordada entre ambas as partes. O presente contrato é regido pelas leis brasileiras.

Por estarem de acordo com os termos acima, as partes assinam o presente contrato em duas vias de igual teor e forma.

${userData.cidade || 'São Paulo'}, ${currentDate}
        `.trim();
    }

    async getContract(filename) {
        try {
            const filepath = path.join(this.contractsPath, filename);
            const pdfBytes = await fs.readFile(filepath);
            return pdfBytes;
        } catch (error) {
            throw new Error('Contrato não encontrado');
        }
    }

    async listContracts() {
        try {
            const files = await fs.readdir(this.contractsPath);
            return files.filter(file => file.endsWith('.pdf'));
        } catch (error) {
            return [];
        }
    }

    async deleteContract(filename) {
        try {
            const filepath = path.join(this.contractsPath, filename);
            await fs.unlink(filepath);
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new ContractGenerator();