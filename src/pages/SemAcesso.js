import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import './SemAcesso.css';

const SemAcesso = () => {
  const navigate = useNavigate();
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="sem-acesso-page">
      <Navigation showUserActions={true} />
      
      <div className="container">
        <div className="access-denied-card">
          <div className="access-icon">🔒</div>
          <h1>Sem Acesso</h1>
          
          {userData?.role === 'admin' ? (
            <div className="admin-message">
              <h2>Nenhuma Escola Atribuída</h2>
              <p>
                Como administrador, não tem escolas atribuídas à sua conta.
              </p>
              <p>
                Contacte o administrador do sistema para obter acesso às escolas necessárias.
              </p>
            </div>
          ) : (
            <div className="generic-message">
              <h2>Acesso Restrito</h2>
              <p>
                Não tem permissões suficientes para aceder ao sistema.
              </p>
              <p>
                Contacte o administrador para mais informações.
              </p>
            </div>
          )}

          <div className="user-info">
            <h3>Informações da Conta</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Nome:</span>
                <span className="info-value">{userData?.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{userData?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Role:</span>
                <span className="info-value">{userData?.role}</span>
              </div>
              {userData?.role === 'admin' && (
                <div className="info-item">
                  <span className="info-label">Escolas Atribuídas:</span>
                  <span className="info-value">
                    {userData?.escolasAtribuidas?.length || 0}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="actions">
            <button className="logout-button" onClick={handleLogout}>
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemAcesso;

