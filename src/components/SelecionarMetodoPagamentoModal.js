import React, { useState } from 'react';
import './SelecionarMetodoPagamentoModal.css';

const SelecionarMetodoPagamentoModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [selectedMethod, setSelectedMethod] = useState('dinheiro');
  const [naoAfetarFinanceiro, setNaoAfetarFinanceiro] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedMethod) {
      onConfirm({ metodo: selectedMethod, naoAfetarFinanceiro });
    }
  };

  const handleClose = () => {
    setSelectedMethod('dinheiro');
    setNaoAfetarFinanceiro(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content selecionar-metodo-modal">
        <div className="modal-header">
          <h3>Selecionar Método de Pagamento</h3>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="paymentMethod">Método de Pagamento *</label>
              <select
                id="paymentMethod"
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="form-input"
                required
                disabled={isLoading}
              >
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="transferencia">🏦 Transferência</option>
                <option value="multibanco">💳 Multibanco</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={naoAfetarFinanceiro}
                  onChange={(e) => setNaoAfetarFinanceiro(e.target.checked)}
                  disabled={isLoading}
                  className="checkbox-input"
                />
                <span className="checkbox-text">📊 Não afetar visão financeira</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="confirm-button"
              disabled={isLoading || !selectedMethod}
            >
              {isLoading ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SelecionarMetodoPagamentoModal;
