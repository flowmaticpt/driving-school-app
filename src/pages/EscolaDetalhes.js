import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp, collection, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import './EscolaDetalhes.css';

const DEFAULT_ALERT_CONFIG = {
  licencaDias: 30,
  exameDias: 30,
  seguroDias: 30,
  inspecaoDias: 30,
  dividaLimite: 0,
  stockMinimo: 0,
  aulasMaximas: 32,
};

const EscolaDetalhes = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const { userData, logout } = useAuth();
  const [escola, setEscola] = useState(null);
  const [, setGrupo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [alertas, setAlertas] = useState([]);
  const [alertConfig, setAlertConfig] = useState(DEFAULT_ALERT_CONFIG);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [editAlertConfig, setEditAlertConfig] = useState(DEFAULT_ALERT_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchEscola = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🏫 EscolaDetalhes: Buscando escola com ID:', escolaId);
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);

      console.log('📊 EscolaDetalhes: Resultado da busca:', { 
        exists: escolaSnap.exists(), 
        hasData: escolaSnap.exists() ? escolaSnap.data() : null 
      });

      if (!escolaSnap.exists()) {
        console.error('❌ EscolaDetalhes: Escola não encontrada na base de dados');
        setError('Escola não encontrada');
        return;
      }

      const escolaData = {
        id: escolaSnap.id,
        ...escolaSnap.data()
      };

      console.log('✅ EscolaDetalhes: Escola encontrada:', { 
        id: escolaData.id, 
        name: escolaData.name 
      });

      setEscola(escolaData);
      setEditData({
        name: escolaData.name || '',
        address: escolaData.address || '',
        phone: escolaData.number || '',
        email: escolaData.email || ''
      });

      // Carregar configuração de alertas
      const config = { ...DEFAULT_ALERT_CONFIG, ...(escolaData.alertConfig || {}) };
      setAlertConfig(config);
      setEditAlertConfig(config);

      // Buscar grupo se a escola tiver um
      if (escolaData.groupID) {
        console.log('👥 EscolaDetalhes: Buscando grupo com ID:', escolaData.groupID);
        const grupoRef = doc(db, 'groups', escolaData.groupID);
        const grupoSnap = await getDoc(grupoRef);

        if (grupoSnap.exists()) {
          const grupoData = {
            id: grupoSnap.id,
            ...grupoSnap.data()
          };
          console.log('✅ EscolaDetalhes: Grupo encontrado:', { id: grupoData.id, name: grupoData.name });
          setGrupo(grupoData);
        } else {
          console.log('⚠️ EscolaDetalhes: Grupo não encontrado');
        }
      }

      // Buscar alertas COM a config carregada da escola
      fetchAlertas(config);
    } catch (err) {
      console.error('Erro ao buscar escola:', err);
      setError('Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertas = async (config) => {
    const cfg = config || alertConfig;
    try {
      const alerts = [];
      const hoje = new Date();

      // Helper: converter Firestore Timestamp ou string para Date
      const toDate = (val) => {
        if (!val) return null;
        if (val.toDate) return val.toDate();
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      // Buscar alunos para verificar licenças, exames e dívidas
      const studentsRef = collection(db, 'schools', escolaId, 'students');
      const studentsSnap = await getDocs(query(studentsRef, limit(1000)));

      studentsSnap.forEach(docSnap => {
        const aluno = docSnap.data();
        if (aluno.active === false) return; // Ignorar alunos inativos
        const alunoName = aluno.name || 'Aluno sem nome';

        // Verificar licença de aprendizagem
        if (cfg.licencaDias > 0) {
          const limiteData = new Date();
          limiteData.setDate(hoje.getDate() + cfg.licencaDias);

          // Usar licenseExpiryDate se existir, senão calcular a partir de licenseIssueDate
          let expiracao = null;
          if (aluno.licenseExpiryDate) {
            expiracao = toDate(aluno.licenseExpiryDate);
          } else if (aluno.licenseIssueDate) {
            expiracao = toDate(aluno.licenseIssueDate);
            if (expiracao) expiracao.setFullYear(expiracao.getFullYear() + 2);
          }

          if (expiracao && expiracao <= limiteData) {
            const diasRestantes = Math.ceil((expiracao - hoje) / (1000 * 60 * 60 * 24));
            alerts.push({
              tipo: 'licenca',
              icon: '📄',
              cor: diasRestantes <= 0 ? '#e74c3c' : '#f39c12',
              titulo: diasRestantes <= 0
                ? `Licença de aprendizagem expirada`
                : `Licença expira em ${diasRestantes} dias`,
              descricao: `${alunoName} — ${expiracao.toLocaleDateString('pt-PT')}`,
              prioridade: diasRestantes <= 0 ? 0 : 1
            });
          }
        }

        // Verificar exame teórico agendado
        if (cfg.exameDias > 0 && aluno.theoreticalExamDate && !aluno.theoreticalExamResult) {
          const dataExame = toDate(aluno.theoreticalExamDate);
          if (dataExame) {
            const diasAte = Math.ceil((dataExame - hoje) / (1000 * 60 * 60 * 24));
            if (diasAte >= 0 && diasAte <= cfg.exameDias) {
              alerts.push({
                tipo: 'exame',
                icon: '📝',
                cor: diasAte <= 3 ? '#e74c3c' : '#3498db',
                titulo: diasAte === 0
                  ? `Exame teórico hoje`
                  : `Exame teórico em ${diasAte} dias`,
                descricao: `${alunoName} — ${dataExame.toLocaleDateString('pt-PT')}`,
                prioridade: diasAte <= 3 ? 0 : 2
              });
            }
          }
        }

        // Verificar exame prático agendado
        if (cfg.exameDias > 0 && aluno.practicalExamDate && !aluno.practicalExamResult) {
          const dataExame = toDate(aluno.practicalExamDate);
          if (dataExame) {
            const diasAte = Math.ceil((dataExame - hoje) / (1000 * 60 * 60 * 24));
            if (diasAte >= 0 && diasAte <= cfg.exameDias) {
              alerts.push({
                tipo: 'exame',
                icon: '🚗',
                cor: diasAte <= 3 ? '#e74c3c' : '#3498db',
                titulo: diasAte === 0
                  ? `Exame prático hoje`
                  : `Exame prático em ${diasAte} dias`,
                descricao: `${alunoName} — ${dataExame.toLocaleDateString('pt-PT')}`,
                prioridade: diasAte <= 3 ? 0 : 2
              });
            }
          }
        }

        // Verificar dívida do aluno
        if (cfg.dividaLimite > 0 && aluno.totalDivida > cfg.dividaLimite) {
          alerts.push({
            tipo: 'divida',
            icon: '💰',
            cor: aluno.totalDivida > cfg.dividaLimite * 2 ? '#e74c3c' : '#f39c12',
            titulo: `Dívida de ${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(aluno.totalDivida)}`,
            descricao: `${alunoName} — acima do limite de ${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cfg.dividaLimite)}`,
            prioridade: 1
          });
        }
      });

      // Buscar veículos para verificar seguro e inspeção
      const fleetRef = collection(db, 'schools', escolaId, 'fleet');
      const fleetSnap = await getDocs(query(fleetRef, limit(500)));

      fleetSnap.forEach(docSnap => {
        const veiculo = docSnap.data();
        const matricula = veiculo.registration || 'Sem matrícula';
        const veiculoDesc = `${matricula} (${veiculo.brand || ''} ${veiculo.model || ''})`;

        // Verificar seguro
        if (cfg.seguroDias > 0 && veiculo.insuranceExpiry) {
          const expDate = toDate(veiculo.insuranceExpiry);
          if (expDate) {
            const diasRestantes = Math.ceil((expDate - hoje) / (1000 * 60 * 60 * 24));
            if (diasRestantes <= cfg.seguroDias) {
              alerts.push({
                tipo: 'veiculo',
                icon: '🛡️',
                cor: diasRestantes <= 0 ? '#e74c3c' : '#f39c12',
                titulo: diasRestantes <= 0
                  ? `Seguro expirado`
                  : `Seguro expira em ${diasRestantes} dias`,
                descricao: `${veiculoDesc} — ${expDate.toLocaleDateString('pt-PT')}`,
                prioridade: diasRestantes <= 0 ? 0 : 1
              });
            }
          }
        }

        // Verificar inspeção
        if (cfg.inspecaoDias > 0 && veiculo.inspectionExpiry) {
          const expDate = toDate(veiculo.inspectionExpiry);
          if (expDate) {
            const diasRestantes = Math.ceil((expDate - hoje) / (1000 * 60 * 60 * 24));
            if (diasRestantes <= cfg.inspecaoDias) {
              alerts.push({
                tipo: 'veiculo',
                icon: '🔍',
                cor: diasRestantes <= 0 ? '#e74c3c' : '#f39c12',
                titulo: diasRestantes <= 0
                  ? `Inspeção expirada`
                  : `Inspeção expira em ${diasRestantes} dias`,
                descricao: `${veiculoDesc} — ${expDate.toLocaleDateString('pt-PT')}`,
                prioridade: diasRestantes <= 0 ? 0 : 1
              });
            }
          }
        }
      });

      // Verificar stock mínimo de materiais
      if (cfg.stockMinimo > 0) {
        const materialsRef = collection(db, 'schools', escolaId, 'materials');
        const materialsSnap = await getDocs(query(materialsRef, limit(500)));

        materialsSnap.forEach(docSnap => {
          const material = docSnap.data();
          const stock = material.currentStock ?? material.quantity ?? 0;
          if (stock < cfg.stockMinimo) {
            alerts.push({
              tipo: 'stock',
              icon: '📦',
              cor: stock <= 0 ? '#e74c3c' : '#f39c12',
              titulo: stock <= 0
                ? `${material.name} sem stock`
                : `${material.name} com stock baixo (${stock})`,
              descricao: `Abaixo do mínimo de ${cfg.stockMinimo} unidades`,
              prioridade: stock <= 0 ? 0 : 2
            });
          }
        });
      }

      // Verificar alunos com excesso de aulas
      if (cfg.aulasMaximas > 0) {
        const aulasRef = collection(db, 'aulas');
        const aulasSnap = await getDocs(query(aulasRef, where('escolaId', '==', escolaId)));

        // Contar aulas por aluno
        const aulasPorAluno = {};
        aulasSnap.forEach(docSnap => {
          const aula = docSnap.data();
          if (aula.alunos && Array.isArray(aula.alunos)) {
            aula.alunos.forEach(alunoId => {
              aulasPorAluno[alunoId] = (aulasPorAluno[alunoId] || 0) + 1;
            });
          }
        });

        // Criar mapa de nomes dos alunos
        const nomeAlunos = {};
        studentsSnap.forEach(docSnap => {
          nomeAlunos[docSnap.id] = docSnap.data().name || 'Aluno sem nome';
        });

        for (const [alunoId, totalAulas] of Object.entries(aulasPorAluno)) {
          if (totalAulas > cfg.aulasMaximas) {
            const nome = nomeAlunos[alunoId] || 'Aluno';
            alerts.push({
              tipo: 'aulas',
              icon: '🚨',
              cor: '#e74c3c',
              titulo: `${totalAulas} aulas registadas (limite: ${cfg.aulasMaximas})`,
              descricao: `${nome} — excedeu o limite legal de aulas`,
              prioridade: 0
            });
          }
        }
      }

      // Ordenar por prioridade (0 = mais urgente)
      alerts.sort((a, b) => a.prioridade - b.prioridade);
      setAlertas(alerts);
    } catch (err) {
      console.error('Erro ao buscar alertas:', err);
    }
  };

  const handleSaveAlertConfig = async () => {
    setSavingConfig(true);
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      await updateDoc(escolaRef, {
        alertConfig: editAlertConfig,
        updatedAt: Timestamp.now()
      });
      setAlertConfig(editAlertConfig);
      setShowAlertConfig(false);
      // Re-calcular alertas com a nova configuração
      fetchAlertas(editAlertConfig);
    } catch (err) {
      console.error('Erro ao guardar configuração de alertas:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    console.log('🔄 EscolaDetalhes: useEffect executado com escolaId:', escolaId);
    if (escolaId) {
      fetchEscola();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaId]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: escola.name || '',
      address: escola.address || '',
      phone: escola.number || '',
      email: escola.email || ''
    });
  };

  const handleSave = async () => {
    try {
      console.log('💾 EscolaDetalhes: Salvando alterações da escola:', escolaId);
      const escolaRef = doc(db, 'schools', escolaId);
      await updateDoc(escolaRef, {
        name: editData.name.trim(),
        address: editData.address.trim(),
        number: editData.phone.trim(),
        email: editData.email.trim(),
        updatedAt: Timestamp.now()
      });

      console.log('✅ EscolaDetalhes: Escola atualizada com sucesso');

      // Atualizar estado local
      setEscola(prev => ({
        ...prev,
        name: editData.name.trim(),
        address: editData.address.trim(),
        number: editData.phone.trim(),
        email: editData.email.trim()
      }));

      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao atualizar escola:', err);
      setError('Erro ao atualizar escola');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="escola-detalhes">
        <Navigation showBackButton={userData?.role !== 'admin'} backPath="/visao-geral" />
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar dados da escola...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="escola-detalhes">
        <Navigation showBackButton={userData?.role !== 'admin'} backPath="/visao-geral" />
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchEscola} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="escola-detalhes">
        <Navigation showBackButton={userData?.role !== 'admin'} backPath="/visao-geral" />
        <div className="not-found">
          <h2>Escola não encontrada</h2>
          <p>A escola que procura não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="escola-detalhes">
      <Navigation showBackButton={userData?.role !== 'admin'} backPath="/visao-geral" />
      
      <div className="content">
        {/* Informações da Escola */}
        <div className="escola-info-section">
          <div className="escola-header">
            <div className="escola-main-info">
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleInputChange}
                  className="edit-input escola-name-input"
                  placeholder="Nome da escola"
                />
              ) : (
                <h1>{escola.name}</h1>
              )}
              
              <div className="escola-meta">
                <span className="created-date">
                  Criada em: {formatDate(escola.createdAt)}
                </span>
                {escola.updatedAt && (
                  <span className="updated-date">
                    Atualizada em: {formatDate(escola.updatedAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="escola-actions">
              {isEditing ? (
                <>
                  <button className="action-button save" onClick={handleSave}>
                    Guardar
                  </button>
                  <button className="action-button cancel" onClick={handleCancel}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button className="action-button edit" onClick={handleEdit}>
                  Editar
                </button>
              )}
              {userData?.role === 'admin' && (
                <button className="action-button logout" onClick={handleLogout}>
                  Sair
                </button>
              )}
            </div>
          </div>

          <div className="escola-details-grid">
            <div className="detail-item">
              <label>Endereço</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={editData.address}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Endereço da escola"
                />
              ) : (
                <span className="detail-value">
                  {escola.address || 'Não informado'}
                </span>
              )}
            </div>

            <div className="detail-item">
              <label>Telefone</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={editData.phone}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Número de telefone"
                />
              ) : (
                <span className="detail-value">
                  {escola.number || 'Não informado'}
                </span>
              )}
            </div>

            <div className="detail-item">
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editData.email}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Email da escola"
                />
              ) : (
                <span className="detail-value">
                  {escola.email || 'Não informado'}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Alertas */}
        <div className="alertas-section">
          <div className="alertas-header">
            <h2>
              Alertas {alertas.length > 0 && `(${alertas.length})`}
            </h2>
            <button
              className="alertas-config-btn"
              onClick={() => {
                setEditAlertConfig({ ...alertConfig });
                setShowAlertConfig(true);
              }}
              title="Configurar alertas"
            >
              Configurar
            </button>
          </div>
          {alertas.length > 0 ? (
            <div className="alertas-list">
              {alertas.map((alerta, index) => (
                <div key={index} className="alerta-item" style={{ borderLeftColor: alerta.cor }}>
                  <span className="alerta-icon">{alerta.icon}</span>
                  <div className="alerta-content">
                    <span className="alerta-titulo" style={{ color: alerta.cor }}>{alerta.titulo}</span>
                    <span className="alerta-descricao">{alerta.descricao}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="alertas-empty">Nenhum alerta ativo. Configure os limites para receber alertas.</p>
          )}
        </div>

        {/* Modal Configuração de Alertas */}
        {showAlertConfig && (
          <div className="modal-overlay" onClick={() => !savingConfig && setShowAlertConfig(false)}>
            <div className="alert-config-modal" onClick={(e) => e.stopPropagation()}>
              <div className="alert-config-header">
                <h2>Configurar Alertas</h2>
                <button
                  className="close-button"
                  onClick={() => !savingConfig && setShowAlertConfig(false)}
                  disabled={savingConfig}
                >
                  x
                </button>
              </div>

              <div className="alert-config-body">
                <p className="alert-config-desc">
                  Defina com quantos dias de antecedencia quer ser alertado. Coloque 0 para desativar.
                </p>

                <div className="alert-config-group">
                  <h3>Alunos</h3>

                  <div className="alert-config-row">
                    <label>Licenca de aprendizagem (dias antes de expirar)</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={editAlertConfig.licencaDias}
                      onChange={(e) => setEditAlertConfig(prev => ({ ...prev, licencaDias: parseInt(e.target.value) || 0 }))}
                      disabled={savingConfig}
                    />
                  </div>

                  <div className="alert-config-row">
                    <label>Exames agendados (dias antes)</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={editAlertConfig.exameDias}
                      onChange={(e) => setEditAlertConfig(prev => ({ ...prev, exameDias: parseInt(e.target.value) || 0 }))}
                      disabled={savingConfig}
                    />
                  </div>

                  <div className="alert-config-row">
                    <label>Divida do aluno acima de (EUR)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={editAlertConfig.dividaLimite}
                      onChange={(e) => setEditAlertConfig(prev => ({ ...prev, dividaLimite: parseFloat(e.target.value) || 0 }))}
                      disabled={savingConfig}
                    />
                    <span className="alert-config-hint">0 = desativado</span>
                  </div>
                </div>

                <div className="alert-config-group">
                  <h3>Veiculos</h3>

                  <div className="alert-config-row">
                    <label>Seguro (dias antes de expirar)</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={editAlertConfig.seguroDias}
                      onChange={(e) => setEditAlertConfig(prev => ({ ...prev, seguroDias: parseInt(e.target.value) || 0 }))}
                      disabled={savingConfig}
                    />
                  </div>

                  <div className="alert-config-row">
                    <label>Inspecao (dias antes de expirar)</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={editAlertConfig.inspecaoDias}
                      onChange={(e) => setEditAlertConfig(prev => ({ ...prev, inspecaoDias: parseInt(e.target.value) || 0 }))}
                      disabled={savingConfig}
                    />
                  </div>
                </div>

                <div className="alert-config-group">
                  <h3>Inventario</h3>

                  <div className="alert-config-row">
                    <label>Stock minimo (unidades)</label>
                    <input
                      type="number"
                      min="0"
                      value={editAlertConfig.stockMinimo}
                      onChange={(e) => setEditAlertConfig(prev => ({ ...prev, stockMinimo: parseInt(e.target.value) || 0 }))}
                      disabled={savingConfig}
                    />
                    <span className="alert-config-hint">0 = desativado</span>
                  </div>
                </div>

                <div className="alert-config-group">
                  <h3>Aulas</h3>

                  <div className="alert-config-row">
                    <label>Limite maximo de aulas por aluno</label>
                    <input
                      type="number"
                      min="0"
                      value={editAlertConfig.aulasMaximas}
                      onChange={(e) => setEditAlertConfig(prev => ({ ...prev, aulasMaximas: parseInt(e.target.value) || 0 }))}
                      disabled={savingConfig}
                    />
                    <span className="alert-config-hint">32 = limite legal. 0 = desativado</span>
                  </div>
                </div>
              </div>

              <div className="alert-config-footer">
                <button
                  className="cancel-button"
                  onClick={() => setShowAlertConfig(false)}
                  disabled={savingConfig}
                >
                  Cancelar
                </button>
                <button
                  className="save-button"
                  onClick={handleSaveAlertConfig}
                  disabled={savingConfig}
                >
                  {savingConfig ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Menu de Navegação */}
        <div className="escola-menu-section">
          <h2>{userData?.role === 'instrutor' ? 'Painel do Instrutor' : 'Gestão da Escola'}</h2>
          <div className="menu-grid">
            {/* Aulas e Frota - visíveis para todos incluindo instrutores */}
            <button
              className="menu-button"
              onClick={() => navigate(`/escola/${escolaId}/aulas`)}
            >
              <div className="menu-icon">📚</div>
              <span className="menu-label">Aulas</span>
            </button>

            <button
              className="menu-button"
              onClick={() => navigate(`/escola/${escolaId}/frota`)}
            >
              <div className="menu-icon">🚗</div>
              <span className="menu-label">Frota</span>
            </button>

            {/* Tudo o resto - escondido para instrutores */}
            {userData?.role !== 'instrutor' && (
              <>
                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/alunos`)}
                >
                  <div className="menu-icon">👥</div>
                  <span className="menu-label">Alunos</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/alunos-antigos`)}
                >
                  <div className="menu-icon">📜</div>
                  <span className="menu-label">Alunos Antigos</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/instrutores`)}
                >
                  <div className="menu-icon">👨‍🏫</div>
                  <span className="menu-label">Instrutores</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/relatorio-instrutores`)}
                >
                  <div className="menu-icon">📊</div>
                  <span className="menu-label">Relatorio Instrutores</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/servicos`)}
                >
                  <div className="menu-icon">⚙️</div>
                  <span className="menu-label">Serviços</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/inventario`)}
                >
                  <div className="menu-icon">📦</div>
                  <span className="menu-label">Inventário</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/movimentos`)}
                >
                  <div className="menu-icon">📈</div>
                  <span className="menu-label">Movimentos</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/servicos-prestados`)}
                >
                  <div className="menu-icon">🧾</div>
                  <span className="menu-label">Serviços Prestados</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/materiais-prestados`)}
                >
                  <div className="menu-icon">📦</div>
                  <span className="menu-label">Materiais Prestados</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/despesas`)}
                >
                  <div className="menu-icon">💸</div>
                  <span className="menu-label">Despesas</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/visao-financeira`)}
                >
                  <div className="menu-icon">📊</div>
                  <span className="menu-label">Visão Financeira</span>
                </button>

                {userData?.role === 'dono' && (
                  <button
                    className="menu-button"
                    onClick={() => navigate(`/escola/${escolaId}/relatorios`)}
                  >
                    <div className="menu-icon">📋</div>
                    <span className="menu-label">Relatórios</span>
                  </button>
                )}

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/suporte`)}
                >
                  <div className="menu-icon">🆘</div>
                  <span className="menu-label">Suporte</span>
                </button>

                <button
                  className="menu-button"
                  onClick={() => navigate(`/escola/${escolaId}/modelos-contrato`)}
                >
                  <div className="menu-icon">📝</div>
                  <span className="menu-label">Modelos de Contrato</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscolaDetalhes;
