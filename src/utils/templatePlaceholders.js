/**
 * Registry de placeholders para templates de contrato
 * e função para substituir placeholders com dados reais
 */

export const PLACEHOLDER_GROUPS = [
  {
    label: 'Aluno',
    placeholders: [
      { key: '{{nome}}', label: 'Nome', description: 'Nome completo do aluno' },
      { key: '{{email}}', label: 'Email', description: 'Email do aluno' },
      { key: '{{telefone}}', label: 'Telefone', description: 'Telefone do aluno' },
      { key: '{{morada}}', label: 'Morada', description: 'Morada do aluno' },
      { key: '{{nif}}', label: 'NIF', description: 'NIF do aluno' },
      { key: '{{cc}}', label: 'CC', description: 'Cartão de cidadão do aluno' },
      { key: '{{numeroInscricao}}', label: 'N.º Inscrição', description: 'Número de inscrição' },
      { key: '{{dataInscricao}}', label: 'Data Inscrição', description: 'Data de inscrição' },
      { key: '{{numeroAluno}}', label: 'N.º Aluno', description: 'Número de aluno' },
      { key: '{{dataLicenca}}', label: 'Data Licença', description: 'Data de emissão da licença' },
    ]
  },
  {
    label: 'Escola',
    placeholders: [
      { key: '{{nomeEscola}}', label: 'Nome Escola', description: 'Nome da escola' },
      { key: '{{moradaEscola}}', label: 'Morada Escola', description: 'Morada da escola' },
      { key: '{{telefoneEscola}}', label: 'Tel. Escola', description: 'Telefone da escola' },
      { key: '{{emailEscola}}', label: 'Email Escola', description: 'Email da escola' },
    ]
  },
  {
    label: 'Outros',
    placeholders: [
      { key: '{{dataHoje}}', label: 'Data Hoje', description: 'Data de hoje' },
      { key: '{{totalServicos}}', label: 'Total Serviços', description: 'Valor total dos serviços' },
      { key: '{{totalDivida}}', label: 'Total Dívida', description: 'Valor total em dívida' },
    ]
  }
];

/**
 * Substitui todos os placeholders no body do template com dados reais
 * @param {string} body - Texto do template com placeholders
 * @param {object} aluno - Dados do aluno
 * @param {object} escola - Dados da escola
 * @param {object} extras - Dados extras (totalServicos, totalDivida)
 * @returns {string} Texto com placeholders substituídos
 */
export const replacePlaceholders = (body, aluno = {}, escola = {}, extras = {}) => {
  if (!body) return '';

  const today = new Date().toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  const map = {
    '{{nome}}': aluno.name || '',
    '{{email}}': aluno.email || '',
    '{{telefone}}': aluno.phone || '',
    '{{morada}}': aluno.address || '',
    '{{nif}}': aluno.nif || '',
    '{{cc}}': aluno.cc || '',
    '{{numeroInscricao}}': aluno.enrollmentNumber || '',
    '{{dataInscricao}}': aluno.enrollmentDate || '',
    '{{numeroAluno}}': aluno.studentNumber || '',
    '{{dataLicenca}}': aluno.licenseIssueDate || '',
    '{{nomeEscola}}': escola.name || '',
    '{{moradaEscola}}': escola.address || '',
    '{{telefoneEscola}}': escola.number || escola.phone || '',
    '{{emailEscola}}': escola.email || '',
    '{{dataHoje}}': today,
    '{{totalServicos}}': extras.totalServicos != null ? formatCurrency(extras.totalServicos) : '',
    '{{totalDivida}}': extras.totalDivida != null ? formatCurrency(extras.totalDivida) : '',
  };

  let result = body;
  for (const [placeholder, value] of Object.entries(map)) {
    result = result.split(placeholder).join(value);
  }

  return result;
};
