/**
 * Formatters utilitários para formatação de valores
 */

/**
 * Formata um valor numérico como moeda em EUR (formato português)
 * @param {number|string} price - Valor a formatar
 * @returns {string} Valor formatado (ex: "1.234,56 €")
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return '0,00 €';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '0,00 €';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(numPrice);
};

/**
 * Formata um valor numérico como moeda (sem símbolo de moeda)
 * @param {number|string} value - Valor a formatar
 * @returns {string} Valor formatado (ex: "1.234,56")
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '0,00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0,00';
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};

/**
 * Formata uma data/timestamp do Firestore para string legível
 * @param {Timestamp|Date|string|number} dateValue - Data a formatar
 * @param {object} options - Opções de formatação
 * @param {boolean} options.includeTime - Incluir hora na formatação
 * @param {boolean} options.relative - Formatar como tempo relativo (ex: "há 2 horas")
 * @returns {string} Data formatada
 */
export const formatDate = (dateValue, options = {}) => {
  const { includeTime = false, relative = false } = options;
  
  if (!dateValue) return 'Data não disponível';
  
  try {
    let date;
    
    // Firestore Timestamp
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } 
    // Objeto com .seconds (Firestore Timestamp serializado)
    else if (dateValue.seconds && typeof dateValue.seconds === 'number') {
      date = new Date(dateValue.seconds * 1000);
    }
    // JavaScript Date object
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // String de data
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
    }
    // Número (timestamp)
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
    }
    else {
      return 'Formato de data não suportado';
    }

    // Formatação relativa (ex: "há 2 horas")
    if (relative) {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
      if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    }

    // Formatação padrão
    if (includeTime) {
      return date.toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return date.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Erro ao formatar data:', error, dateValue);
    return 'Erro na data';
  }
};

/**
 * Formata uma data completa com hora
 * @param {Timestamp|Date|string|number} dateValue - Data a formatar
 * @returns {string} Data formatada com hora
 */
export const formatDateTime = (dateValue) => {
  return formatDate(dateValue, { includeTime: true });
};

/**
 * Formata uma data como tempo relativo
 * @param {Timestamp|Date|string|number} dateValue - Data a formatar
 * @returns {string} Tempo relativo (ex: "há 2 horas")
 */
export const formatRelativeTime = (dateValue) => {
  return formatDate(dateValue, { relative: true });
};

/**
 * Formata um número com separadores de milhares
 * @param {number|string} value - Valor a formatar
 * @param {number} decimals - Número de casas decimais (padrão: 0)
 * @returns {string} Número formatado
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || value === '') return '0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0';
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue);
};

