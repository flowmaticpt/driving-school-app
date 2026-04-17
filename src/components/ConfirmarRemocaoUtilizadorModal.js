import React from 'react';
import './ConfirmarRemocaoUtilizadorModal.css';

const ConfirmarRemocaoUtilizadorModal = ({ utilizador, onClose, onConfirm }) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    onClose();
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'dono':
        return 'Dono';
      case 'group_owner':
      case 'group owner':
        return 'Admin de Grupo';
      case 'admin':
        return 'Admin';
      default:
        return 'N/A';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'dono':
        return '👑';
      case 'group_owner':
        return '👨‍💼';
      case 'admin':
        return '👤';
      default:
        return '❓';
    }
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
            <p>Tem a certeza que deseja remover este utilizador?</p>
            <div className="utilizador-info">
              <div className="utilizador-detail">
                <strong>Nome:</strong> {utilizador.name}
              </div>
              <div className="utilizador-detail">
                <strong>Email:</strong> {utilizador.email}
              </div>
              <div className="utilizador-detail">
                <strong>Role:</strong> {getRoleIcon(utilizador.role)} {getRoleLabel(utilizador.role)}
              </div>
              <div className="utilizador-detail">
                <strong>Estado:</strong> {utilizador.ativo ? 'Ativo' : 'Inativo'}
              </div>
            </div>
            <p className="warning-text">
              Esta ação não pode ser desfeita. Todos os dados relacionados a este utilizador serão permanentemente removidos.
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

export default ConfirmarRemocaoUtilizadorModal;
