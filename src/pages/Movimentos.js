import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import ConfirmarCancelamentoModal from '../components/ConfirmarCancelamentoModal';
import { usePermissions } from '../hooks/usePermissions';
import { formatPrice, formatDateTime } from '../utils/formatters';
import { getMetodoPagamentoLabel } from '../utils/helpers';
import './Movimentos.css';

const Movimentos = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const { userRole } = usePermissions();
  const [escola, setEscola] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [alunosData, setAlunosData] = useState({}); // Cache de dados dos alunos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const [filtroData, setFiltroData] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [movimentoToCancel, setMovimentoToCancel] = useState(null);

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
    }
  };

  // OTIMIZADO: Só buscar alunos quando necessário (quando há filtro de texto)
  // Os movimentos já têm alunoName, então não precisamos buscar todos os alunos sempre
  const fetchAlunosData = async () => {
    try {
      // Só buscar se realmente precisamos (ex: para filtro de texto com enrollmentNumber)
      // Por enquanto mantemos, mas poderia ser lazy-loaded apenas quando filtroTexto é usado
      const studentsRef = collection(db, 'schools', escolaId, 'students');
      const querySnapshot = await getDocs(studentsRef);
      
      const alunos = {};
      querySnapshot.forEach((doc) => {
        alunos[doc.id] = {
          id: doc.id,
          ...doc.data()
        };
      });
      
      setAlunosData(alunos);
    } catch (err) {
      console.error('Erro ao buscar dados dos alunos:', err);
    }
  };

  const fetchMovimentos = async () => {
    try {
      console.log('🔍 Buscando movimentos para escola:', escolaId);
      const movementsRef = collection(db, 'schools', escolaId, 'movements');
      const q = query(movementsRef, orderBy('date', 'desc'), limit(1000));
      const querySnapshot = await getDocs(q);
      
      console.log('📊 Resultado da busca de movimentos:', {
        totalDocs: querySnapshot.docs.length,
        isEmpty: querySnapshot.empty
      });
      
      const movimentosData = querySnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        console.log('💰 Movimento encontrado:', data);
        return data;
      });
      
      console.log('✅ Movimentos carregados:', movimentosData.length);
      setMovimentos(movimentosData);
    } catch (err) {
      console.error('❌ Erro ao buscar movimentos:', err);
      setError('Erro ao carregar movimentos');
    }
  };

  const loadData = async () => {
    setLoading(true);
    // Paralelizar fetchEscola e fetchMovimentos (fetchAlunosData pode ser lazy)
    await Promise.all([
      fetchEscola(),
      fetchMovimentos()
    ]);
    // Buscar alunos em paralelo (não bloqueia a UI)
    fetchAlunosData().catch(err => console.error('Erro ao buscar alunos:', err));
    setLoading(false);
  };

  useEffect(() => {
    if (escolaId) {
      loadData();
    }
  }, [escolaId]);

  const filteredMovimentos = movimentos.filter(movimento => {
    const tipoMatch = filtroTipo === 'todos' || movimento.type === filtroTipo;
    const metodoMatch = filtroMetodo === 'todos' || movimento.paymentMethod === filtroMetodo;
    
    let dataMatch = true;
    if (filtroData) {
      const movimentoData = movimento.date.toDate ? movimento.date.toDate() : new Date(movimento.date);
      const filtroDataObj = new Date(filtroData);
      dataMatch = movimentoData.toDateString() === filtroDataObj.toDateString();
    }
    
    let textoMatch = true;
    if (filtroTexto) {
      const alunoName = movimento.alunoName || '';
      const alunoId = movimento.alunoId || '';
      const alunoData = alunosData[alunoId];
      const enrollmentNumber = alunoData?.enrollmentNumber || '';
      const movimentoNome = movimento.description || '';
      const searchTerm = filtroTexto.toLowerCase();
      
      textoMatch = alunoName.toLowerCase().includes(searchTerm) || 
                   alunoId.toLowerCase().includes(searchTerm) ||
                   enrollmentNumber.toLowerCase().includes(searchTerm) ||
                   movimentoNome.toLowerCase().includes(searchTerm);
    }
    
    return tipoMatch && metodoMatch && dataMatch && textoMatch;
  });

  const formatDate = (timestamp) => {
    return formatDateTime(timestamp);
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      'servico': 'Serviço',
      'material': 'Material'
    };
    return tipos[tipo] || tipo;
  };

  const getTotalMovimentos = () => {
    return filteredMovimentos.reduce((total, movimento) => total + (movimento.value || 0), 0);
  };

  const getTotalPorMetodo = () => {
    const totais = {};
    filteredMovimentos.forEach(movimento => {
      const metodo = movimento.paymentMethod;
      totais[metodo] = (totais[metodo] || 0) + (movimento.value || 0);
    });
    return totais;
  };

  const handleCancelarMovimento = (movimento) => {
    setMovimentoToCancel(movimento);
    setIsCancelModalOpen(true);
  };



  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setMovimentoToCancel(null);
  };

  const handleCancelSuccess = () => {
    fetchMovimentos(); // Recarregar lista de movimentos
    setIsCancelModalOpen(false);
    setMovimentoToCancel(null);
  };

  const handleDespesasUpdate = async () => {
    // Esta função será chamada quando despesas precisarem ser atualizadas
    // Por agora, apenas recarregamos os movimentos
    await fetchMovimentos();
  };

  if (loading) {
    return (
      <div className="movimentos-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar movimentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="movimentos-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="movimentos-page">
        <Navigation showBackButton={true} backPath="/visao-geral" />
        <div className="not-found">
          <h2>Escola não encontrada</h2>
          <p>A escola que procura não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="movimentos-page">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
      
      <div className="content">
        <div className="page-header">
          <h1>Movimentos - {escola.name}</h1>
          <p>Histórico de pagamentos e transações</p>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="filtroTipo">Tipo:</label>
            <select
              id="filtroTipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todos</option>
              <option value="servico">Serviços</option>
              <option value="material">Materiais</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filtroMetodo">Método:</label>
            <select
              id="filtroMetodo"
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todos</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferência</option>
              <option value="multibanco">Multibanco</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filtroData">Data:</label>
            <input
              type="date"
              id="filtroData"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="filtroTexto">Pesquisar:</label>
            <input
              type="text"
              id="filtroTexto"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Nome do movimento, aluno ou número de inscrição..."
              className="filter-input"
            />
          </div>
        </div>


        <div className="stats-section">
          <div className="stat-card">
            <h3>Total de Movimentos</h3>
            <p className="stat-value">{filteredMovimentos.length}</p>
          </div>
          <div className="stat-card">
            <h3>Valor Total</h3>
            <p className="stat-value">{formatPrice(getTotalMovimentos())}</p>
          </div>
          <div className="stat-card">
            <h3>Por Método</h3>
            <div className="metodo-totals">
              {Object.entries(getTotalPorMetodo()).map(([metodo, total]) => (
                <div key={metodo} className="metodo-item">
                  <span className="metodo-name">{getMetodoPagamentoLabel(metodo)}:</span>
                  <span className="metodo-total">{formatPrice(total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {filteredMovimentos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>Nenhum movimento encontrado</h3>
            <p>Tente ajustar os filtros ou adicione alguns serviços/materiais.</p>
          </div>
        ) : (
          <div className="movimentos-list">
            {filteredMovimentos.map((movimento) => (
              <div key={movimento.id} className="movimento-item">
                <div className="movimento-header">
                  <div className="movimento-tipo">
                    <span className={`tipo-badge ${movimento.type}`}>
                      {getTipoLabel(movimento.type)}
                    </span>
                    <span className="movimento-descricao">{movimento.description}</span>
                    {movimento.naoAfetarFinanceiro && (
                      <span className="financeiro-badge" title="Não afeta visão financeira">
                        📊 Sem impacto financeiro
                      </span>
                    )}
                  </div>
                  <div className="movimento-valor">
                    {formatPrice(movimento.value)}
                  </div>
                </div>
                <div className="movimento-details">
                  <div className="movimento-info">
                    <span className="aluno-name">
                      👤 {movimento.alunoName}
                      {movimento.alunoId && alunosData[movimento.alunoId]?.enrollmentNumber && (
                        <span className="numero-inscricao"> (#{alunosData[movimento.alunoId].enrollmentNumber})</span>
                      )}
                    </span>
                    <span className="quantidade">Qtd: {movimento.quantity}</span>
                  </div>
                  <div className="movimento-meta">
                    <span className={`metodo-badge ${movimento.paymentMethod}`}>
                      {getMetodoPagamentoLabel(movimento.paymentMethod)}
                    </span>
                    <span className="movimento-data">{formatDate(movimento.date)}</span>
                    {(userRole === 'dono' || userRole === 'group_owner') && (
                      <button 
                        className="cancel-button"
                        onClick={() => handleCancelarMovimento(movimento)}
                        title="Cancelar movimento"
                      >
                        ❌ Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmarCancelamentoModal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        onSuccess={handleCancelSuccess}
        movimento={movimentoToCancel}
        escolaId={escolaId}
        onDespesasUpdate={handleDespesasUpdate}
      />

    </div>
  );
};

export default Movimentos;
