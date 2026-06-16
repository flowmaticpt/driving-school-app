import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './SelecionarInstrutorModal.css';

const SelecionarInstrutorModal = ({ escolaId, onClose, onInstrutorSelected }) => {
  const [instrutores, setInstrutores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (escolaId) {
      fetchInstrutores();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaId]);

  const fetchInstrutores = async () => {
    try {
      setLoading(true);
      const utilizadoresRef = collection(db, 'utilizadores');
      const q = query(utilizadoresRef, where('role', '==', 'instrutor'), where('escolaId', '==', escolaId));
      const instrutoresSnapshot = await getDocs(q);
      
      const instrutoresData = [];
      for (const instrutorDoc of instrutoresSnapshot.docs) {
        const instrutor = { id: instrutorDoc.id, ...instrutorDoc.data() };

        // Buscar informações do veículo habitual se existir
        if (instrutor.carroHabitual) {
          try {
            const veiculoRef = doc(db, 'schools', escolaId, 'fleet', instrutor.carroHabitual);
            const veiculoSnap = await getDoc(veiculoRef);
            if (veiculoSnap.exists()) {
              instrutor.veiculoInfo = { id: veiculoSnap.id, ...veiculoSnap.data() };
            }
          } catch (error) {
            console.error('Erro ao buscar veículo:', error);
          }
        }
        
        instrutoresData.push(instrutor);
      }
      
      setInstrutores(instrutoresData);
    } catch (error) {
      console.error('Erro ao buscar instrutores:', error);
      setError('Erro ao carregar lista de instrutores');
    } finally {
      setLoading(false);
    }
  };

  const handleInstrutorSelect = (instrutor) => {
    onInstrutorSelected(instrutor);
    onClose();
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const filteredInstrutores = instrutores.filter(instrutor =>
    instrutor.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content selecionar-instrutor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <span className="modal-icon">👨‍🏫</span>
            <div className="modal-title">
              <h2>Selecionar Instrutor</h2>
              <p>Escolha o instrutor para criar a aula</p>
            </div>
          </div>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>A carregar instrutores...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <h3>Erro</h3>
              <p>{error}</p>
              <button onClick={fetchInstrutores} className="retry-button">
                Tentar Novamente
              </button>
            </div>
          ) : (
            <>
              <div className="search-section">
                <div className="search-container">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar instrutor por nome..."
                    className="search-input"
                  />
                  <span className="search-icon">🔍</span>
                </div>
              </div>

              <div className="instrutores-section">
                <div className="section-header">
                  <h3>Instrutores Disponíveis</h3>
                  <span className="count-badge">{filteredInstrutores.length} instrutor(es)</span>
                </div>

                {filteredInstrutores.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">👨‍🏫</div>
                    <h3>Nenhum instrutor encontrado</h3>
                    <p>
                      {searchTerm 
                        ? `Nenhum instrutor encontrado para "${searchTerm}"`
                        : 'Não há instrutores cadastrados nesta escola'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="instrutores-grid">
                    {filteredInstrutores.map((instrutor) => (
                      <div 
                        key={instrutor.id} 
                        className="instrutor-card"
                        onClick={() => handleInstrutorSelect(instrutor)}
                      >
                        <div className="instrutor-header">
                          <div className="instrutor-avatar">
                            <span className="instrutor-initial">
                              {instrutor.name?.charAt(0)?.toUpperCase() || '👨‍🏫'}
                            </span>
                          </div>
                          <div className="instrutor-status">
                            <span className={`status-badge ${instrutor.status || 'ativo'}`}>
                              {instrutor.status || 'ativo'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="instrutor-info">
                          <h3 className="instrutor-name">{instrutor.name || 'Nome não informado'}</h3>
                          <p className="instrutor-email">{instrutor.email || 'Email não informado'}</p>
                          {instrutor.phone && (
                            <p className="instrutor-phone">📞 {instrutor.phone}</p>
                          )}
                          {instrutor.veiculoInfo ? (
                            <p className="instrutor-vehicle">
                              🚗 {instrutor.veiculoInfo.registration} - {instrutor.veiculoInfo.brand} {instrutor.veiculoInfo.model}
                            </p>
                          ) : (
                            <p className="instrutor-vehicle no-vehicle">🚗 Sem veículo atribuído</p>
                          )}
                        </div>
                        
                        <div className="instrutor-actions">
                          <button className="select-button">
                            Selecionar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelecionarInstrutorModal;
