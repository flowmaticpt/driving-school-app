import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './ConfirmarRemocaoFuncionarioModal.css';

const ConfirmarRemocaoFuncionarioModal = ({ isOpen, onClose, onSuccess, funcionario, escolaId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      const funcionarioRef = doc(db, 'schools', escolaId, 'funcionarios', funcionario.id);
      await deleteDoc(funcionarioRef);

      onSuccess();
      onClose();
    } catch (err) {
      setError('Erro ao remover funcionário: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const roles = {
      'admin': 'Administrador',
      'instrutor': 'Instrutor',
      'group_owner': 'Gestor de Grupo',
      'dono': 'Dono'
    };
    return roles[role] || role;
  };

  if (!isOpen || !funcionario) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar Remoção</h2>
          <button className="close-button" onClick={onClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="warning-message">
            <div className="warning-icon">⚠️</div>
            <h3>Atenção!</h3>
            <p>Tem a certeza que deseja remover este funcionário?</p>
          </div>

          <div className="funcionario-info">
            <h4>Informações do Funcionário:</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>Nome:</label>
                <span>{funcionario.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{funcionario.email || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Cargo:</label>
                <span>{getRoleLabel(funcionario.role)}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className={`status-badge ${funcionario.isActive !== false ? 'active' : 'inactive'}`}>
                  {funcionario.isActive !== false ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          <div className="consequences-warning">
            <h4>⚠️ Consequências da Remoção:</h4>
            <ul>
              <li>O funcionário será permanentemente removido da escola</li>
              <li>Todos os dados associados serão eliminados</li>
              <li>Esta ação não pode ser desfeita</li>
              {funcionario.role === 'admin' && (
                <li><strong>Atenção:</strong> Este é um administrador da escola</li>
              )}
            </ul>
          </div>
        </div>

        <div className="modal-actions">
          <button
            onClick={onClose}
            className="cancel-button"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="confirm-button"
            disabled={isLoading}
          >
            {isLoading ? 'A remover...' : 'Sim, Remover Funcionário'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarRemocaoFuncionarioModal;








