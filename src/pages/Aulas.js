import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where, doc, getDoc, deleteDoc, updateDoc, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import CriarAulaModal from '../components/CriarAulaModal';
import EditarAulaModal from '../components/EditarAulaModal';
import ConfirmarRemocaoAulaModal from '../components/ConfirmarRemocaoAulaModal';
import SelecionarInstrutorModal from '../components/SelecionarInstrutorModal';
import './Aulas.css';

const Aulas = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const [escola, setEscola] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [instrutores, setInstrutores] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todas'); // 'todas', 'teorica', 'pratica'
  const [filtroStatus, setFiltroStatus] = useState('todas'); // 'todas', 'agendada', 'realizada', 'cancelada'
  const [filtroData, setFiltroData] = useState('');
  const [filtroInstrutor, setFiltroInstrutor] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCriarAulaModal, setShowCriarAulaModal] = useState(false);
  const [showEditarAulaModal, setShowEditarAulaModal] = useState(false);
  const [showRemoverAulaModal, setShowRemoverAulaModal] = useState(false);
  const [showSelecionarInstrutorModal, setShowSelecionarInstrutorModal] = useState(false);
  const [aulaSelecionada, setAulaSelecionada] = useState(null);
  const [instrutorParaAula, setInstrutorParaAula] = useState(null);

  useEffect(() => {
    fetchEscola();
  }, [escolaId]);

  useEffect(() => {
    if (escola) {
      fetchAulas();
      fetchInstrutores();
    }
  }, [escola]);

  const fetchEscola = async () => {
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);

      if (!escolaSnap.exists()) {
        setError('Escola não encontrada');
        return;
      }

      setEscola({
        id: escolaSnap.id,
        ...escolaSnap.data()
      });
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
      const instrutoresMap = {};
      
      querySnapshot.forEach((doc) => {
        instrutoresMap[doc.id] = {
          id: doc.id,
          ...doc.data()
        };
      });

      setInstrutores(instrutoresMap);
    } catch (err) {
      console.error('Erro ao buscar instrutores:', err);
    }
  };

  const fetchAulas = async () => {
    try {
      const aulasRef = collection(db, 'aulas');
      const q = query(
        aulasRef,
        where('escolaId', '==', escolaId)
      );
      
      const querySnapshot = await getDocs(q);
      const aulasData = [];
      
      querySnapshot.forEach((doc) => {
        aulasData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Ordenar manualmente por data (mais recentes primeiro)
      // A data é armazenada como string no formato YYYY-MM-DD, então podemos ordenar diretamente
      aulasData.sort((a, b) => {
        const dateA = a.data || '';
        const dateB = b.data || '';
        // Se tiver hora, combinar data e hora para ordenação mais precisa
        const timeA = a.hora || '';
        const timeB = b.hora || '';
        const fullA = dateA + 'T' + timeA;
        const fullB = dateB + 'T' + timeB;
        return fullB.localeCompare(fullA); // Descendente (mais recente primeiro)
      });

      setAulas(aulasData);
    } catch (err) {
      console.error('Erro ao buscar aulas:', err);
      setError('Erro ao carregar aulas');
    }
  };

  const handleBack = () => {
    navigate(`/escola/${escolaId}`);
  };

  const handleCriarAula = () => {
    setShowSelecionarInstrutorModal(true);
  };

  const handleInstrutorSelecionado = (instrutor) => {
    setInstrutorParaAula(instrutor);
    setShowSelecionarInstrutorModal(false);
    setShowCriarAulaModal(true);
  };

  const handleEditarAula = (aula) => {
    const instrutor = instrutores[aula.instrutorId];
    if (instrutor) {
      setInstrutorParaAula(instrutor);
      setAulaSelecionada(aula);
      setShowEditarAulaModal(true);
    }
  };

  const handleRemoverAula = (aula) => {
    setAulaSelecionada(aula);
    setShowRemoverAulaModal(true);
  };

  const handleAulaSuccess = () => {
    fetchAulas();
    setShowCriarAulaModal(false);
    setShowEditarAulaModal(false);
    setInstrutorParaAula(null);
    setAulaSelecionada(null);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Data não disponível';
    try {
      // Handle Firestore Timestamp
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        const date = dateValue.toDate();
        return date.toLocaleDateString('pt-PT', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // Handle string date (YYYY-MM-DD format from input)
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          return dateValue; // Return original if invalid
        }
        return date.toLocaleDateString('pt-PT', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // Handle Date object
      if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString('pt-PT', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      return String(dateValue);
    } catch {
      return String(dateValue || 'Data não disponível');
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString;
  };

  const filteredAulas = aulas.filter(aula => {
    // Filtro por tipo
    if (filtroTipo !== 'todas' && aula.tipo !== filtroTipo) {
      return false;
    }

    // Filtro por status
    if (filtroStatus !== 'todas' && aula.status !== filtroStatus) {
      return false;
    }

    // Filtro por instrutor
    if (filtroInstrutor !== 'todos' && aula.instrutorId !== filtroInstrutor) {
      return false;
    }

    // Filtro por data
    if (filtroData && aula.data !== filtroData) {
      return false;
    }

    // Filtro por texto (pesquisa em nome do instrutor, alunos, observações)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const instrutorNome = instrutores[aula.instrutorId]?.name?.toLowerCase() || '';
      const alunosNomes = aula.alunos?.map(a => a.nome?.toLowerCase() || '').join(' ') || '';
      const observacoes = aula.observacoes?.toLowerCase() || '';
      
      if (!instrutorNome.includes(searchLower) && 
          !alunosNomes.includes(searchLower) && 
          !observacoes.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  const instrutoresList = Object.values(instrutores);

  if (loading) {
    return (
      <div className="aulas-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar aulas...</p>
        </div>
      </div>
    );
  }

  if (error && !escola) {
    return (
      <div className="aulas-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="error-container">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aulas-page">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
      
      <div className="container">
        <div className="page-header">
          <h1>📚 Aulas - {escola?.name}</h1>
          <p className="subtitle">Gerir aulas da escola</p>
        </div>

        {/* Estatísticas */}
        <div className="aulas-stats">
          <div className="stat-card">
            <h3>Total de Aulas</h3>
            <span className="stat-number">{aulas.length}</span>
          </div>
          <div className="stat-card">
            <h3>Agendadas</h3>
            <span className="stat-number">
              {aulas.filter(a => a.status === 'agendada').length}
            </span>
          </div>
          <div className="stat-card">
            <h3>Realizadas</h3>
            <span className="stat-number">
              {aulas.filter(a => a.status === 'realizada').length}
            </span>
          </div>
          <div className="stat-card">
            <h3>Canceladas</h3>
            <span className="stat-number">
              {aulas.filter(a => a.status === 'cancelada').length}
            </span>
          </div>
        </div>

        {/* Filtros e pesquisa */}
        <div className="filters-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Pesquisar por instrutor, aluno ou observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <label>Tipo:</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="filter-select"
              >
                <option value="todas">Todas</option>
                <option value="teorica">Teórica</option>
                <option value="pratica">Prática</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="filter-select"
              >
                <option value="todas">Todas</option>
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Instrutor:</label>
              <select
                value={filtroInstrutor}
                onChange={(e) => setFiltroInstrutor(e.target.value)}
                className="filter-select"
              >
                <option value="todos">Todos</option>
                {instrutoresList.map(instrutor => (
                  <option key={instrutor.id} value={instrutor.id}>
                    {instrutor.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Data:</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="filter-input"
              />
            </div>

            <button
              onClick={() => {
                setFiltroTipo('todas');
                setFiltroStatus('todas');
                setFiltroInstrutor('todos');
                setFiltroData('');
                setSearchTerm('');
              }}
              className="clear-filters-button"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Botão criar aula */}
        <div className="actions-bar">
          <button
            onClick={handleCriarAula}
            className="add-button"
          >
            ➕ Criar Nova Aula
          </button>
        </div>

        {/* Lista de aulas */}
        <div className="aulas-container">
          {filteredAulas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>
                {searchTerm || filtroTipo !== 'todas' || filtroStatus !== 'todas' || filtroInstrutor !== 'todos' || filtroData
                  ? 'Nenhuma aula encontrada'
                  : 'Nenhuma aula cadastrada'}
              </h3>
              <p>
                {searchTerm || filtroTipo !== 'todas' || filtroStatus !== 'todas' || filtroInstrutor !== 'todos' || filtroData
                  ? 'Tente ajustar os filtros de pesquisa.'
                  : 'Comece criando a primeira aula da escola.'}
              </p>
              {!searchTerm && filtroTipo === 'todas' && filtroStatus === 'todas' && filtroInstrutor === 'todos' && !filtroData && (
                <button
                  onClick={handleCriarAula}
                  className="add-first-button"
                >
                  ➕ Criar Primeira Aula
                </button>
              )}
            </div>
          ) : (
            <div className="aulas-list">
              {filteredAulas.map((aula) => {
                const instrutor = instrutores[aula.instrutorId];
                return (
                  <div key={aula.id} className={`aula-card ${aula.tipo}`}>
                    <div className="aula-header">
                      <div className="aula-tipo">
                        <span className={`tipo-badge ${aula.tipo}`}>
                          {aula.tipo === 'teorica' ? '📚 Teórica' : '🚗 Prática'}
                        </span>
                      </div>
                      <div className="aula-status">
                        <span className={`status-badge ${aula.status}`}>
                          {aula.status === 'agendada' ? '📅 Agendada' : 
                           aula.status === 'realizada' ? '✅ Realizada' : 
                           aula.status === 'cancelada' ? '❌ Cancelada' : aula.status}
                        </span>
                      </div>
                    </div>

                    <div className="aula-content">
                      <div className="aula-info-row">
                        <div className="aula-info-item">
                          <strong>Instrutor:</strong> {instrutor?.name || 'Não encontrado'}
                        </div>
                        <div className="aula-info-item">
                          <strong>Data:</strong> {formatDate(aula.data)}
                        </div>
                        <div className="aula-info-item">
                          <strong>Hora:</strong> {formatTime(aula.hora)}
                        </div>
                        <div className="aula-info-item">
                          <strong>Duração:</strong> {(() => {
                            const minutos = aula.minutos || (aula.horas ? Math.round(parseFloat(aula.horas) * 60) : 60);
                            if (minutos >= 60) {
                              const horas = Math.floor(minutos / 60);
                              const mins = minutos % 60;
                              return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
                            }
                            return `${minutos} min`;
                          })()}
                        </div>
                      </div>

                      {aula.alunos && aula.alunos.length > 0 && (
                        <div className="aula-alunos">
                          <strong>Alunos:</strong>
                          <div className="alunos-tags">
                            {aula.alunos.map((aluno, idx) => (
                              <span key={idx} className="aluno-tag">
                                {aluno.nome || aluno.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {aula.observacoes && (
                        <div className="aula-observacoes">
                          <strong>Observações:</strong> {aula.observacoes}
                        </div>
                      )}
                    </div>

                    <div className="aula-actions">
                      <button
                        onClick={() => handleEditarAula(aula)}
                        className="edit-button"
                        title="Editar aula"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleRemoverAula(aula)}
                        className="remove-button"
                        title="Remover aula"
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSelecionarInstrutorModal && (
        <SelecionarInstrutorModal
          escolaId={escolaId}
          onClose={() => setShowSelecionarInstrutorModal(false)}
          onSelect={handleInstrutorSelecionado}
        />
      )}

      {showCriarAulaModal && instrutorParaAula && (
        <CriarAulaModal
          instrutor={instrutorParaAula}
          onClose={() => {
            setShowCriarAulaModal(false);
            setInstrutorParaAula(null);
          }}
          onSuccess={handleAulaSuccess}
        />
      )}

      {showEditarAulaModal && instrutorParaAula && aulaSelecionada && (
        <EditarAulaModal
          aula={aulaSelecionada}
          instrutor={instrutorParaAula}
          onClose={() => {
            setShowEditarAulaModal(false);
            setInstrutorParaAula(null);
            setAulaSelecionada(null);
          }}
          onSuccess={handleAulaSuccess}
        />
      )}

      {showRemoverAulaModal && aulaSelecionada && (
        <ConfirmarRemocaoAulaModal
          isOpen={showRemoverAulaModal}
          aula={aulaSelecionada}
          onClose={() => {
            setShowRemoverAulaModal(false);
            setAulaSelecionada(null);
          }}
          onConfirm={async () => {
            try {
              // Remover a aula da coleção
              const aulaRef = doc(db, 'aulas', aulaSelecionada.id);
              await deleteDoc(aulaRef);

              // Remover referência da aula dos alunos
              if (aulaSelecionada.alunos && aulaSelecionada.alunos.length > 0) {
                const updatePromises = aulaSelecionada.alunos.map(async (aluno) => {
                  try {
                    const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
                    await updateDoc(alunoRef, {
                      aulas: arrayRemove(aulaSelecionada.id),
                      updatedAt: Timestamp.now()
                    });
                  } catch (error) {
                    console.error(`Erro ao remover aula do aluno ${aluno.id}:`, error);
                  }
                });
                await Promise.all(updatePromises);
              }

              // Remover referência da aula do instrutor
              if (aulaSelecionada.instrutorId) {
                try {
                  const instrutorRef = doc(db, 'utilizadores', aulaSelecionada.instrutorId);
                  await updateDoc(instrutorRef, {
                    aulas: arrayRemove(aulaSelecionada.id),
                    updatedAt: Timestamp.now()
                  });
                } catch (error) {
                  console.error('Erro ao remover aula do instrutor:', error);
                }
              }

              // Atualizar lista de aulas
              await fetchAulas();
              setShowRemoverAulaModal(false);
              setAulaSelecionada(null);
            } catch (error) {
              console.error('Erro ao remover aula:', error);
              throw error;
            }
          }}
        />
      )}
    </div>
  );
};

export default Aulas;

