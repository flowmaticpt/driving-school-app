import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { cleanupReferences } from '../services/referenceCleanup';
import './ConfirmarRemocaoModal.css';

const ConfirmarRemocaoModal = ({ isOpen, onClose, escola, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Tentar limpar referências (não bloqueia o delete se falhar)
      try {
        await cleanupReferences('escola', escola.id);
      } catch (cleanupErr) {
        console.warn('Aviso: erro ao limpar referências, mas a escola será removida:', cleanupErr);
      }

      // 2. Remover o documento da escola
      const escolaRef = doc(db, 'schools', escola.id);
      await deleteDoc(escolaRef);

      onSuccess('Escola removida com sucesso!');
      onClose();

    } catch (err) {
      console.error('Erro ao remover escola:', err);
      setError(`Erro ao remover escola: ${err.code === 'permission-denied' ? 'Sem permissão. Verifique se é o dono.' : 'Tente novamente.'}`);
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

  if (!isOpen || !escola) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar Remoção</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="warning-icon">⚠️</div>
          <p>
            Tem certeza que deseja remover a escola <strong>"{escola.name}"</strong>?
          </p>
          <p className="warning-text">
            Esta ação não pode ser desfeita. Todos os dados da escola serão permanentemente removidos.
          </p>

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
            {isLoading ? 'Removendo...' : 'Sim, Remover'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarRemocaoModal;
