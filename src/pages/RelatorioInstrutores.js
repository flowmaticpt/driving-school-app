import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import './RelatorioInstrutores.css';

const RelatorioInstrutores = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [escola, setEscola] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [instrutores, setInstrutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [instrutorExpandido, setInstrutorExpandido] = useState(null);

  const ALERTA_LIMITE_AULAS = 32;

  useEffect(() => {
    fetchDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaId]);

  const fetchDados = async () => {
    try {
      setLoading(true);

      // Fetch escola
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaDoc = await getDoc(escolaRef);
      if (escolaDoc.exists()) {
        setEscola({ id: escolaDoc.id, ...escolaDoc.data() });
      }

      // Fetch instrutores
      const utilizadoresRef = collection(db, 'utilizadores');
      const instrutoresQuery = query(
        utilizadoresRef,
        where('escolaId', '==', escolaId),
        where('role', '==', 'instrutor')
      );
      const instrutoresSnapshot = await getDocs(instrutoresQuery);
      const instrutoresData = instrutoresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInstrutores(instrutoresData);

      // Fetch aulas
      const aulasRef = collection(db, 'aulas');
      const aulasQuery = query(aulasRef, where('escolaId', '==', escolaId));
      const aulasSnapshot = await getDocs(aulasQuery);
      const aulasData = aulasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAulas(aulasData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const obterPeriodo = () => {
    const hoje = new Date();

    switch (periodo) {
      case 'hoje':
        return {
          inicio: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString().split('T')[0],
          fim: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString().split('T')[0]
        };
      case 'semana': {
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);
        return {
          inicio: inicioSemana.toISOString().split('T')[0],
          fim: fimSemana.toISOString().split('T')[0]
        };
      }
      case 'mes': {
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        return {
          inicio: inicioMes.toISOString().split('T')[0],
          fim: fimMes.toISOString().split('T')[0]
        };
      }
      case 'sempre':
        return { inicio: null, fim: null };
      case 'personalizado':
        return { inicio: dataInicio || null, fim: dataFim || null };
      default:
        return { inicio: null, fim: null };
    }
  };

  const aulasFiltradas = useMemo(() => {
    const { inicio, fim } = obterPeriodo();
    return aulas.filter(aula => {
      if (aula.status === 'cancelada') return false;
      if (!inicio || !fim) return true;
      return aula.data >= inicio && aula.data <= fim;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aulas, periodo, dataInicio, dataFim]);

  // Aulas do mes corrente (para alerta de 32 aulas)
  const aulasDoMes = useMemo(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
    return aulas.filter(aula =>
      aula.status !== 'cancelada' &&
      aula.data >= inicioMes &&
      aula.data <= fimMes
    );
  }, [aulas]);

  const dadosPorInstrutor = useMemo(() => {
    const dados = {};

    instrutores.forEach(inst => {
      dados[inst.id] = {
        instrutor: inst,
        aulas: [],
        totalAulas: 0,
        totalMinutos: 0,
        alunosUnicos: new Map(),
        aulasMes: 0
      };
    });

    aulasFiltradas.forEach(aula => {
      if (dados[aula.instrutorId]) {
        const d = dados[aula.instrutorId];
        d.aulas.push(aula);
        d.totalAulas++;
        d.totalMinutos += parseInt(aula.minutos) || 0;
        if (aula.alunos) {
          aula.alunos.forEach(aluno => {
            if (!d.alunosUnicos.has(aluno.id)) {
              d.alunosUnicos.set(aluno.id, aluno);
            }
          });
        }
      }
    });

    // Contar aulas do mes para alertas
    aulasDoMes.forEach(aula => {
      if (dados[aula.instrutorId]) {
        dados[aula.instrutorId].aulasMes++;
      }
    });

    return Object.values(dados).sort((a, b) => b.totalAulas - a.totalAulas);
  }, [instrutores, aulasFiltradas, aulasDoMes]);

  const totais = useMemo(() => {
    return dadosPorInstrutor.reduce((acc, d) => ({
      aulas: acc.aulas + d.totalAulas,
      minutos: acc.minutos + d.totalMinutos,
      alunos: acc.alunos + d.alunosUnicos.size
    }), { aulas: 0, minutos: 0, alunos: 0 });
  }, [dadosPorInstrutor]);

  const formatarMinutos = (minutos) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const formatarPeriodo = () => {
    switch (periodo) {
      case 'hoje': return 'Hoje';
      case 'semana': return 'Semana Atual';
      case 'mes': return 'Mes Atual';
      case 'sempre': return 'Total de Sempre';
      case 'personalizado': return dataInicio && dataFim ? `${dataInicio} a ${dataFim}` : 'Personalizado';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="relatorio-instrutores">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar relatorio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relatorio-instrutores">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="error-container">
          <h2>Erro</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relatorio-instrutores">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />

      <div className="container">
        <div className="ri-header">
          <div className="ri-header-left">
            <button className="back-button" onClick={() => navigate(`/escola/${escolaId}`)}>
              ← Voltar
            </button>
            <div>
              <h1>Relatorio de Instrutores</h1>
              <p className="periodo-info">{formatarPeriodo()} - {escola?.name}</p>
            </div>
          </div>
        </div>

        {/* Seletor de Periodo */}
        <div className="periodo-selector">
          <div className="periodo-buttons">
            {['hoje', 'semana', 'mes', 'sempre', 'personalizado'].map(p => (
              <button
                key={p}
                className={`periodo-btn ${periodo === p ? 'active' : ''}`}
                onClick={() => setPeriodo(p)}
              >
                {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : p === 'sempre' ? 'Sempre' : 'Personalizado'}
              </button>
            ))}
          </div>

          {periodo === 'personalizado' && (
            <div className="periodo-custom">
              <div className="date-inputs">
                <div className="date-group">
                  <label>Data Inicio:</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div className="date-group">
                  <label>Data Fim:</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cards resumo */}
        <div className="cards-container">
          <div className="ri-card total-instrutores">
            <div className="card-header">
              <h3>Instrutores Ativos</h3>
              <span className="card-icon">👨‍🏫</span>
            </div>
            <div className="card-value">{instrutores.length}</div>
          </div>

          <div className="ri-card total-aulas">
            <div className="card-header">
              <h3>Total de Aulas</h3>
              <span className="card-icon">📚</span>
            </div>
            <div className="card-value">{totais.aulas}</div>
          </div>

          <div className="ri-card total-horas">
            <div className="card-header">
              <h3>Total de Horas</h3>
              <span className="card-icon">🕐</span>
            </div>
            <div className="card-value">{formatarMinutos(totais.minutos)}</div>
          </div>

          <div className="ri-card total-alunos">
            <div className="card-header">
              <h3>Alunos Diferentes</h3>
              <span className="card-icon">👥</span>
            </div>
            <div className="card-value">{totais.alunos}</div>
          </div>
        </div>

        {/* Tabela por instrutor */}
        <div className="instrutores-report">
          <h2>Detalhe por Instrutor</h2>

          {dadosPorInstrutor.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum instrutor encontrado.</p>
            </div>
          ) : (
            <div className="instrutores-list">
              {dadosPorInstrutor.map(d => {
                const alertaMes = d.aulasMes > ALERTA_LIMITE_AULAS;
                const isExpandido = instrutorExpandido === d.instrutor.id;

                return (
                  <div key={d.instrutor.id} className={`instrutor-report-card ${alertaMes && userData?.role === 'dono' ? 'alerta' : ''}`}>
                    <div
                      className="instrutor-report-header"
                      onClick={() => setInstrutorExpandido(isExpandido ? null : d.instrutor.id)}
                    >
                      <div className="instrutor-report-info">
                        <h3>{d.instrutor.name}</h3>
                        <span className="instrutor-email">{d.instrutor.email}</span>
                      </div>

                      <div className="instrutor-report-stats">
                        <div className="stat">
                          <span className="stat-value">{d.totalAulas}</span>
                          <span className="stat-label">aulas</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{formatarMinutos(d.totalMinutos)}</span>
                          <span className="stat-label">duracao</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{d.alunosUnicos.size}</span>
                          <span className="stat-label">alunos</span>
                        </div>
                        {alertaMes && userData?.role === 'dono' && (
                          <div className="alerta-badge">
                            ⚠️ {d.aulasMes} aulas este mes
                          </div>
                        )}
                      </div>

                      <span className="expand-icon">{isExpandido ? '▲' : '▼'}</span>
                    </div>

                    {isExpandido && (
                      <div className="instrutor-report-detail">
                        {/* Alunos */}
                        <div className="detail-section">
                          <h4>Alunos ({d.alunosUnicos.size})</h4>
                          <div className="alunos-chips">
                            {Array.from(d.alunosUnicos.values()).map(aluno => (
                              <span key={aluno.id} className="aluno-chip">
                                {aluno.nome} {aluno.numero ? `(N.${aluno.numero})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Aulas */}
                        <div className="detail-section">
                          <h4>Aulas ({d.totalAulas})</h4>
                          <div className="aulas-table">
                            <div className="aulas-table-header">
                              <span>Data</span>
                              <span>Hora</span>
                              <span>Tipo</span>
                              <span>Duracao</span>
                              <span>Alunos</span>
                            </div>
                            {d.aulas
                              .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora))
                              .map(aula => (
                                <div key={aula.id} className="aulas-table-row">
                                  <span>{aula.data ? new Date(aula.data).toLocaleDateString('pt-PT') : '-'}</span>
                                  <span>{aula.hora || '-'}</span>
                                  <span className={`tipo-badge ${aula.tipo}`}>
                                    {aula.tipo === 'teorica' ? 'Teorica' : 'Pratica'}
                                  </span>
                                  <span>{formatarMinutos(parseInt(aula.minutos) || 0)}</span>
                                  <span>{aula.alunos ? aula.alunos.map(a => a.nome).join(', ') : '-'}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatorioInstrutores;
