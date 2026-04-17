import React from 'react';
import './ConfirmarRemocaoPrestacaoModal.css';

const ConfirmarRemocaoPrestacaoModal = ({ isOpen, onClose, onConfirm, prestacao, isLoading }) => {
  if (!isOpen || !prestacao) return null;

  const formatPrice = (price) => {
    if (!price) return '0,00 €';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDate = (date) => {
    if (!date) return 'Não definida';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('pt-PT');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content confirm-remove-modal">
        <div className="modal-header">
          <h3>Confirmar Remoção de Prestação</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="warning-message">
            <p>⚠️ Tem a certeza que deseja remover esta prestação?</p>
          </div>
          
          <div className="prestacao-details">
            <h4>Detalhes da Prestação:</h4>
            <div className="detail-item">
              <span className="label">Valor:</span>
              <span className="value">{formatPrice(prestacao.valorPrestacao || prestacao.value)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Data máxima:</span>
              <span className="value">{formatDate(prestacao.dataMaximaPagamento)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Status:</span>
              <span className="value status-pendente">⏳ Pendente</span>
            </div>
          </div>

          <div className="warning-note">
            <p><strong>Nota:</strong> Esta ação não pode ser desfeita. A prestação será permanentemente removida.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button 
            className="confirm-button remove-button" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Removendo...' : '🗑️ Remover Prestação'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarRemocaoPrestacaoModal;







