import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import AdicionarVeiculoModal from '../components/AdicionarVeiculoModal';
import VerFichaVeiculoModal from '../components/VerFichaVeiculoModal';
import ConfirmarRemocaoVeiculoModal from '../components/ConfirmarRemocaoVeiculoModal';
import './Frota.css';

const Frota = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const [escola, setEscola] = useState(null);
  const [vehicles, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState(null);

  useEffect(() => {
    fetchEscola();
  }, [escolaId]);

  useEffect(() => {
    if (escola) {
      fetchVeiculos();
    }
  }, [escola]);

  const fetchEscola = async () => {
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);
      
      if (escolaSnap.exists()) {
        setEscola({ id: escolaSnap.id, ...escolaSnap.data() });
      } else {
        setError('Escola não encontrada');
      }
    } catch (err) {
      console.error('Erro ao buscar escola:', err);
      setError('Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  const fetchVeiculos = async () => {
    try {
      console.log('🔍 Buscando veículos para escola:', escolaId);
      const vehiclesRef = collection(db, 'schools', escolaId, 'fleet');
      const vehiclesSnap = await getDocs(query(vehiclesRef, orderBy('registration')));
      
      console.log('📊 Resultado da busca:', {
        totalDocs: vehiclesSnap.docs.length,
        isEmpty: vehiclesSnap.empty
      });
      
      const vehiclesData = [];
      vehiclesSnap.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        console.log('🚗 Veículo encontrado:', data);
        vehiclesData.push(data);
      });
      
      console.log('✅ Veículos carregados:', vehiclesData.length);
      setVeiculos(vehiclesData);
    } catch (err) {
      console.error('❌ Erro ao buscar veículos:', err);
      setError('Erro ao carregar veículos');
    }
  };

  const handleVoltar = () => {
    navigate(`/escola/${escolaId}`);
  };

  const handleAddVeiculo = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleSuccess = async () => {
    await fetchVeiculos();
    if (selectedVeiculo) {
      const updatedVeiculo = vehicles.find(v => v.id === selectedVeiculo.id);
      if (updatedVeiculo) {
        setSelectedVeiculo(updatedVeiculo);
      }
    }
  };

  const handleVerFicha = (veiculo) => {
    setSelectedVeiculo(veiculo);
    setShowFichaModal(true);
  };

  const handleCloseFichaModal = () => {
    setShowFichaModal(false);
    setSelectedVeiculo(null);
  };

  const handleRemover = (veiculo) => {
    setSelectedVeiculo(veiculo);
    setShowRemoveModal(true);
  };

  const handleCloseRemoveModal = () => {
    setShowRemoveModal(false);
    setSelectedVeiculo(null);
  };

  const handleConfirmRemove = async () => {
    try {
      const veiculoRef = doc(db, 'schools', escolaId, 'fleet', selectedVeiculo.id);
      await deleteDoc(veiculoRef);
      
      setVeiculos(vehicles.filter(v => v.id !== selectedVeiculo.id));
      setShowRemoveModal(false);
      setSelectedVeiculo(null);
    } catch (err) {
      console.error('Erro ao remover veículo:', err);
      setError('Erro ao remover veículo');
    }
  };

  const filteredVeiculos = vehicles.filter(veiculo =>
    veiculo.registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    veiculo.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    veiculo.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('pt-PT');
  };

  const isDocumentExpired = (date) => {
    if (!date) return false;
    const d = date.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    const diffTime = d - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 30; // Expira em 30 dias
  };

  if (loading) {
    return (
      <div className="frota-page">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>A carregar dados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="frota-page">
        <div className="container">
          <div className="error-container">
            <h2>Erro</h2>
            <p>{error}</p>
            <button onClick={handleVoltar} className="retry-button">
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="frota-page">
      <div className="container">
        <div className="page-header">
          <button onClick={handleVoltar} className="back-button">
            ← Voltar
          </button>
          <h1>Frota - {escola?.name}</h1>
          <p className="subtitle">Gestão de veículos da escola</p>
        </div>

        <div className="frota-content">
          {/* Estatísticas */}
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon">🚗</div>
              <div className="stat-content">
                <div className="stat-number">{vehicles.length}</div>
                <div className="stat-label">Total de Veículos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-number">
                  {vehicles.filter(v => 
                    isDocumentExpired(v.validadeSeguro) || 
                    isDocumentExpired(v.validadeInspecao)
                  ).length}
                </div>
                <div className="stat-label">Documentos a Expirar</div>
              </div>
            </div>
          </div>

          {/* Barra de pesquisa e botão de criar */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Pesquisar por matrícula, marca ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button
              onClick={handleAddVeiculo}
              className="add-button"
            >
              ➕ Adicionar Veículo
            </button>
          </div>

          {/* Lista de veículos */}
          <div className="vehicles-container">
            <div className="vehicles-header">
              <h2>Lista de Veículos</h2>
            </div>
          
            {filteredVeiculos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🚗</div>
                <h3>
                  {searchTerm ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado'}
                </h3>
                <p>
                  {searchTerm 
                    ? 'Tente ajustar os termos de pesquisa.' 
                    : 'Comece adicionando o primeiro veículo da frota.'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleAddVeiculo}
                    className="add-first-button"
                  >
                    ➕ Adicionar Primeiro Veículo
                  </button>
                )}
              </div>
            ) : (
              <div className="vehicles-grid">
                {filteredVeiculos.map(veiculo => (
                  <div key={veiculo.id} className="veiculo-card">
                    <div className="veiculo-header">
                      <div className="veiculo-avatar">
                        <span className="veiculo-icon">🚗</span>
                      </div>
                      <div className="veiculo-title">
                        <h3 className="veiculo-matricula">{veiculo.registration}</h3>
                        <p className="veiculo-subtitle">{veiculo.brand} {veiculo.model}</p>
                      </div>
                      <div className="veiculo-actions">
                        <button 
                          className="action-btn view"
                          onClick={() => handleVerFicha(veiculo)}
                          title="Ver Detalhes"
                        >
                          👁️
                        </button>
                        <button 
                          className="action-btn remove"
                          onClick={() => handleRemover(veiculo)}
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="veiculo-info">
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-icon">🏷️</span>
                          <div className="info-content">
                            <span className="info-label">Marca</span>
                            <span className="info-value">{veiculo.brand || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon">🚙</span>
                          <div className="info-content">
                            <span className="info-label">Modelo</span>
                            <span className="info-value">{veiculo.model || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon">📅</span>
                          <div className="info-content">
                            <span className="info-label">Ano</span>
                            <span className="info-value">{veiculo.year || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon">🔧</span>
                          <div className="info-content">
                            <span className="info-label">Tipo</span>
                            <span className="info-value">{veiculo.type || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="veiculo-docs">
                      <div className="docs-header">
                        <span className="docs-title">📋 Documentação</span>
                      </div>
                      <div className="docs-grid">
                        <div className="doc-item">
                          <span className="doc-icon">🛡️</span>
                          <div className="doc-content">
                            <span className="doc-label">Seguro</span>
                            <span className={`doc-value ${isDocumentExpired(veiculo.insuranceExpiry) ? 'expired' : 'valid'}`}>
                              {formatDate(veiculo.insuranceExpiry)}
                            </span>
                          </div>
                        </div>
                        <div className="doc-item">
                          <span className="doc-icon">🔍</span>
                          <div className="doc-content">
                            <span className="doc-label">Inspeção</span>
                            <span className={`doc-value ${isDocumentExpired(veiculo.inspectionExpiry) ? 'expired' : 'valid'}`}>
                              {formatDate(veiculo.inspectionExpiry)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AdicionarVeiculoModal
          escolaId={escolaId}
          onClose={handleCloseAddModal}
          onSuccess={handleSuccess}
        />
      )}

      {showFichaModal && selectedVeiculo && (
        <VerFichaVeiculoModal
          veiculo={selectedVeiculo}
          escolaId={escolaId}
          onClose={handleCloseFichaModal}
          onSuccess={handleSuccess}
        />
      )}

      {showRemoveModal && selectedVeiculo && (
        <ConfirmarRemocaoVeiculoModal
          veiculo={selectedVeiculo}
          onClose={handleCloseRemoveModal}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  );
};

export default Frota;
