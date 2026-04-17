import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();

  console.log('🛡️ ProtectedRoute: Verificando acesso:', { 
    hasCurrentUser: !!currentUser,
    hasUserData: !!userData,
    userRole: userData?.role,
    requiredRole,
    pendingApproval: userData?.pendingApproval
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Se não estiver logado, redirecionar para login
  if (!currentUser) {
    console.log('🚫 ProtectedRoute: Utilizador não logado, redirecionando para /auth');
    return <Navigate to="/auth" replace />;
  }

  // Se não tiver dados do utilizador ainda, mostrar loading
  if (!userData) {
    console.log('⏳ ProtectedRoute: Dados do utilizador ainda não carregados');
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  // Check if user is pending approval
  if (userData?.role === 'pending' || userData?.pendingApproval === true) {
    console.log('⏳ ProtectedRoute: Utilizador pendente de aprovação');
    return (
      <div className="loading-container">
        <div className="access-denied">
          <h2>⏳ Aguardando Aprovação</h2>
          <p>O seu registo está pendente de aprovação pelo administrador.</p>
          <p>Entraremos em contacto em breve.</p>
          <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
            <p><strong>Detalhes da conta:</strong></p>
            <p>Nome: {userData?.name}</p>
            <p>Email: {userData?.email}</p>
            <p>Estado: Pendente de aprovação</p>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={handleLogout}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.target.style.background = '#5a6268'}
              onMouseOut={(e) => e.target.style.background = '#6c757d'}
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se não há role específico requerido, permitir acesso
  if (!requiredRole) {
    console.log('✅ ProtectedRoute: Acesso permitido (sem role específico)');
    return children;
  }

  // Verificar se o utilizador tem o role necessário
  const hasRequiredRole = () => {
    switch (requiredRole) {
      case 'dono':
        return userData.role === 'dono';
      case 'group_owner':
        return userData.role === 'group_owner' || userData.role === 'dono';
      case 'admin':
        return userData.role === 'admin' || userData.role === 'group_owner' || userData.role === 'dono';
      default:
        return false;
    }
  };

  if (!hasRequiredRole()) {
    return (
      <div className="access-denied">
        <h2>Acesso Negado</h2>
        <p>Não tem permissões suficientes para aceder a esta página.</p>
        <button onClick={() => window.history.back()}>
          Voltar
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
