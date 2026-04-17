/**
 * Validators utilitários para validação de dados
 */

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} true se válido
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Valida formato de telefone português
 * @param {string} phone - Telefone a validar
 * @returns {boolean} true se válido
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Remove espaços, hífens e parênteses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Aceita números com 9 dígitos (formato português)
  const phoneRegex = /^9\d{8}$|^2\d{8}$|^1\d{8}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Valida NIF português usando algoritmo de validação
 * @param {string} nif - NIF a validar
 * @returns {boolean} true se válido
 */
export const validateNIF = (nif) => {
  if (!nif || typeof nif !== 'string') return false;
  const cleaned = nif.replace(/\s/g, '');
  
  // Deve ter 9 dígitos
  if (!/^\d{9}$/.test(cleaned)) return false;
  
  // Algoritmo de validação do NIF português
  const checkDigit = parseInt(cleaned[8]);
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleaned[i]) * (9 - i);
  }
  
  const remainder = sum % 11;
  const check = remainder < 2 ? 0 : 11 - remainder;
  
  return check === checkDigit;
};

/**
 * Valida Cartão de Cidadão português
 * @param {string} cc - CC a validar
 * @returns {boolean} true se válido
 */
export const validateCC = (cc) => {
  if (!cc || typeof cc !== 'string') return false;
  const cleaned = cc.replace(/\s/g, '');
  
  // CC tem 8 dígitos + 1 dígito de controlo (formato: 12345678-0)
  // Aceita com ou sem hífen
  const ccRegex = /^\d{8}[\-]?\d{1}$/;
  return ccRegex.test(cleaned);
};

/**
 * Valida se uma string não está vazia (após trim)
 * @param {string} value - Valor a validar
 * @returns {boolean} true se não vazio
 */
export const validateNotEmpty = (value) => {
  return value !== null && value !== undefined && typeof value === 'string' && value.trim().length > 0;
};

/**
 * Valida se um valor é um número positivo
 * @param {number|string} value - Valor a validar
 * @returns {boolean} true se válido
 */
export const validatePositiveNumber = (value) => {
  if (value === null || value === undefined || value === '') return false;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(numValue) && numValue > 0;
};

/**
 * Valida se um valor é um número não negativo
 * @param {number|string} value - Valor a validar
 * @returns {boolean} true se válido
 */
export const validateNonNegativeNumber = (value) => {
  if (value === null || value === undefined || value === '') return false;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(numValue) && numValue >= 0;
};

/**
 * Valida se uma data não é no passado
 * @param {string|Date} dateValue - Data a validar
 * @returns {boolean} true se não é no passado
 */
export const validateFutureDate = (dateValue) => {
  if (!dateValue) return false;
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= today;
};

/**
 * Valida se uma data não é no futuro
 * @param {string|Date} dateValue - Data a validar
 * @returns {boolean} true se não é no futuro
 */
export const validatePastDate = (dateValue) => {
  if (!dateValue) return false;
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
};

/**
 * Sanitiza uma string removendo caracteres perigosos (prevenção XSS básica)
 * @param {string} input - String a sanitizar
 * @returns {string} String sanitizada
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

