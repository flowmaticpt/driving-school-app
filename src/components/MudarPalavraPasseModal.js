import React, { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import './MudarPalavraPasseModal.css';

const MudarPalavraPasseModal = ({ isOpen, onClose }) => {
  const authContext = useAuth();
  const currentUser = authContext?.currentUser;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');


    // Verificar se o utilizador está autenticado
    if (!currentUser) {
      setError('Utilizador não autenticado');
      return;
    }

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As novas palavras-passe não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova palavra-passe deve ter pelo menos 6 caracteres');
      return;
    }

    if (currentPassword === newPassword) {
      setError('A nova palavra-passe deve ser diferente da atual');
      return;
    }

    setIsLoading(true);

    try {
      // Reautenticar o utilizador com a palavra-passe atual
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Atualizar a palavra-passe
      await updatePassword(currentUser, newPassword);
      
      setSuccess('Palavra-passe alterada com sucesso!');
      
      // Limpar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao alterar palavra-passe:', error);
      
      switch (error.code) {
        case 'auth/wrong-password':
          setError('Palavra-passe atual incorreta');
          break;
        case 'auth/too-many-requests':
          setError('Muitas tentativas. Tente novamente mais tarde');
          break;
        case 'auth/weak-password':
          setError('A nova palavra-passe é muito fraca');
          break;
        default:
          setError('Erro ao alterar palavra-passe. Tente novamente');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      onClose();
    }
  };

  if (!isOpen) return null;

  // Não renderizar se não houver utilizador autenticado
  if (!currentUser) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔒 Alterar Palavra-passe</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="currentPassword">Palavra-passe Atual:</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
              placeholder="Digite a sua palavra-passe atual"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">Nova Palavra-passe:</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              placeholder="Digite a nova palavra-passe"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Nova Palavra-passe:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              placeholder="Confirme a nova palavra-passe"
            />
          </div>

          {error && (
            <div className="error-message">
              <span>❌ {error}</span>
            </div>
          )}

          {success && (
            <div className="success-message">
              <span>✅ {success}</span>
            </div>
          )}

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
              type="submit"
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'A Alterar...' : 'Alterar Palavra-passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MudarPalavraPasseModal;
