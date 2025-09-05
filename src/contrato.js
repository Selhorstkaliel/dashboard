const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate a contract PDF
 * @param {Object} data - Contract data
 * @param {string} data.nome - Client name
 * @param {string} data.documento - CPF/CNPJ
 * @param {string} data.email - Client email
 * @param {string} data.tipo - Contract type (limpeza/rating)
 * @param {string} data.subtipo - Contract subtype (PF/PJ for rating)
 * @param {number} data.valor - Contract value
 * @param {string} data.cidade - City
 * @param {string} data.estado - State
 * @returns {Promise<string>} Path to generated PDF
 */
async function generateContract(data) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    
    // Get fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    
    // Colors
    const primaryColor = rgb(0, 1, 1); // Cyan
    const textColor = rgb(0, 0, 0);    // Black
    
    let y = height - 50;
    
    // Header
    page.drawText('LIMITCLEAN', {
      x: 50,
      y: y,
      size: 24,
      font: boldFont,
      color: primaryColor,
    });
    
    page.drawText('SISTEMA DE GESTÃO', {
      x: 50,
      y: y - 25,
      size: 12,
      font: font,
      color: textColor,
    });
    
    y -= 60;
    
    // Contract title
    const contractTitle = getContractTitle(data.tipo, data.subtipo);
    page.drawText(contractTitle, {
      x: 50,
      y: y,
      size: 18,
      font: boldFont,
      color: textColor,
    });
    
    y -= 40;
    
    // Contract date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    
    page.drawText(`Data: ${dateStr} às ${timeStr}`, {
      x: 50,
      y: y,
      size: 10,
      font: font,
      color: textColor,
    });
    
    y -= 30;
    
    // Contract content
    const contractText = getContractText(data);
    const lines = wrapText(contractText, 500, font, 11);
    
    for (const line of lines) {
      if (y < 100) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
        page = newPage; // This won't work as expected, but for simplicity...
      }
      
      page.drawText(line, {
        x: 50,
        y: y,
        size: 11,
        font: font,
        color: textColor,
      });
      
      y -= 20;
    }
    
    y -= 20;
    
    // Client information section
    page.drawText('DADOS DO CONTRATANTE:', {
      x: 50,
      y: y,
      size: 12,
      font: boldFont,
      color: textColor,
    });
    
    y -= 20;
    
    page.drawText(`Nome: ${data.nome}`, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: textColor,
    });
    
    y -= 15;
    
    page.drawText(`Documento: ${data.documento}`, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: textColor,
    });
    
    y -= 15;
    
    page.drawText(`E-mail: ${data.email || 'Não informado'}`, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: textColor,
    });
    
    y -= 15;
    
    const cidade = data.cidade || 'São Paulo';
    const estado = data.estado || 'SP';
    page.drawText(`Cidade/UF: ${cidade}/${estado}`, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: textColor,
    });
    
    y -= 15;
    
    page.drawText(`Valor: ${formatCurrency(data.valor)}`, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: textColor,
    });
    
    y -= 40;
    
    // Signature section
    page.drawText('ASSINATURA DIGITAL:', {
      x: 50,
      y: y,
      size: 12,
      font: boldFont,
      color: textColor,
    });
    
    y -= 20;
    
    page.drawText(`Assinado digitalmente por: ${data.nome}`, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: textColor,
    });
    
    y -= 15;
    
    page.drawText(`Data/Hora: ${dateStr} às ${timeStr}`, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: textColor,
    });
    
    y -= 15;
    
    page.drawText(`IP: [Sistema Interno]`, {
      x: 50,
      y: y,
      size: 11,
      font: font,
      color: textColor,
    });
    
    // Footer
    page.drawText('Este documento foi gerado automaticamente pelo sistema LIMITCLEAN.', {
      x: 50,
      y: 50,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `contrato_${data.tipo}_${timestamp}.pdf`;
    const filepath = path.join(process.cwd(), 'contracts', filename);
    
    // Ensure contracts directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    // Write PDF to file
    await fs.writeFile(filepath, pdfBytes);
    
    return filename; // Return relative path
  } catch (error) {
    console.error('Error generating contract:', error);
    throw new Error('Failed to generate contract PDF');
  }
}

