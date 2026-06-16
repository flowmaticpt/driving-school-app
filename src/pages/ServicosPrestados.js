import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs, orderBy, query, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import './ServicosPrestados.css';

const ServicosPrestados = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();

  const [escola, setEscola] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registos, setRegistos] = useState([]);
  const [totalPago, setTotalPago] = useState(0);

  const [filtroData, setFiltroData] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const escolaRef = doc(db, 'schools', escolaId);
        const escolaSnap = await getDoc(escolaRef);
        if (!escolaSnap.exists()) {
          setError('Escola não encontrada');
          setLoading(false);
          return;
        }
        setEscola({ id: escolaSnap.id, ...escolaSnap.data() });

        const servicosPrestadosRef = collection(db, 'schools', escolaId, 'servicosPrestados');
        const q = query(servicosPrestadosRef, orderBy('data', 'desc'));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRegistos(items);

        // Buscar movimentos de pagamento (receitas) para calcular valor pago
        const movimentosRef = collection(db, 'schools', escolaId, 'movements');
        const movQ = query(movimentosRef, where('type', '==', 'pagamento'));
        const movSnap = await getDocs(movQ);
        let pago = 0;
        movSnap.docs.forEach(d => {
          const mov = d.data();
          if (mov.value > 0 && !mov.naoAfetarFinanceiro) {
            pago += mov.value;
          }
        });
        setTotalPago(pago);
      } catch (e) {
        console.error('Erro ao carregar serviços prestados:', e);
        setError('Erro ao carregar serviços prestados');
      } finally {
        setLoading(false);
      }
    };
    if (escolaId) load();
  }, [escolaId]);

  const filtered = useMemo(() => {
    return registos.filter(r => {
      let dataMatch = true;
      if (filtroData) {
        const d = r.data?.toDate ? r.data.toDate() : new Date(r.data);
        const f = new Date(filtroData);
        dataMatch = d.toDateString() === f.toDateString();
      }

      let textMatch = true;
      if (filtroTexto) {
        const s = filtroTexto.toLowerCase();
        textMatch = (r.alunoName || '').toLowerCase().includes(s)
          || (r.servicoName || '').toLowerCase().includes(s);
      }

      let statusMatch = true;
      if (filtroStatus !== 'todos') {
        if (filtroStatus === 'ativos') {
          statusMatch = !r.status || r.status === 'ativo';
        } else if (filtroStatus === 'removidos') {
          statusMatch = r.status === 'removido';
        } else if (filtroStatus === 'reduzidos') {
          statusMatch = r.status === 'reduzido';
        }
      }

      return dataMatch && textMatch && statusMatch;
    });
  }, [registos, filtroData, filtroTexto, filtroStatus]);

  const resumo = useMemo(() => {
    // Valor global = soma de todos os serviços ativos (não removidos)
    const ativos = registos.filter(r => !r.status || r.status === 'ativo');
    const valorGlobal = ativos.reduce((sum, r) => sum + (r.precoTotal || 0), 0);
    const totalRegistos = registos.length;
    const totalAtivos = ativos.length;
    const totalRemovidos = registos.filter(r => r.status === 'removido').length;
    const totalReduzidos = registos.filter(r => r.status === 'reduzido').length;

    // Valor em dívida = valor global dos serviços - valor pago
    const emDivida = Math.max(0, valorGlobal - totalPago);

    return { valorGlobal, totalRegistos, totalAtivos, totalRemovidos, totalReduzidos, emDivida };
  }, [registos, totalPago]);

  // Totais da lista filtrada
  const filteredTotals = useMemo(() => {
    const valorFiltrado = filtered.reduce((sum, r) => sum + (r.precoTotal || 0), 0);
    const ativosFiltrados = filtered.filter(r => !r.status || r.status === 'ativo');
    const valorAtivosFiltrados = ativosFiltrados.reduce((sum, r) => sum + (r.precoTotal || 0), 0);
    return { valorFiltrado, valorAtivosFiltrados, count: filtered.length };
  }, [filtered]);

  const formatPrice = (price) => {
    if (!price) return '0,00 €';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-PT');
  };

  if (loading) {
    return (
      <div className="servicos-prestados-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar serviços prestados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="servicos-prestados-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="error">
          <p>{error}</p>
          <button onClick={() => navigate(`/escola/${escolaId}`)} className="retry-button">Voltar</button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="servicos-prestados-page">
        <Navigation showBackButton={true} backPath="/visao-geral" />
        <div className="not-found">
          <h2>Escola não encontrada</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="servicos-prestados-page">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />

      <div className="content">
        {/* Resumo financeiro */}
        <div className="summary-cards">
          <div className="summary-card global">
            <div className="summary-icon">🧾</div>
            <div className="summary-info">
              <span className="summary-label">Valor Global (Ativos)</span>
              <span className="summary-value">{formatPrice(resumo.valorGlobal)}</span>
              <span className="summary-detail">{resumo.totalAtivos} serviços ativos</span>
            </div>
          </div>
          <div className="summary-card pago">
            <div className="summary-icon">💰</div>
            <div className="summary-info">
              <span className="summary-label">Valor Pago</span>
              <span className="summary-value">{formatPrice(totalPago)}</span>
              <span className="summary-detail">Total de receitas</span>
            </div>
          </div>
          <div className="summary-card divida">
            <div className="summary-icon">📊</div>
            <div className="summary-info">
              <span className="summary-label">Em Dívida</span>
              <span className="summary-value">{formatPrice(resumo.emDivida)}</span>
              <span className="summary-detail">
                {resumo.emDivida > 0 ? 'Por receber' : 'Tudo pago'}
              </span>
            </div>
          </div>
          <div className="summary-card total">
            <div className="summary-icon">📋</div>
            <div className="summary-info">
              <span className="summary-label">Total Registos</span>
              <span className="summary-value">{resumo.totalRegistos}</span>
              <span className="summary-detail">
                {resumo.totalRemovidos > 0 && `${resumo.totalRemovidos} removidos`}
                {resumo.totalRemovidos > 0 && resumo.totalReduzidos > 0 && ' · '}
                {resumo.totalReduzidos > 0 && `${resumo.totalReduzidos} reduzidos`}
                {resumo.totalRemovidos === 0 && resumo.totalReduzidos === 0 && 'Todos ativos'}
              </span>
            </div>
          </div>
        </div>

        <div className="filters-section">
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
              placeholder="Aluno ou serviço..."
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="filtroStatus">Status:</label>
            <select
              id="filtroStatus"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="filter-input"
            >
              <option value="todos">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="removidos">Removidos</option>
              <option value="reduzidos">Reduzidos</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <h3>Nenhum registo encontrado</h3>
            <p>Tente ajustar os filtros.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Aluno</th>
                  <th>Serviço</th>
                  <th>Preço Unitário</th>
                  <th>Quantidade</th>
                  <th>Preço Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className={r.status === 'removido' || r.status === 'reduzido' ? 'removed-row' : ''}>
                    <td>{formatDateTime(r.data)}</td>
                    <td>{r.alunoName}</td>
                    <td>{r.servicoName}</td>
                    <td>{formatPrice(r.precoUnitario)}</td>
                    <td>{r.quantidade}</td>
                    <td>{formatPrice(r.precoTotal)}</td>
                    <td>
                      {r.status === 'removido' ? (
                        <span className="status-badge removed">REMOVIDO</span>
                      ) : r.status === 'reduzido' ? (
                        <span className="status-badge reduced">REDUZIDO</span>
                      ) : (
                        <span className="status-badge active">ATIVO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan="5" className="totals-label">
                    Total ({filteredTotals.count} registos filtrados)
                  </td>
                  <td className="totals-value">{formatPrice(filteredTotals.valorFiltrado)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicosPrestados;



