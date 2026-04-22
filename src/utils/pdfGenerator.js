/**
 * Gerador de PDF de contratos usando pdfmake
 */
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

/**
 * Converte texto com \n em array de parágrafos para pdfmake
 */
const textToParagraphs = (text) => {
  if (!text) return [];
  return text.split('\n').map(line => ({
    text: line || ' ',
    fontSize: 11,
    lineHeight: 1.4,
    margin: [0, 0, 0, 2]
  }));
};

/**
 * Gera o docDefinition para pdfmake
 */
const buildDocDefinition = (filledText, escola = {}, templateName = '') => {
  const escolaNome = escola.name || 'Escola de Condução';
  const escolaMorada = escola.address || '';
  const escolaTel = escola.number || escola.phone || '';
  const escolaEmail = escola.email || '';

  const headerParts = [escolaNome];
  if (escolaMorada) headerParts.push(escolaMorada);
  const contactParts = [];
  if (escolaTel) contactParts.push(escolaTel);
  if (escolaEmail) contactParts.push(escolaEmail);

  return {
    pageSize: 'A4',
    pageMargins: [50, 100, 50, 60],
    header: {
      margin: [50, 20, 50, 0],
      stack: [
        {
          text: escolaNome,
          fontSize: 14,
          bold: true,
          color: '#2c3e50',
          alignment: 'center',
          margin: [0, 0, 0, 4]
        },
        escolaMorada ? {
          text: escolaMorada,
          fontSize: 9,
          color: '#7f8c8d',
          alignment: 'center',
          margin: [0, 0, 0, 2]
        } : null,
        contactParts.length > 0 ? {
          text: contactParts.join(' | '),
          fontSize: 9,
          color: '#7f8c8d',
          alignment: 'center',
          margin: [0, 0, 0, 4]
        } : null,
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: '#ecf0f1' }
          ],
          margin: [0, 4, 0, 0]
        }
      ].filter(Boolean)
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: templateName || 'Contrato',
          fontSize: 8,
          color: '#95a5a6',
          alignment: 'left',
          margin: [50, 0, 0, 0]
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          fontSize: 8,
          color: '#95a5a6',
          alignment: 'right',
          margin: [0, 0, 50, 0]
        }
      ],
      margin: [0, 20, 0, 0]
    }),
    content: textToParagraphs(filledText),
    defaultStyle: {
      font: 'Roboto'
    }
  };
};

/**
 * Gera e faz download do PDF do contrato
 * @param {string} filledText - Texto do contrato com placeholders já substituídos
 * @param {object} escola - Dados da escola (para header)
 * @param {string} templateName - Nome do template (para footer)
 * @param {string} fileName - Nome do ficheiro PDF
 */
export const generateContractPdf = (filledText, escola = {}, templateName = '', fileName = 'contrato.pdf') => {
  const docDefinition = buildDocDefinition(filledText, escola, templateName);
  pdfMake.createPdf(docDefinition).download(fileName);
};

/**
 * Gera o PDF e retorna como blob URL para preview
 * @param {string} filledText - Texto do contrato com placeholders já substituídos
 * @param {object} escola - Dados da escola (para header)
 * @param {string} templateName - Nome do template (para footer)
 * @returns {Promise<string>} URL do blob para embed/iframe
 */
export const previewContractPdf = (filledText, escola = {}, templateName = '') => {
  return new Promise((resolve, reject) => {
    try {
      const docDefinition = buildDocDefinition(filledText, escola, templateName);
      pdfMake.createPdf(docDefinition).getBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      });
    } catch (error) {
      reject(error);
    }
  });
};
