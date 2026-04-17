import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { cleanupReferences } from '../services/referenceCleanup';
import './ConfirmarRemocaoGrupoModal.css';

const ConfirmarRemocaoGrupoModal = ({ isOpen, onClose, grupo, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Primeiro, limpar referências do grupo em escolas
      await cleanupReferences('grupo', grupo.id);
      
      // 2. Depois, remover o documento do grupo
      const grupoRef = doc(db, 'grupos', grupo.id);
      await deleteDoc(grupoRef);
      
      onSuccess('Grupo removido com sucesso!');
      onClose();
      
    } catch (err) {
      console.error('Erro ao remover grupo:', err);
      setError('Erro ao remover grupo. Tente novamente.');
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

  if (!isOpen || !grupo) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar Remoção do Grupo</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="warning-icon">⚠️</div>
          <p>
            Tem certeza que deseja remover o grupo <strong>"{grupo.name}"</strong>?
          </p>
          <p className="warning-text">
            Esta ação irá:
          </p>
          <ul className="warning-list">
            <li>Remover o grupo permanentemente</li>
            <li>Desassociar todas as escolas deste grupo</li>
            <li>Esta ação não pode ser desfeita</li>
          </ul>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="delete-button"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Removendo...' : 'Sim, Remover Grupo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarRemocaoGrupoModal;