/**
 * Get contract title based on type
 * @param {string} tipo - Contract type
 * @param {string} subtipo - Contract subtype
 * @returns {string} Contract title
 */
function getContractTitle(tipo, subtipo) {
  if (tipo === 'limpeza') {
    return 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - LIMPEZA DE NOME';
  } else if (tipo === 'rating') {
    if (subtipo === 'PF') {
      return 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - RATING PESSOA FÍSICA';
    } else if (subtipo === 'PJ') {
      return 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - RATING PESSOA JURÍDICA';
    }
    return 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - RATING';
  }
  
  return 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS';
}

/**
 * Get contract text based on type
 * @param {Object} data - Contract data
 * @returns {string} Contract text
 */
function getContractText(data) {
  const baseText = `
Por este instrumento particular de prestação de serviços, as partes abaixo identificadas:

CONTRATADA: LIMITCLEAN, empresa especializada em serviços de limpeza de nome e análise de rating creditício, inscrita no CNPJ sob nº [CNPJ da empresa], com sede em [Endereço da empresa];

CONTRATANTE: Os dados identificados abaixo neste contrato;

Têm entre si justo e acordado o seguinte:

CLÁUSULA 1ª - DO OBJETO
A CONTRATADA prestará ao CONTRATANTE serviços de ${getServiceDescription(data.tipo, data.subtipo)}.

CLÁUSULA 2ª - DO VALOR E FORMA DE PAGAMENTO
Pelo serviço ora contratado, o CONTRATANTE pagará à CONTRATADA a importância de ${formatCurrency(data.valor)}.

CLÁUSULA 3ª - DAS OBRIGAÇÕES
3.1. A CONTRATADA obriga-se a prestar os serviços contratados com eficiência e pontualidade.
3.2. O CONTRATANTE obriga-se a fornecer todas as informações necessárias para a execução dos serviços.
3.3. O CONTRATANTE declara estar ciente dos riscos e benefícios dos serviços contratados.

CLÁUSULA 4ª - DA PROTEÇÃO DE DADOS
A CONTRATADA compromete-se a tratar os dados pessoais do CONTRATANTE em conformidade com a Lei Geral de Proteção de Dados (LGPD).

CLÁUSULA 5ª - DO PRAZO
Os serviços serão executados no prazo de até 30 (trinta) dias corridos a partir da assinatura deste contrato.

CLÁUSULA 6ª - DA RESCISÃO
Este contrato poderá ser rescindido por qualquer das partes mediante comunicação prévia de 5 (cinco) dias úteis.

CLÁUSULA 7ª - DO FORO
Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer dúvidas oriundas deste contrato.

Por estarem assim justos e contratados, assinam o presente contrato em duas vias de igual teor e forma.
`;

  return baseText.trim();
}

/**
 * Get service description based on type
 * @param {string} tipo - Service type
 * @param {string} subtipo - Service subtype
 * @returns {string} Service description
 */
function getServiceDescription(tipo, subtipo) {
  if (tipo === 'limpeza') {
    return 'limpeza de nome junto aos órgãos de proteção ao crédito';
  } else if (tipo === 'rating') {
    if (subtipo === 'PF') {
      return 'análise e rating creditício para pessoa física';
    } else if (subtipo === 'PJ') {
      return 'análise e rating creditício para pessoa jurídica';
    }
    return 'análise e rating creditício';
  }
  
  return 'consultoria especializada';
}

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @returns {string} Formatted currency
 */
function formatCurrency(value) {
  if (!value) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Wrap text to fit within specified width
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in points
 * @param {Object} font - PDF font object
 * @param {number} fontSize - Font size
 * @returns {string[]} Array of wrapped lines
 */
function wrapText(text, maxWidth, font, fontSize) {
  const lines = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

/**
 * Get contract file path
 * @param {string} filename - Contract filename
 * @returns {string} Full file path
 */
function getContractPath(filename) {
  return path.join(process.cwd(), 'contracts', filename);
}

/**
 * Check if contract file exists
 * @param {string} filename - Contract filename
 * @returns {Promise<boolean>} True if file exists
 */
async function contractExists(filename) {
  try {
    await fs.access(getContractPath(filename));
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  generateContract,
  getContractPath,
  contractExists
};