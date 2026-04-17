import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import AdicionarEscolaModal from '../components/AdicionarEscolaModal';
import ListaEscolas from '../components/ListaEscolas';
import './Escolas.css';

const Escolas = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [escolaAdded, setEscolaAdded] = useState(0);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSuccessMessage('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = (message) => {
    setSuccessMessage(message);
    setEscolaAdded(prev => prev + 1); // Trigger para recarregar lista
    // Limpar mensagem após 3 segundos
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="escolas">
      <Navigation showBackButton={true} backPath="/configuracoes" showUserActions={true} />
      
      <div className="content">
        <div className="page-header">
          <h2>Escolas</h2>
          <p>Gerir escolas e suas configurações</p>
          <button className="add-school-button" onClick={handleOpenModal}>
            + Adicionar Nova Escola
          </button>
        </div>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
        
        <ListaEscolas onEscolaAdded={escolaAdded} />
      </div>

      <AdicionarEscolaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Escolas;
