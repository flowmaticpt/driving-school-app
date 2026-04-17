import React, { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/config';

const SimplePasswordChange = ({ onClose }) => {
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

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Utilizador não autenticado');
        return;
      }

      // Reautenticar o utilizador com a palavra-passe atual
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Atualizar a palavra-passe
      await updatePassword(user, newPassword);
      
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

  return (
    <div className="simple-password-change">
      <h3>Alterar Palavra-passe</h3>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Palavra-passe Atual:</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label>Nova Palavra-passe:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label>Confirmar Nova Palavra-passe:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="actions">
          <button type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'A Alterar...' : 'Alterar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SimplePasswordChange;







