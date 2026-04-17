import React, { useState } from 'react';
import './ConfirmarRemocaoMaterialModal.css';

const ConfirmarRemocaoMaterialModal = ({ isOpen, onClose, material, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Erro ao remover material:', err);
      setError('Erro ao remover material. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !material) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content confirm-modal">
        <div className="modal-header">
          <h2>Confirmar Remoção</h2>
          <button className="modal-close-button" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="warning-icon">⚠️</div>
          <p>Tem certeza que deseja remover o material <strong>{material.name}</strong>?</p>
          <p>Esta ação é irreversível e removerá o material permanentemente, incluindo todo o histórico de reabastecimentos.</p>
          {error && <p className="error-message">{error}</p>}
        </div>
        <div className="modal-footer">
          <button
            className="button cancel-button"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            className="button delete-button"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Removendo...' : 'Remover Material'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarRemocaoMaterialModal;
