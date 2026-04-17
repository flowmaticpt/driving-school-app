/**
 * Funções auxiliares gerais
 */

/**
 * Obtém label traduzido para método de pagamento
 * @param {string} metodo - Método de pagamento
 * @returns {string} Label traduzido
 */
export const getMetodoPagamentoLabel = (metodo) => {
  const metodos = {
    'dinheiro': 'Dinheiro',
    'multibanco': 'Multibanco',
    'transferencia': 'Transferência',
    'divida': 'Dívida'
  };
  return metodos[metodo] || metodo;
};

/**
 * Obtém label traduzido para tipo de movimento
 * @param {string} tipo - Tipo de movimento
 * @returns {string} Label traduzido
 */
export const getTipoMovimentoLabel = (tipo) => {
  const tipos = {
    'servico': 'Serviço',
    'material': 'Material',
    'pagamento': 'Pagamento',
    'despesa': 'Despesa'
  };
  return tipos[tipo] || tipo;
};

/**
 * Obtém label traduzido para status
 * @param {string} status - Status
 * @returns {string} Label traduzido
 */
export const getStatusLabel = (status) => {
  const labels = {
    'open': 'Aberto',
    'in_progress': 'Em Progresso',
    'resolved': 'Resolvido',
    'closed': 'Fechado',
    'agendada': 'Agendada',
    'realizada': 'Realizada',
    'cancelada': 'Cancelada',
    'ativo': 'Ativo',
    'inativo': 'Inativo'
  };
  return labels[status] || status;
};

/**
 * Obtém classe CSS para status
 * @param {string} status - Status
 * @returns {string} Classe CSS
 */
export const getStatusClass = (status) => {
  const classes = {
    'open': 'status-open',
    'in_progress': 'status-in-progress',
    'resolved': 'status-resolved',
    'closed': 'status-closed',
    'agendada': 'status-agendada',
    'realizada': 'status-realizada',
    'cancelada': 'status-cancelada',
    'ativo': 'status-ativo',
    'inativo': 'status-inativo'
  };
  return classes[status] || '';
};

/**
 * Obtém label traduzido para prioridade
 * @param {string} priority - Prioridade
 * @returns {string} Label traduzido
 */
export const getPriorityLabel = (priority) => {
  const labels = {
    'low': 'Baixa',
    'medium': 'Média',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  return labels[priority] || priority;
};

/**
 * Obtém classe CSS para prioridade
 * @param {string} priority - Prioridade
 * @returns {string} Classe CSS
 */
export const getPriorityClass = (priority) => {
  const classes = {
    'low': 'priority-low',
    'medium': 'priority-medium',
    'high': 'priority-high',
    'urgent': 'priority-urgent'
  };
  return classes[priority] || '';
};

/**
 * Debounce function para limitar chamadas de função
 * @param {Function} func - Função a debounce
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function para limitar chamadas de função
 * @param {Function} func - Função a throttle
 * @param {number} limit - Limite de tempo em ms
 * @returns {Function} Função com throttle
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Converte um valor para número seguro
 * @param {any} value - Valor a converter
 * @param {number} defaultValue - Valor padrão se conversão falhar
 * @returns {number} Número convertido ou valor padrão
 */
export const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Converte um valor para inteiro seguro
 * @param {any} value - Valor a converter
 * @param {number} defaultValue - Valor padrão se conversão falhar
 * @returns {number} Inteiro convertido ou valor padrão
 */
export const safeParseInt = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(parsed) ? defaultValue : parsed;
};

