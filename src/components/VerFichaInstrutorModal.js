import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import CriarAulaModal from './CriarAulaModal';
import EditarAulaModal from './EditarAulaModal';
import ConfirmarRemocaoAulaModal from './ConfirmarRemocaoAulaModal';
import './VerFichaInstrutorModal.css';

const VerFichaInstrutorModal = ({ instrutor, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('detalhes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [localInstrutor, setLocalInstrutor] = useState(instrutor);
  const [veiculoInfo, setVeiculoInfo] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [showCriarAulaModal, setShowCriarAulaModal] = useState(false);
  const [showEditarAulaModal, setShowEditarAulaModal] = useState(false);
  const [showRemoverAulaModal, setShowRemoverAulaModal] = useState(false);
  const [aulaSelecionada, setAulaSelecionada] = useState(null);

  useEffect(() => {
    if (instrutor) {
      setLocalInstrutor(instrutor);
      fetchVeiculoInfo();
      fetchAulas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrutor]);

  const fetchVeiculoInfo = async () => {
    if (instrutor.carroHabitual) {
      try {
        const veiculoRef = doc(db, 'schools', instrutor.escolaId, 'fleet', instrutor.carroHabitual);
        const veiculoSnap = await getDoc(veiculoRef);
        if (veiculoSnap.exists()) {
          setVeiculoInfo({ id: veiculoSnap.id, ...veiculoSnap.data() });
        }
      } catch (error) {
        console.error('Erro ao buscar veículo:', error);
      }
    }
  };

  const fetchAulas = async () => {
    try {
      if (!instrutor?.id) return;
      
      // Buscar aulas do instrutor
      const aulasRef = collection(db, 'aulas');
      const q = query(aulasRef, where('instrutorId', '==', instrutor.id));
      const aulasSnapshot = await getDocs(q);
      
      const aulasData = aulasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar por data (mais recentes primeiro)
      aulasData.sort((a, b) => {
        const dateA = new Date(a.data);
        const dateB = new Date(b.data);
        return dateB - dateA;
      });
      
      setAulas(aulasData);
    } catch (error) {
      console.error('Erro ao buscar aulas:', error);
      setError('Erro ao carregar aulas do instrutor');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocalInstrutor(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const instrutorRef = doc(db, 'utilizadores', instrutor.id);
      await updateDoc(instrutorRef, {
        name: localInstrutor.name,
        email: localInstrutor.email || null,
        phone: localInstrutor.phone || null,
        carroHabitual: localInstrutor.carroHabitual || null,
        updatedAt: Timestamp.now()
      });

      setEditing(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar instrutor:', error);
      setError('Erro ao atualizar instrutor');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEditing(false);
      setLocalInstrutor(instrutor);
      onClose();
    }
  };

  const handleCriarAula = () => {
    setShowCriarAulaModal(true);
  };

  const handleCloseCriarAula = () => {
    setShowCriarAulaModal(false);
  };

  const handleAulaSuccess = () => {
    fetchAulas();
    setShowCriarAulaModal(false);
  };

  const handleEditarAula = (aula) => {
    setAulaSelecionada(aula);
    setShowEditarAulaModal(true);
  };

  const handleCloseEditarAula = () => {
    setShowEditarAulaModal(false);
    setAulaSelecionada(null);
  };

  const handleEditarAulaSuccess = () => {
    fetchAulas();
    setShowEditarAulaModal(false);
    setAulaSelecionada(null);
  };

  const handleRemoverAula = (aula) => {
    setAulaSelecionada(aula);
    setShowRemoverAulaModal(true);
  };

  const handleCloseRemoverAula = () => {
    setShowRemoverAulaModal(false);
    setAulaSelecionada(null);
  };

  const handleConfirmarRemoverAula = async () => {
    if (!aulaSelecionada) return;

    setLoading(true);
    setError('');

    try {
      // Remover a aula da coleção
      const aulaRef = doc(db, 'aulas', aulaSelecionada.id);
      await deleteDoc(aulaRef);

      // Remover referência da aula dos alunos
      if (aulaSelecionada.alunos && aulaSelecionada.alunos.length > 0) {
        const updatePromises = aulaSelecionada.alunos.map(async (aluno) => {
          try {
            const alunoRef = doc(db, 'schools', instrutor.escolaId, 'students', aluno.id);
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
      try {
        const instrutorRef = doc(db, 'utilizadores', instrutor.id);
        await updateDoc(instrutorRef, {
          aulas: arrayRemove(aulaSelecionada.id),
          updatedAt: Timestamp.now()
        });
      } catch (error) {
        console.error('Erro ao remover aula do instrutor:', error);
      }

      // Atualizar lista de aulas
      await fetchAulas();
      setShowRemoverAulaModal(false);
      setAulaSelecionada(null);
    } catch (error) {
      console.error('Erro ao remover aula:', error);
      setError('Erro ao remover aula. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!instrutor) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content ver-ficha-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <div className="instrutor-avatar">
              <span className="instrutor-icon">👨‍🏫</span>
            </div>
            <div className="instrutor-title">
              <h2>{instrutor.name}</h2>
              <p>Instrutor de Condução</p>
            </div>
          </div>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="tabs-navigation">
            <button 
              className={`tab-button ${activeTab === 'detalhes' ? 'active' : ''}`}
              onClick={() => setActiveTab('detalhes')}
            >
              <span className="tab-icon">👤</span>
              <span className="tab-label">Detalhes</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'aulas' ? 'active' : ''}`}
              onClick={() => setActiveTab('aulas')}
            >
              <span className="tab-icon">📚</span>
              <span className="tab-label">Aulas</span>
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'detalhes' && (
              <div className="detalhes-section">
                <div className="section-header">
                  <h4>👤 Informações Pessoais</h4>
                  <button 
                    className="edit-button"
                    onClick={() => setEditing(!editing)}
                    disabled={loading}
                  >
                    {editing ? 'Cancelar' : '✏️ Editar'}
                  </button>
                </div>

                {editing ? (
                  <div className="edit-form">
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Nome Completo</label>
                        <input
                          type="text"
                          name="name"
                          value={localInstrutor.name || ''}
                          onChange={handleInputChange}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          name="email"
                          value={localInstrutor.email || ''}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Email (opcional)"
                        />
                      </div>
                      <div className="form-group">
                        <label>Telefone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={localInstrutor.phone || ''}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Telefone (opcional)"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Nome</span>
                      <span className="info-value">{instrutor.name || 'Não informado'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{instrutor.email || 'Não informado'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Telefone</span>
                      <span className="info-value">{instrutor.phone || 'Não informado'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Status</span>
                      <span className="info-value status-ativo">Ativo</span>
                    </div>
                  </div>
                )}

                <div className="section-header">
                  <h4>🚗 Veículo Habitual</h4>
                </div>

                {veiculoInfo ? (
                  <div className="veiculo-info">
                    <div className="veiculo-card">
                      <div className="veiculo-header">
                        <span className="veiculo-icon">🚗</span>
                        <div className="veiculo-details">
                          <h5>{veiculoInfo.registration}</h5>
                          <p>{veiculoInfo.brand} {veiculoInfo.model}</p>
                        </div>
                      </div>
                      <div className="veiculo-specs">
                        <span>Ano: {veiculoInfo.year || 'N/A'}</span>
                        <span>Tipo: {veiculoInfo.type || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-veiculo">
                    <span className="no-veiculo-icon">🚫</span>
                    <p>Nenhum veículo atribuído</p>
                  </div>
                )}

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                {editing && (
                  <div className="modal-actions">
                    <button 
                      className="cancel-button"
                      onClick={() => {
                        setEditing(false);
                        setLocalInstrutor(instrutor);
                      }}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="save-button"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      {loading ? 'A guardar...' : 'Guardar Alterações'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'aulas' && (
              <div className="aulas-section">
                <div className="section-header">
                  <h4>📚 Aulas do Instrutor</h4>
                  <button 
                    className="add-aula-button"
                    onClick={handleCriarAula}
                    disabled={loading}
                  >
                    ➕ Adicionar Aula
                  </button>
                </div>
                
                <div className="aulas-content">
                  {aulas.length === 0 ? (
                    <div className="empty-aulas">
                      <div className="empty-icon">📚</div>
                      <h3>Nenhuma aula registada</h3>
                      <p>As aulas do instrutor aparecerão aqui quando forem adicionadas.</p>
                      <button 
                        className="add-first-aula-button"
                        onClick={handleCriarAula}
                        disabled={loading}
                      >
                        📚 Adicionar Primeira Aula
                      </button>
                    </div>
                  ) : (
                    <div className="aulas-list">
                      {aulas.map((aula) => (
                        <div key={aula.id} className="aula-card">
                          <div className="aula-header">
                            <div className="aula-tipo">
                              <span className={`tipo-badge ${aula.tipo}`}>
                                {aula.tipo === 'teorica' ? '📚' : '🚗'} {aula.tipo === 'teorica' ? 'Teórica' : 'Prática'}
                              </span>
                            </div>
                            <div className="aula-header-right">
                              <div className="aula-status">
                                <span className={`status-badge ${aula.status}`}>
                                  {aula.status === 'agendada' ? '📅 Agendada' : 
                                   aula.status === 'realizada' ? '✅ Realizada' : 
                                   aula.status === 'cancelada' ? '❌ Cancelada' : aula.status}
                                </span>
                              </div>
                              <div className="aula-actions">
                                <button
                                  className="edit-aula-button"
                                  onClick={() => handleEditarAula(aula)}
                                  disabled={loading}
                                  title="Editar aula"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="remove-aula-button"
                                  onClick={() => handleRemoverAula(aula)}
                                  disabled={loading}
                                  title="Remover aula"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="aula-info">
                            <div className="aula-data-hora">
                              <span className="info-label">📅 Data:</span>
                              <span className="info-value">
                                {aula.data ? (aula.data.toDate ? aula.data.toDate().toLocaleDateString('pt-PT') : new Date(aula.data).toLocaleDateString('pt-PT')) : 'N/A'}
                              </span>
                            </div>
                            <div className="aula-data-hora">
                              <span className="info-label">🕐 Hora:</span>
                              <span className="info-value">{aula.hora || 'N/A'}</span>
                            </div>
                            <div className="aula-horas">
                              <span className="info-label">⏱️ Duração:</span>
                              <span className="info-value">{aula.horas || 1}h</span>
                            </div>
                            {aula.veiculoId && (
                              <div className="aula-veiculo">
                                <span className="info-label">🚗 Veículo:</span>
                                <span className="info-value">{aula.veiculoId}</span>
                              </div>
                            )}
                          </div>
                          
                          {aula.alunos && aula.alunos.length > 0 && (
                            <div className="aula-alunos">
                              <span className="info-label">👥 Alunos:</span>
                              <div className="alunos-list">
                                {aula.alunos.map((aluno, index) => (
                                  <span key={index} className="aluno-tag">
                                    {aluno.nome} ({aluno.numero})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {aula.observacoes && (
                            <div className="aula-observacoes">
                              <span className="info-label">📝 Observações:</span>
                              <span className="info-value">{aula.observacoes}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCriarAulaModal && (
        <CriarAulaModal
          instrutor={instrutor}
          onClose={handleCloseCriarAula}
          onSuccess={handleAulaSuccess}
        />
      )}

      {showEditarAulaModal && aulaSelecionada && (
        <EditarAulaModal
          aula={aulaSelecionada}
          instrutor={instrutor}
          onClose={handleCloseEditarAula}
          onSuccess={handleEditarAulaSuccess}
        />
      )}

      {showRemoverAulaModal && aulaSelecionada && (
        <ConfirmarRemocaoAulaModal
          isOpen={showRemoverAulaModal}
          onClose={handleCloseRemoverAula}
          aula={aulaSelecionada}
          onConfirm={handleConfirmarRemoverAula}
        />
      )}
    </div>
  );
};

export default VerFichaInstrutorModal;
