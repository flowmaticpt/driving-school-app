import React, { useState, useEffect } from 'react';
import { migrateUsersIsActiveToActive, checkUsersFieldStatus } from '../services/userMigration';
import { usePermissions } from '../hooks/usePermissions';
import './MigracaoUtilizadores.css';

const MigracaoUtilizadores = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fieldStatus, setFieldStatus] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const { userRole } = usePermissions();

  const checkStatus = async () => {
    setIsCheckingStatus(true);
    setError('');
    setResult(null);

    try {
      const status = await checkUsersFieldStatus();
      setFieldStatus(status);
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      setError('Erro ao verificar status dos utilizadores. Tente novamente.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleMigracao = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const resultado = await migrateUsersIsActiveToActive();
      setResult(resultado);
      // Atualizar o status após a migração
      await checkStatus();
    } catch (err) {
      console.error('Erro na migração:', err);
      setError('Erro durante a migração. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Verificar se o utilizador é dono
  if (userRole !== 'dono') {
    return null;
  }

  return (
    <div className="migracao-utilizadores">
      <div className="migracao-header">
        <h3>🔄 Migração de Utilizadores</h3>
        <p>Migra o campo 'isActive' para 'active' e define como true para todos os utilizadores</p>
      </div>

      <div className="migracao-content">
        <div className="migracao-info">
          <h4>O que esta ferramenta faz:</h4>
          <ul>
            <li>Remove o campo 'isActive' de todos os utilizadores</li>
            <li>Adiciona o campo 'active' como true para todos os utilizadores</li>
            <li>Atualiza a data de modificação dos registos</li>
            <li>Mantém a integridade dos dados existentes</li>
          </ul>
        </div>

        {fieldStatus && (
          <div className="status-info">
            <h4>📊 Estado Atual dos Utilizadores:</h4>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Total de Utilizadores:</span>
                <span className="status-value">{fieldStatus.totalUsers}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Com campo 'isActive':</span>
                <span className="status-value">{fieldStatus.usersComIsActive}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Com campo 'active':</span>
                <span className="status-value">{fieldStatus.usersComActive}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Sem campo 'active':</span>
                <span className="status-value">{fieldStatus.usersSemActive}</span>
              </div>
            </div>
            {fieldStatus.needsMigration && (
              <div className="migration-needed">
                <p>⚠️ Migração necessária: Existem utilizadores com campos antigos ou sem o campo 'active'</p>
              </div>
            )}
          </div>
        )}

        <div className="migracao-actions">
          <button 
            className="status-button"
            onClick={checkStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? 'A Verificar...' : 'Verificar Estado'}
          </button>

          <button 
            className="migracao-button"
            onClick={handleMigracao}
            disabled={isLoading || !fieldStatus?.needsMigration}
          >
            {isLoading ? 'A Migrar...' : 'Executar Migração'}
          </button>
        </div>

        {result && (
          <div className="resultado-sucesso">
            <h4>✅ Migração Concluída</h4>
            <div className="result-details">
              <p><strong>Utilizadores atualizados:</strong> {result.usersAtualizados}</p>
              <p><strong>Total de utilizadores:</strong> {result.totalUsers}</p>
              <p><strong>Com 'isActive' (antes):</strong> {result.usersComIsActive}</p>
              <p><strong>Com 'active' (antes):</strong> {result.usersComActive}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="resultado-erro">
            <h4>❌ Erro</h4>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MigracaoUtilizadores;
