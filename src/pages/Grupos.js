import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import AdicionarGrupoModal from '../components/AdicionarGrupoModal';
import ListaGrupos from '../components/ListaGrupos';
import { usePermissions } from '../hooks/usePermissions';
import './Grupos.css';

const Grupos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [grupoAdded, setGrupoAdded] = useState(0);
  const { canCreateGroup, userRole } = usePermissions();

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSuccessMessage('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = (message) => {
    setSuccessMessage(message);
    setGrupoAdded(prev => prev + 1); // Trigger para recarregar lista
    // Limpar mensagem após 3 segundos
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="grupos">
      <Navigation showBackButton={true} backPath="/configuracoes" showUserActions={true} />
      
      <div className="content">
        <div className="page-header">
          <h2>Grupos</h2>
          <p>Gerir grupos de utilizadores</p>
          {canCreateGroup && (
            <button className="add-group-button" onClick={handleOpenModal}>
              + Adicionar Novo Grupo
            </button>
          )}
        </div>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
        
        <ListaGrupos onGrupoAdded={grupoAdded} />
      </div>

      <AdicionarGrupoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Grupos;
