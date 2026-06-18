/**
 * Registry de placeholders para templates de contrato (.docx)
 * Usa {x} (chavetas simples) compatível com docxtemplater
 */

export const PLACEHOLDER_GROUPS = [
  {
    label: 'Aluno',
    placeholders: [
      { key: '{nome}', label: 'Nome', description: 'Nome completo do aluno' },
      { key: '{email}', label: 'Email', description: 'Email do aluno' },
      { key: '{telefone}', label: 'Telefone', description: 'Telefone do aluno' },
      { key: '{morada}', label: 'Morada', description: 'Morada do aluno' },
      { key: '{nif}', label: 'NIF', description: 'NIF do aluno' },
      { key: '{cc}', label: 'CC', description: 'Cartão de cidadão do aluno' },
      { key: '{dataNascimento}', label: 'Data Nascimento', description: 'Data de nascimento do aluno' },
      { key: '{numeroInscricao}', label: 'N.º Inscrição', description: 'Número de inscrição' },
      { key: '{dataInscricao}', label: 'Data Inscrição', description: 'Data de inscrição' },
      { key: '{dataLicenca}', label: 'Data Licença', description: 'Data de emissão da licença' },
      { key: '{dataFimLicenca}', label: 'Fim Licença', description: 'Data de fim da licença de aprendizagem' },
    ]
  },
  {
    label: 'Escola',
    placeholders: [
      { key: '{nomeEscola}', label: 'Nome Escola', description: 'Nome da escola' },
      { key: '{moradaEscola}', label: 'Morada Escola', description: 'Morada da escola' },
      { key: '{telefoneEscola}', label: 'Tel. Escola', description: 'Telefone da escola' },
      { key: '{emailEscola}', label: 'Email Escola', description: 'Email da escola' },
    ]
  },
  {
    label: 'Prestações',
    placeholders: [
      { key: '{prestacao1Valor}', label: '1ª Valor', description: 'Valor da 1ª prestação' },
      { key: '{prestacao1Data}', label: '1ª Data', description: 'Data limite da 1ª prestação' },
      { key: '{prestacao2Valor}', label: '2ª Valor', description: 'Valor da 2ª prestação' },
      { key: '{prestacao2Data}', label: '2ª Data', description: 'Data limite da 2ª prestação' },
      { key: '{prestacao3Valor}', label: '3ª Valor', description: 'Valor da 3ª prestação' },
      { key: '{prestacao3Data}', label: '3ª Data', description: 'Data limite da 3ª prestação' },
      { key: '{prestacao4Valor}', label: '4ª Valor', description: 'Valor da 4ª prestação' },
      { key: '{prestacao4Data}', label: '4ª Data', description: 'Data limite da 4ª prestação' },
      { key: '{prestacao5Valor}', label: '5ª Valor', description: 'Valor da 5ª prestação' },
      { key: '{prestacao5Data}', label: '5ª Data', description: 'Data limite da 5ª prestação' },
      { key: '{prestacao6Valor}', label: '6ª Valor', description: 'Valor da 6ª prestação' },
      { key: '{prestacao6Data}', label: '6ª Data', description: 'Data limite da 6ª prestação' },
      { key: '{prestacao7Valor}', label: '7ª Valor', description: 'Valor da 7ª prestação' },
      { key: '{prestacao7Data}', label: '7ª Data', description: 'Data limite da 7ª prestação' },
      { key: '{prestacao8Valor}', label: '8ª Valor', description: 'Valor da 8ª prestação' },
      { key: '{prestacao8Data}', label: '8ª Data', description: 'Data limite da 8ª prestação' },
    ]
  },
  {
    label: 'Outros',
    placeholders: [
      { key: '{dataHoje}', label: 'Data Hoje', description: 'Data de hoje' },
      { key: '{totalServicos}', label: 'Total Serviços', description: 'Valor total dos serviços' },
      { key: '{totalDivida}', label: 'Total Dívida', description: 'Valor total em dívida' },
    ]
  }
];

/**
 * Constrói o objecto de dados para docxtemplater
 * As chaves NÃO incluem chavetas (docxtemplater resolve {nome} com data.nome)
 * @param {object} aluno - Dados do aluno
 * @param {object} escola - Dados da escola
 * @param {object} extras - Dados extras (totalServicos, totalDivida)
 * @returns {object} Mapa chave→valor para docxtemplater
 */
export const buildPlaceholderData = (aluno = {}, escola = {}, extras = {}) => {
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

  // Formatar datas guardadas como string (YYYY-MM-DD ou YYYY-MM-DDTHH:mm) para DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr; // Se não for válida, devolver como está
      return d.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Extrair prestações do aluno (até 8), ordenadas por data limite
  const prestacoes = (aluno.pagamentos || [])
    .filter(p => p.type === 'prestacao')
    .sort((a, b) => {
      const dateA = a.dataMaximaPagamento?.toDate ? a.dataMaximaPagamento.toDate() : new Date(a.dataMaximaPagamento || 0);
      const dateB = b.dataMaximaPagamento?.toDate ? b.dataMaximaPagamento.toDate() : new Date(b.dataMaximaPagamento || 0);
      return dateA - dateB;
    })
    .slice(0, 8);

  const prestacaoData = {};
  for (let i = 0; i < 8; i++) {
    const p = prestacoes[i];
    if (p) {
      const val = p.valorPrestacao ?? p.value ?? 0;
      prestacaoData[`prestacao${i + 1}Valor`] = formatCurrency(val);
      const dt = p.dataMaximaPagamento?.toDate ? p.dataMaximaPagamento.toDate() : p.dataMaximaPagamento;
      prestacaoData[`prestacao${i + 1}Data`] = formatDate(dt);
    } else {
      prestacaoData[`prestacao${i + 1}Valor`] = '';
      prestacaoData[`prestacao${i + 1}Data`] = '';
    }
  }

  const baseData = {
    nome: aluno.name || '',
    email: aluno.email || '',
    telefone: aluno.phone || '',
    morada: aluno.address || '',
    nif: aluno.nif || '',
    cc: aluno.cc || '',
    dataNascimento: formatDate(aluno.birthDate),
    numeroInscricao: aluno.enrollmentNumber || '',
    dataInscricao: formatDate(aluno.enrollmentDate),
    dataLicenca: formatDate(aluno.licenseIssueDate),
    dataFimLicenca: formatDate(aluno.licenseExpiryDate),
    nomeEscola: escola.name || '',
    moradaEscola: escola.address || '',
    telefoneEscola: escola.number || escola.phone || '',
    emailEscola: escola.email || '',
    dataHoje: today,
    totalServicos: extras.totalServicos != null ? formatCurrency(extras.totalServicos) : '',
    totalDivida: extras.totalDivida != null ? formatCurrency(extras.totalDivida) : '',
    ...prestacaoData,
  };

  // Adicionar versões MAIÚSCULAS de todas as chaves para que
  // tanto {nome} como {NOME} funcionem nos templates
  const withUppercase = {};
  for (const [key, value] of Object.entries(baseData)) {
    withUppercase[key] = value;
    withUppercase[key.toUpperCase()] = value;
  }

  return withUppercase;
};

/**
 * Substitui placeholders no texto (para preview de texto extraído do docx)
 * @param {string} text - Texto com placeholders {x}
 * @param {object} data - Mapa chave→valor (de buildPlaceholderData)
 * @returns {string} Texto com placeholders substituídos
 */
export const replacePlaceholders = (text, data = {}) => {
  if (!text) return '';
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.split(`{${key}}`).join(value);
  }
  return result;
};
