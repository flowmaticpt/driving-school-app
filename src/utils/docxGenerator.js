/**
 * Gerador de documentos .docx usando docxtemplater
 * Substitui o antigo pdfGenerator.js
 */
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { PLACEHOLDER_GROUPS } from './templatePlaceholders';

/**
 * Gera um documento .docx preenchido a partir de um template base64
 * @param {string} docxBase64 - Template .docx codificado em base64
 * @param {object} data - Mapa de placeholders → valores (chaves sem chavetas)
 * @returns {Blob} Blob do .docx preenchido
 */
export const generateFilledDocx = (docxBase64, data = {}) => {
  const zip = new PizZip(docxBase64, { base64: true });

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  doc.render(data);

  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return out;
};

/**
 * Gera e faz download do .docx preenchido
 * @param {string} docxBase64 - Template .docx em base64
 * @param {object} data - Mapa de placeholders → valores
 * @param {string} fileName - Nome do ficheiro para download
 */
export const downloadFilledDocx = (docxBase64, data = {}, fileName = 'contrato.docx') => {
  const blob = generateFilledDocx(docxBase64, data);
  saveAs(blob, fileName);
};

/**
 * Extrai texto simples de um .docx base64 (para preview)
 * Percorre os paragraphs do document.xml e concatena o texto
 * @param {string} docxBase64 - Template .docx em base64
 * @returns {string} Texto extraído
 */
export const extractTextFromDocx = (docxBase64) => {
  const zip = new PizZip(docxBase64, { base64: true });

  const content = zip.file('word/document.xml')?.asText();
  if (!content) return '';

  // Parse XML and extract text from <w:t> tags, respecting <w:p> paragraphs
  const paragraphs = content.split(/<\/w:p>/);
  const lines = paragraphs.map((p) => {
    const texts = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = regex.exec(p)) !== null) {
      texts.push(match[1]);
    }
    return texts.join('');
  });

  return lines.filter((l) => l.length > 0 || lines.indexOf(l) > 0).join('\n');
};

/**
 * Gera um .docx de exemplo com todos os placeholders nos sítios certos.
 * A escola descarrega, edita no Word, e faz re-upload.
 */
export const generateSampleTemplate = () => {
  // Helper: cria um parágrafo Word XML
  const p = (text, opts = {}) => {
    const { bold, size, center, spacing } = opts;
    let rPr = '';
    if (bold || size) {
      rPr = '<w:rPr>';
      if (bold) rPr += '<w:b/>';
      if (size) rPr += `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
      rPr += '</w:rPr>';
    }
    let pPr = '';
    const pPrParts = [];
    if (center) pPrParts.push('<w:jc w:val="center"/>');
    if (spacing) pPrParts.push(`<w:spacing ${spacing}/>`);
    if (pPrParts.length) pPr = `<w:pPr>${pPrParts.join('')}</w:pPr>`;

    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
  };

  // Linha vazia
  const emptyP = () => '<w:p/>';

  const body = [
    p('CONTRATO DE FORMACAO', { bold: true, size: 32, center: true }),
    emptyP(),
    p('Escola: {nomeEscola}'),
    p('Morada: {moradaEscola}'),
    p('Telefone: {telefoneEscola} | Email: {emailEscola}'),
    emptyP(),
    p('DADOS DO ALUNO', { bold: true, size: 24, spacing: 'w:before="200"' }),
    p('Nome: {nome}'),
    p('Morada: {morada}'),
    p('NIF: {nif}'),
    p('CC: {cc}'),
    p('Email: {email}'),
    p('Telefone: {telefone}'),
    p('Data de Nascimento: {dataNascimento}'),
    p('N.o Inscricao: {numeroInscricao}'),
    p('Data de Inscricao: {dataInscricao}'),
    emptyP(),
    p('SERVICOS CONTRATADOS', { bold: true, size: 24, spacing: 'w:before="200"' }),
    p('Total de Servicos: {totalServicos}'),
    emptyP(),
    p('Data: {dataHoje}'),
    emptyP(),
    p('Assinatura do Aluno: _______________'),
    p('Assinatura da Escola: _______________'),
  ].join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>${body}</w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const zip = new PizZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', wordRelsXml);

  const blob = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  saveAs(blob, 'modelo-contrato-exemplo.docx');
};

/**
 * Converte texto simples (com placeholders) num .docx base64
 * Cada linha vira um parágrafo Word
 */
export const textToDocxBase64 = (text) => {
  const escapeXml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = text.split('\n');
  const body = lines.map(line => {
    if (line.trim() === '') return '<w:p/>';
    return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
  }).join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>${body}</w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const zip = new PizZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', wordRelsXml);

  return zip.generate({ type: 'base64' });
};

/**
 * Extrai os placeholders encontrados num .docx base64
 * Retorna um Set com as keys encontradas (ex: "{nome}", "{nif}")
 * @param {string} docxBase64 - Template .docx em base64
 * @returns {Set<string>} Conjunto de placeholders encontrados
 */
export const extractPlaceholdersFromDocx = (docxBase64) => {
  const text = extractTextFromDocx(docxBase64);
  const textLower = text.toLowerCase();
  const found = new Set();
  const allPlaceholders = PLACEHOLDER_GROUPS.flatMap(g => g.placeholders);
  for (const ph of allPlaceholders) {
    if (textLower.includes(ph.key)) {
      found.add(ph.key);
    }
  }
  return found;
};
