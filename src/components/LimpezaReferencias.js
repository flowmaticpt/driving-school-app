import React, { useState } from 'react';
import { cleanupOrphanedReferences } from '../services/referenceCleanup';
import './LimpezaReferencias.css';

const LimpezaReferencias = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleLimpeza = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const resultado = await cleanupOrphanedReferences();
      setResult(resultado);
    } catch (err) {
      console.error('Erro na limpeza:', err);
      setError('Erro durante a limpeza. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="limpeza-referencias">
      <div className="limpeza-header">
        <h3>🔧 Limpeza de Referências</h3>
        <p>Remove referências órfãs e corrige inconsistências na base de dados</p>
      </div>

      <div className="limpeza-content">
        <div className="limpeza-info">
          <h4>O que esta ferramenta faz:</h4>
          <ul>
            <li>Remove escolas de grupos que não existem mais</li>
            <li>Remove grupos de escolas que não existem mais</li>
            <li>Corrige referências quebradas</li>
            <li>Mantém a integridade dos dados</li>
          </ul>
        </div>

        <button 
          className="limpeza-button"
          onClick={handleLimpeza}
          disabled={isLoading}
        >
          {isLoading ? 'A Limpar...' : 'Executar Limpeza'}
        </button>

        {result && (
          <div className="resultado-sucesso">
            <h4>✅ Limpeza Concluída</h4>
            <p>{result.referenciasCorrigidas} referência(s) corrigida(s)</p>
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

export default LimpezaReferencias;
