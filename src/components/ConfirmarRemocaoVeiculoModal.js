import React from 'react';
import './ConfirmarRemocaoVeiculoModal.css';

const ConfirmarRemocaoVeiculoModal = ({ veiculo, onClose, onConfirm }) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container small">
        <div className="modal-header">
          <h2>Confirmar Remoção</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="warning-icon">⚠️</div>
          
          <div className="confirmation-message">
            <p>Tem a certeza que deseja remover este veículo?</p>
            <div className="veiculo-info">
              <div className="veiculo-detail">
                <strong>Matrícula:</strong> {veiculo.matricula}
              </div>
              <div className="veiculo-detail">
                <strong>Marca:</strong> {veiculo.marca || 'N/A'}
              </div>
              <div className="veiculo-detail">
                <strong>Modelo:</strong> {veiculo.modelo || 'N/A'}
              </div>
            </div>
            <p className="warning-text">
              Esta ação não pode ser desfeita. Todos os dados relacionados a este veículo serão permanentemente removidos.
            </p>
          </div>

          <div className="modal-actions">
            <button className="cancel-button" onClick={handleClose}>
              Cancelar
            </button>
            <button className="confirm-button" onClick={handleConfirm}>
              Sim, Remover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarRemocaoVeiculoModal;
