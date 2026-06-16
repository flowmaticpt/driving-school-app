import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import AdicionarDespesaModal from '../components/AdicionarDespesaModal';
import { formatPrice, formatDate } from '../utils/formatters';
import './Despesas.css';

const Despesas = () => {
  const { escolaId } = useParams();
  const [escola, setEscola] = useState(null);
  const [expenses, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('todos');
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const [filtroData, setFiltroData] = useState('');

  const categoriasDespesa = [
    {
      id: 'operacionais',
      nome: 'Despesas Operacionais',
      icon: '⚙️',
      cor: '#e67e22',
      subcategorias: [
        { id: 'combustivel', nome: 'Combustível', icon: '⛽' },
        { id: 'seguros', nome: 'Seguros', icon: '🛡️' },
        { id: 'imt_licencas', nome: 'IMT / Licenças', icon: '📄' },
        { id: 'material_pedagogico', nome: 'Material Pedagógico', icon: '📚' },
        { id: 'exames', nome: 'Exames', icon: '📝' },
      ]
    },
    {
      id: 'gestao',
      nome: 'Gestão da Escola',
      icon: '🏢',
      cor: '#3498db',
      subcategorias: [
        { id: 'renda', nome: 'Renda', icon: '🏠' },
        { id: 'salarios', nome: 'Salários', icon: '💰' },
        { id: 'contabilidade', nome: 'Contabilidade', icon: '📊' },
      ]
    },
    {
      id: 'funcionamento',
      nome: 'Funcionamento',
      icon: '🔧',
      cor: '#1abc9c',
      subcategorias: [
        { id: 'agua', nome: 'Água', icon: '💧' },
        { id: 'eletricidade', nome: 'Eletricidade', icon: '⚡' },
        { id: 'internet', nome: 'Internet', icon: '🌐' },
        { id: 'limpeza', nome: 'Limpeza', icon: '🧽' },
        { id: 'manutencao', nome: 'Manutenção', icon: '🔧' },
      ]
    },
    {
      id: 'outros',
      nome: 'Outros',
      icon: '📋',
      cor: '#95a5a6',
      subcategorias: []
    }
  ];

  // Flat list for backwards compatibility with old despesas
  const tiposDespesa = categoriasDespesa.flatMap(cat =>
    cat.subcategorias.length > 0
      ? cat.subcategorias.map(sub => ({ id: sub.id, nome: sub.nome, icon: sub.icon, cor: cat.cor }))
      : [{ id: cat.id, nome: cat.nome, icon: cat.icon, cor: cat.cor }]
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const metodoMatch = filtroMetodo === 'todos' || despesa.paymentMethod === filtroMetodo;

      // Category/subcategory filter
      let categoriaMatch = true;
      if (filtroCategoria !== 'todos') {
        if (despesa.categoria) {
          categoriaMatch = despesa.categoria === filtroCategoria;
        } else {
          // Backwards compat: match old despesas by checking if their tipo belongs to this category
          const cat = categoriasDespesa.find(c => c.id === filtroCategoria);
          if (cat) {
            categoriaMatch = cat.subcategorias.some(sub => sub.id === despesa.tipo) || (cat.id === despesa.tipo);
          }
        }
      }

      let subcategoriaMatch = true;
      if (filtroSubcategoria !== 'todos') {
        if (despesa.subcategoria) {
          subcategoriaMatch = despesa.subcategoria === filtroSubcategoria;
        } else {
          subcategoriaMatch = despesa.tipo === filtroSubcategoria;
        }
      }

      let dataMatch = true;
      if (filtroData) {
        const despesaData = despesa.date.toDate ? despesa.date.toDate() : new Date(despesa.date);
        const filtroDataObj = new Date(filtroData);
        dataMatch = despesaData.toDateString() === filtroDataObj.toDateString();
      }

      return metodoMatch && dataMatch && categoriaMatch && subcategoriaMatch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, filtroCategoria, filtroSubcategoria, filtroMetodo, filtroData]);


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

        {/* Cards de Categorias de Despesa */}
        <div className="tipos-despesa-section">
          <h2>Categorias de Despesa</h2>
          <div className="tipos-grid">
            {categoriasDespesa.map((cat) => {
              // Sum expenses for this category (new field or backwards compat via subcategoria ids)
              const subcatIds = cat.subcategorias.map(s => s.id);
              const despesasCategoria = filteredDespesas.filter(d =>
                d.categoria === cat.id ||
                (!d.categoria && (subcatIds.includes(d.tipo) || d.tipo === cat.id))
              );
              const totalCategoria = despesasCategoria.reduce((sum, d) => sum + (d.value || 0), 0);
              const quantidadeCategoria = despesasCategoria.length;

              return (
                <div
                  key={cat.id}
                  className="tipo-card"
                  style={{ '--tipo-cor': cat.cor, borderColor: cat.cor, cursor: 'pointer' }}
                  onClick={() => {
                    setFiltroCategoria(filtroCategoria === cat.id ? 'todos' : cat.id);
                    setFiltroSubcategoria('todos');
                  }}
                >
                  <div className="tipo-icon" style={{ color: cat.cor }}>
                    {cat.icon}
                  </div>
                  <div className="tipo-info">
                    <h3>{cat.nome}</h3>
                    <p className="tipo-valor">{formatPrice(totalCategoria)}</p>
                    <p className="tipo-quantidade">{quantidadeCategoria} despesas</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="search-section">
          <div className="search-form">
            <div className="filter-group">
              <label htmlFor="filtroCategoria">Categoria:</label>
              <select
                id="filtroCategoria"
                value={filtroCategoria}
                onChange={(e) => {
                  setFiltroCategoria(e.target.value);
                  setFiltroSubcategoria('todos');
                }}
                className="filter-select"
              >
                <option value="todos">Todas</option>
                {categoriasDespesa.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.nome}</option>
                ))}
              </select>
            </div>

            {filtroCategoria !== 'todos' && (() => {
              const catSel = categoriasDespesa.find(c => c.id === filtroCategoria);
              return catSel && catSel.subcategorias.length > 0 ? (
                <div className="filter-group">
                  <label htmlFor="filtroSubcategoria">Subcategoria:</label>
                  <select
                    id="filtroSubcategoria"
                    value={filtroSubcategoria}
                    onChange={(e) => setFiltroSubcategoria(e.target.value)}
                    className="filter-select"
                  >
                    <option value="todos">Todas</option>
                    {catSel.subcategorias.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.icon} {sub.nome}</option>
                    ))}
                  </select>
                </div>
              ) : null;
            })()}

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
              const tipoInfo = getTipoDespesa(despesa.subcategoria || despesa.tipo);
              // Get category info for display
              const catInfo = despesa.categoria
                ? categoriasDespesa.find(c => c.id === despesa.categoria)
                : categoriasDespesa.find(c => c.subcategorias.some(s => s.id === despesa.tipo));
              return (
                <div key={despesa.id} className="despesa-item">
                  <div className="despesa-header">
                    <div className="despesa-tipo">
                      <span className="tipo-icon" style={{ color: tipoInfo.cor }}>
                        {tipoInfo.icon}
                      </span>
                      {catInfo && (
                        <span className="tipo-badge" style={{ backgroundColor: catInfo.cor, opacity: 0.7, fontSize: '0.75em', marginRight: '4px' }}>
                          {catInfo.nome}
                        </span>
                      )}
                      <span className="tipo-badge" style={{ backgroundColor: tipoInfo.cor }}>
                        {despesa.subcategoriaNome || tipoInfo.nome}
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
        categoriasDespesa={categoriasDespesa}
      />
    </div>
  );
};

export default Despesas;
