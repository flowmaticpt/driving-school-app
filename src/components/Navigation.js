import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MudarPalavraPasseModal from './MudarPalavraPasseModal';
import './Navigation.css';

const Navigation = ({ showBackButton = false, backPath = '/', showUserActions = false }) => {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleBack = () => {
    navigate(backPath);
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
