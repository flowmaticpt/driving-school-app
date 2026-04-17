import React, { useState, useEffect } from 'react';
import './EditarPrestacaoModal.css';

const EditarPrestacaoModal = ({ isOpen, onClose, onConfirm, prestacao, isLoading }) => {
  const [valorPrestacao, setValorPrestacao] = useState('');
  const [dataMaximaPagamento, setDataMaximaPagamento] = useState('');

  useEffect(() => {
    if (prestacao && isOpen) {
      setValorPrestacao(prestacao.valorPrestacao || prestacao.value || '');
      
      if (prestacao.dataMaximaPagamento) {
        const date = prestacao.dataMaximaPagamento.toDate ? 
          prestacao.dataMaximaPagamento.toDate() : 
          new Date(prestacao.dataMaximaPagamento);
        setDataMaximaPagamento(date.toISOString().split('T')[0]);
      } else {
        setDataMaximaPagamento('');
      }
    }
  }, [prestacao, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!valorPrestacao || isNaN(parseFloat(valorPrestacao))) {
      return;
    }
    
    const valorNumerico = parseFloat(valorPrestacao);
    if (valorNumerico <= 0) {
      return;
    }

    onConfirm({
      valorPrestacao: valorNumerico,
      dataMaximaPagamento: dataMaximaPagamento
    });
  };

  const handleClose = () => {
    setValorPrestacao('');
    setDataMaximaPagamento('');
    onClose();
  };

  if (!isOpen || !prestacao) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content editar-prestacao-modal">
        <div className="modal-header">
          <h3>Editar Prestação</h3>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="valorPrestacao">Valor da Prestação *</label>
              <div className="input-with-currency">
                <input
                  type="number"
                  id="valorPrestacao"
                  value={valorPrestacao}
                  onChange={(e) => setValorPrestacao(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={isLoading}
                />
                <span className="currency-symbol">€</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="dataMaximaPagamento">Data Máxima de Pagamento</label>
              <input
                type="date"
                id="dataMaximaPagamento"
                value={dataMaximaPagamento}
                onChange={(e) => setDataMaximaPagamento(e.target.value)}
                className="form-input"
                disabled={isLoading}
              />
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
              disabled={isLoading || !valorPrestacao || isNaN(parseFloat(valorPrestacao)) || parseFloat(valorPrestacao) <= 0}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPrestacaoModal;







