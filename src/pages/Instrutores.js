import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import AdicionarInstrutorModal from '../components/AdicionarInstrutorModal';
import VerFichaInstrutorModal from '../components/VerFichaInstrutorModal';
import SelecionarInstrutorModal from '../components/SelecionarInstrutorModal';
import CriarAulaModal from '../components/CriarAulaModal';
import './Instrutores.css';

const Instrutores = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [escola, setEscola] = useState(null);
  const [instrutores, setInstrutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [selectedInstrutor, setSelectedInstrutor] = useState(null);
  const [showSelecionarInstrutorModal, setShowSelecionarInstrutorModal] = useState(false);
  const [showCriarAulaModal, setShowCriarAulaModal] = useState(false);
  const [instrutorParaAula, setInstrutorParaAula] = useState(null);

  useEffect(() => {
    fetchEscola();
  }, [escolaId]);

  useEffect(() => {
    if (escola) {
      fetchInstrutores();
    }
  }, [escola]);

  const fetchEscola = async () => {
    try {
      setLoading(true);
      setError('');

      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);

      if (!escolaSnap.exists()) {
        setError('Escola não encontrada');
        return;
      }

      const escolaData = {
        id: escolaSnap.id,
        ...escolaSnap.data()
      };

      setEscola(escolaData);
    } catch (err) {
      console.error('Erro ao buscar escola:', err);
      setError('Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstrutores = async () => {
    try {
      const utilizadoresRef = collection(db, 'utilizadores');
      const q = query(
        utilizadoresRef,
        where('escolaId', '==', escolaId),
        where('role', '==', 'instrutor')
      );
      
      const querySnapshot = await getDocs(q);
      const instrutoresList = [];
      
      querySnapshot.forEach((doc) => {
        instrutoresList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Buscar informações dos veículos para cada instrutor
      const instrutoresComVeiculos = await Promise.all(
        instrutoresList.map(async (instrutor) => {
          if (instrutor.carroHabitual) {
            try {
              const veiculoRef = doc(db, 'schools', escolaId, 'fleet', instrutor.carroHabitual);
              const veiculoSnapshot = await getDoc(veiculoRef);
              if (veiculoSnapshot.exists()) {
                return {
                  ...instrutor,
                  veiculoInfo: {
                    id: veiculoSnapshot.id,
                    ...veiculoSnapshot.data()
                  }
                };
              }
            } catch (error) {
              console.error('Erro ao buscar veículo:', error);
            }
          }
          return instrutor;
        })
      );
      
      setInstrutores(instrutoresComVeiculos);
    } catch (err) {
      console.error('Erro ao buscar instrutores:', err);
      setError('Erro ao carregar lista de instrutores');
    }
  };

  const handleBack = () => {
    navigate(`/escola/${escolaId}`);
  };

  const handleCreateInstrutor = () => {
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
  };

  const handleInstrutorSuccess = () => {
    // Recarregar lista de instrutores
    fetchInstrutores();
  };

  const handleVerFicha = (instrutor) => {
    setSelectedInstrutor(instrutor);
    setShowFichaModal(true);
  };

  const handleCloseFicha = () => {
    setShowFichaModal(false);
    setSelectedInstrutor(null);
  };

  const handleFichaSuccess = () => {
    fetchInstrutores();
  };

  const handleCriarAula = () => {
    setShowSelecionarInstrutorModal(true);
  };

  const handleCloseSelecionarInstrutor = () => {
    setShowSelecionarInstrutorModal(false);
  };

  const handleInstrutorSelected = (instrutor) => {
    setInstrutorParaAula(instrutor);
    setShowCriarAulaModal(true);
  };

  const handleCloseCriarAula = () => {
    setShowCriarAulaModal(false);
    setInstrutorParaAula(null);
  };

  const handleAulaSuccess = () => {
    setShowCriarAulaModal(false);
    setInstrutorParaAula(null);
    // Opcional: mostrar mensagem de sucesso
  };

  const filteredInstrutores = instrutores.filter(instrutor =>
    instrutor.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="instrutores-page">
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
      <div className="instrutores-page">
        <div className="container">
          <div className="error-container">
            <h2>Erro</h2>
            <p>{error}</p>
            <button onClick={handleBack} className="retry-button">
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="instrutores-page">
      <div className="container">
        <div className="page-header">
          <button onClick={handleBack} className="back-button">
            ← Voltar
          </button>
          <h1>Instrutores - {escola?.name}</h1>
          <p className="subtitle">Gerir instrutores da escola</p>
        </div>

        <div className="instrutores-content">
          {/* Estatísticas */}
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon">👨‍🏫</div>
              <div className="stat-content">
                <div className="stat-number">{instrutores.length}</div>
                <div className="stat-label">Total de Instrutores</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">{instrutores.filter(i => i.status === 'ativo').length}</div>
                <div className="stat-label">Instrutores Ativos</div>
              </div>
            </div>
          </div>

          {/* Barra de pesquisa e botão de criar */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Pesquisar instrutores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="button-group">
              <button
                onClick={handleCriarAula}
                className="add-button criar-aula-button"
              >
                📚 Criar Aula
              </button>
              <button
                onClick={handleCreateInstrutor}
                className="add-button"
              >
                ➕ Criar Instrutor
              </button>
            </div>
          </div>

          {/* Lista de instrutores */}
          <div className="instrutores-container">
            <div className="instrutores-header">
              <h2>Lista de Instrutores</h2>
            </div>

            {filteredInstrutores.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👨‍🏫</div>
                <h3>
                  {searchTerm ? 'Nenhum instrutor encontrado' : 'Nenhum instrutor cadastrado'}
                </h3>
                <p>
                  {searchTerm 
                    ? 'Tente ajustar os termos de pesquisa.' 
                    : 'Comece criando o primeiro instrutor da escola.'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateInstrutor}
                    className="add-first-button"
                  >
                    ➕ Criar Primeiro Instrutor
                  </button>
                )}
              </div>
            ) : (
              <div className="instrutores-grid">
                {filteredInstrutores.map((instrutor) => (
                  <div key={instrutor.id} className="instrutor-card">
                    <div className="instrutor-header">
                      <div className="instrutor-avatar">
                        {instrutor.name?.charAt(0)?.toUpperCase() || '👨‍🏫'}
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
                      <p className="instrutor-role">Instrutor</p>
                    </div>
                    <div className="instrutor-actions">
                      <button 
                        className="view-ficha-button"
                        onClick={() => handleVerFicha(instrutor)}
                        title="Ver Ficha"
                      >
                        👁️ Ver Ficha
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para adicionar instrutor */}
      {showAddModal && (
        <AdicionarInstrutorModal
          escolaId={escolaId}
          onClose={handleCloseModal}
          onSuccess={handleInstrutorSuccess}
        />
      )}

      {showFichaModal && selectedInstrutor && (
        <VerFichaInstrutorModal
          instrutor={selectedInstrutor}
          onClose={handleCloseFicha}
          onSuccess={handleFichaSuccess}
        />
      )}

      {showSelecionarInstrutorModal && (
        <SelecionarInstrutorModal
          escolaId={escolaId}
          onClose={handleCloseSelecionarInstrutor}
          onInstrutorSelected={handleInstrutorSelected}
        />
      )}

      {showCriarAulaModal && instrutorParaAula && (
        <CriarAulaModal
          instrutor={instrutorParaAula}
          onClose={handleCloseCriarAula}
          onSuccess={handleAulaSuccess}
        />
      )}
    </div>
  );
};

export default Instrutores;
