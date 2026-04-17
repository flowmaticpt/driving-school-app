import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import AdicionarDespesaModal from '../components/AdicionarDespesaModal';
import './Despesas.css';

const Despesas = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const [escola, setEscola] = useState(null);
  const [expenses, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const [filtroData, setFiltroData] = useState('');

  const tiposDespesa = [
    { id: 'agua', nome: 'Água', icon: '💧', cor: '#3498db' },
    { id: 'comida', nome: 'Comida', icon: '🍽️', cor: '#e74c3c' },
    { id: 'combustivel', nome: 'Combustível', icon: '⛽', cor: '#f39c12' },
    { id: 'eletricidade', nome: 'Eletricidade', icon: '⚡', cor: '#f1c40f' },
    { id: 'internet', nome: 'Internet', icon: '🌐', cor: '#9b59b6' },
    { id: 'limpeza', nome: 'Limpeza', icon: '🧽', cor: '#1abc9c' },
    { id: 'manutencao', nome: 'Manutenção', icon: '🔧', cor: '#e67e22' },
    { id: 'materiais', nome: 'Materiais', icon: '📦', cor: '#34495e' },
    { id: 'outros', nome: 'Outros', icon: '📋', cor: '#95a5a6' }
  ];

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

  const fetchDespesas = async () => {
    try {
      const despesasRef = collection(db, 'schools', escolaId, 'despesas');
      const q = query(despesasRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const expensesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDespesas(expensesData);
    } catch (err) {
      console.error('Erro ao buscar despesas:', err);
      setError('Erro ao carregar despesas');
    }
  };

  useEffect(() => {
    if (escolaId) {
      const loadData = async () => {
        setLoading(true);
        await fetchEscola();
        await fetchDespesas();
        setLoading(false);
      };
      loadData();
    }
  }, [escolaId]);

  // REMOVIDO: Listener de focus era excessivo e causava recarregamentos desnecessários
  // Se precisar de atualização em tempo real, usar onSnapshot do Firestore
  // ou atualizar apenas quando necessário (ex: após adicionar despesa)

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = async () => {
    await fetchDespesas(); // Recarregar lista de despesas
    setIsModalOpen(false);
  };

  const filteredDespesas = useMemo(() => {
    return expenses.filter(despesa => {
      const tipoMatch = filtroTipo === 'todos' || despesa.tipo === filtroTipo;
      const metodoMatch = filtroMetodo === 'todos' || despesa.paymentMethod === filtroMetodo;
      
      let dataMatch = true;
      if (filtroData) {
        const despesaData = despesa.date.toDate ? despesa.date.toDate() : new Date(despesa.date);
        const filtroDataObj = new Date(filtroData);
        dataMatch = despesaData.toDateString() === filtroDataObj.toDateString();
      }
      
      return tipoMatch && metodoMatch && dataMatch;
    });
  }, [expenses, filtroTipo, filtroMetodo, filtroData]);


  const getMetodoPagamentoLabel = (metodo) => {
    const metodos = {
      'dinheiro': 'Dinheiro',
      'multibanco': 'Multibanco',
      'transferencia': 'Transferência'
    };
    return metodos[metodo] || metodo;
  };

  const getTipoDespesa = (tipoId) => {
    return tiposDespesa.find(tipo => tipo.id === tipoId) || { nome: tipoId, icon: '📋', cor: '#95a5a6' };
  };

  const getTotalDespesas = () => {
    return filteredDespesas.reduce((total, despesa) => total + (despesa.value || 0), 0);
  };

  const getTotalPorTipo = () => {
    const totais = {};
    filteredDespesas.forEach(despesa => {
      const tipo = despesa.tipo;
      totais[tipo] = (totais[tipo] || 0) + (despesa.value || 0);
    });
    return totais;
  };

  const getTotalPorMetodo = () => {
    const totais = {};
    filteredDespesas.forEach(despesa => {
      const metodo = despesa.paymentMethod;
      totais[metodo] = (totais[metodo] || 0) + (despesa.value || 0);
    });
    return totais;
  };

  if (loading) {
    return (
      <div className="expenses-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar despesas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="expenses-page">
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
      <div className="expenses-page">
        <Navigation showBackButton={true} backPath="/visao-geral" />
        <div className="not-found">
          <h2>Escola não encontrada</h2>
          <p>A escola que procura não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expenses-page">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
      
      <div className="content">
        <div className="page-header">
          <h1>Despesas - {escola.name}</h1>
          <p>Gerir despesas da escola</p>
        </div>

        {/* Cards de Tipos de Despesa */}
        <div className="tipos-despesa-section">
          <h2>Tipos de Despesa</h2>
          <div className="tipos-grid">
            {tiposDespesa.map((tipo) => {
              const totalTipo = getTotalPorTipo()[tipo.id] || 0;
              const quantidadeTipo = filteredDespesas.filter(d => d.tipo === tipo.id).length;
              
              return (
                <div key={tipo.id} className="tipo-card" style={{ '--tipo-cor': tipo.cor, borderColor: tipo.cor } as React.CSSProperties}>
                  <div className="tipo-icon" style={{ color: tipo.cor }}>
                    {tipo.icon}
                  </div>
                  <div className="tipo-info">
                    <h3>{tipo.nome}</h3>
                    <p className="tipo-valor">{formatPrice(totalTipo)}</p>
                    <p className="tipo-quantidade">{quantidadeTipo} despesas</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="search-section">
          <div className="search-form">
            <div className="filter-group">
              <label htmlFor="filtroTipo">Tipo:</label>
              <select
                id="filtroTipo"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="filter-select"
              >
                <option value="todos">Todos</option>
                {tiposDespesa.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{tipo.icon} {tipo.nome}</option>
                ))}
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
                <option value="multibanco">Multibanco</option>
                <option value="transferencia">Transferência</option>
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
          </div>
          <button className="add-button" onClick={handleOpenModal}>
            + Adicionar Despesa
          </button>
        </div>

        <div className="stats-section">
          <div className="stat-card">
            <h3>Total de Despesas</h3>
            <p className="stat-value">{filteredDespesas.length}</p>
          </div>
          <div className="stat-card">
            <h3>Valor Total</h3>
            <p className="stat-value">{formatPrice(getTotalDespesas())}</p>
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

        {filteredDespesas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>Nenhuma despesa encontrada</h3>
            <p>Tente ajustar os filtros ou adicione a primeira despesa.</p>
          </div>
        ) : (
          <div className="expenses-list">
            {filteredDespesas.map((despesa) => {
              const tipoInfo = getTipoDespesa(despesa.tipo);
              return (
                <div key={despesa.id} className="despesa-item">
                  <div className="despesa-header">
                    <div className="despesa-tipo">
                      <span className="tipo-icon" style={{ color: tipoInfo.cor }}>
                        {tipoInfo.icon}
                      </span>
                      <span className="tipo-badge" style={{ backgroundColor: tipoInfo.cor }}>
                        {tipoInfo.nome}
                      </span>
                      <span className="despesa-descricao">{despesa.description}</span>
                      {despesa.materialId && (
                        <span className="material-link">🔗 Material</span>
                      )}
                    </div>
                    <div className="despesa-valor">
                      {formatPrice(despesa.value)}
                    </div>
                  </div>
                  <div className="despesa-details">
                    <div className="despesa-info">
                      <span className="despesa-data">📅 {formatDate(despesa.date)}</span>
                      {despesa.fornecedor && (
                        <span className="despesa-fornecedor">🏢 {despesa.fornecedor}</span>
                      )}
                    </div>
                    <div className="despesa-meta">
                      <span className={`metodo-badge ${despesa.paymentMethod}`}>
                        {getMetodoPagamentoLabel(despesa.paymentMethod)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdicionarDespesaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        escolaId={escolaId}
        typesDespesa={tiposDespesa}
      />
    </div>
  );
};

export default Despesas;
