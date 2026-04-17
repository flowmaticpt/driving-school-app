import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MudarPalavraPasseModal from './MudarPalavraPasseModal';
import './Navigation.css';

const Navigation = ({ showBackButton = false, backPath = '/', showUserActions = false }) => {
  const navigate = useNavigate();
  const authContext = useAuth();
  const logout = authContext?.logout;
  const userData = authContext?.userData;
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleBack = () => {
    navigate(backPath);
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
        navigate('/auth');
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  return (
    <div className="navigation">
      {/* Header removed - using App.js header instead */}
      
      <div className="menu">
        {showBackButton && (
          <button className="back-button" onClick={handleBack}>
            ← Voltar
          </button>
        )}
      </div>

      <MudarPalavraPasseModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
};

export default Navigation;
