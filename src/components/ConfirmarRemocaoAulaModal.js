import React, { useState } from 'react';
import './ConfirmarRemocaoAulaModal.css';

const ConfirmarRemocaoAulaModal = ({ isOpen, onClose, aula, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Erro ao remover aula:', err);
      setError('Erro ao remover aula. Tente novamente.');
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

  if (!isOpen || !aula) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('pt-PT');
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content confirm-modal">
        <div className="modal-header">
          <h2>⚠️ Confirmar Remoção</h2>
          <button className="modal-close-button" onClick={handleClose} disabled={isLoading}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="warning-icon">⚠️</div>
          <p>Tem certeza que deseja remover esta aula?</p>
          <div className="aula-details">
            <p><strong>Tipo:</strong> {aula.tipo === 'teorica' ? '📚 Teórica' : '🚗 Prática'}</p>
            <p><strong>Data:</strong> {formatDate(aula.data)}</p>
            <p><strong>Hora:</strong> {aula.hora || 'N/A'}</p>
            <p><strong>Duração:</strong> {aula.horas || 1}h</p>
            <p><strong>Status:</strong> {
              aula.status === 'agendada' ? '📅 Agendada' : 
              aula.status === 'realizada' ? '✅ Realizada' : 
              aula.status === 'cancelada' ? '❌ Cancelada' : aula.status
            }</p>
          </div>
          <p className="warning-text">Esta ação é irreversível e removerá a aula permanentemente.</p>
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
            {isLoading ? 'Removendo...' : 'Remover Aula'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarRemocaoAulaModal;

