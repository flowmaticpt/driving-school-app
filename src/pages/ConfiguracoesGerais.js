import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import LimpezaReferencias from '../components/LimpezaReferencias';
import MigracaoUtilizadores from '../components/MigracaoUtilizadores';
import './ConfiguracoesGerais.css';

const ConfiguracoesGerais = () => {
  const navigate = useNavigate();

  const handleEscolas = () => {
    navigate('/escolas');
  };

  const handleGrupos = () => {
    navigate('/grupos');
  };

  return (
    <div className="configuracoes-gerais">
      <Navigation showBackButton={true} backPath="/" showUserActions={true} />
      
      <div className="content">
        <div className="page-header">
          <h2>Configurações Gerais</h2>
          <p>Selecione uma das opções abaixo para configurar:</p>
        </div>
        
        <div className="options-grid">
          <button className="option-button" onClick={handleEscolas}>
            <div className="option-icon">🏫</div>
            <h3>Escolas</h3>
            <p>Gerir escolas e suas configurações</p>
          </button>
          
          <button className="option-button" onClick={handleGrupos}>
            <div className="option-icon">👥</div>
            <h3>Grupos</h3>
            <p>Gerir grupos de utilizadores</p>
          </button>
        </div>

        <LimpezaReferencias />
        
        <MigracaoUtilizadores />
      </div>
    </div>
  );
};

export default ConfiguracoesGerais;
