import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import * as XLSX from 'xlsx';
import './RelatoriosGlobais.css';

const RelatoriosGlobais = () => {
  const [allEscolas, setAllEscolas] = useState([]);
  const [selectedEscolaId, setSelectedEscolaId] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [loadingEscolas, setLoadingEscolas] = useState(true);
  const [error, setError] = useState('');

  const [periodo, setPeriodo] = useState('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [movimentos, setMovimentos] = useState([]);
  const [servicosPrestados, setServicosPrestados] = useState([]);
  const [materiaisPrestados, setMateriaisPrestados] = useState([]);

  useEffect(() => {
    const loadEscolas = async () => {
      try {
        setLoadingEscolas(true);
        const schoolsRef = collection(db, 'schools');
        const schoolsQuery = query(schoolsRef, orderBy('name'));
        const schoolsSnapshot = await getDocs(schoolsQuery);
        const schoolsData = schoolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllEscolas(schoolsData);
      } catch (e) {
        setError('Erro ao carregar escolas');
      } finally {
        setLoadingEscolas(false);
      }
    };
    loadEscolas();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const escolasAlvo = selectedEscolaId === 'todas' ? allEscolas.map(e => e.id) : [selectedEscolaId];
        if (selectedEscolaId === 'todas' && allEscolas.length === 0) {
          setMovimentos([]);
          setServicosPrestados([]);
          setMateriaisPrestados([]);
          setLoading(false);
          return;
        }
        const { inicio, fim } = obterPeriodo();

        // OTIMIZADO: Paralelizar todas as queries em vez de sequencial
        // Movimentos - paralelo
        const movimentosPromises = escolasAlvo.map(async (escolaId) => {
          const ref = collection(db, 'schools', escolaId, 'movements');
          let qRef = query(ref, orderBy('date', 'desc'));
          if (periodo !== 'sempre' && inicio && fim) {
            qRef = query(ref, where('date', '>=', inicio), where('date', '<=', fim), orderBy('date', 'desc'));
          }
          const snap = await getDocs(qRef);
          return snap.docs.map(d => ({ escolaId, ...d.data() }));
        });

        // Serviços Prestados - paralelo
        const servicosPromises = escolasAlvo.map(async (escolaId) => {
          const ref = collection(db, 'schools', escolaId, 'servicosPrestados');
          let qRef = query(ref, orderBy('data', 'desc'));
          if (periodo !== 'sempre' && inicio && fim) {
            qRef = query(ref, where('data', '>=', inicio), where('data', '<=', fim), orderBy('data', 'desc'));
          }
          const snap = await getDocs(qRef);
          return snap.docs.map(d => ({ escolaId, ...d.data() }));
        });

        // Materiais Prestados - paralelo
        const materiaisPromises = escolasAlvo.map(async (escolaId) => {
          const ref = collection(db, 'schools', escolaId, 'materiaisPrestados');
          let qRef = query(ref, orderBy('data', 'desc'));
          if (periodo !== 'sempre' && inicio && fim) {
            qRef = query(ref, where('data', '>=', inicio), where('data', '<=', fim), orderBy('data', 'desc'));
          }
          const snap = await getDocs(qRef);
          return snap.docs.map(d => ({ escolaId, ...d.data() }));
        });

        // Executar todas as queries em paralelo
        const [movimentosResults, servicosResults, materiaisResults] = await Promise.all([
          Promise.all(movimentosPromises),
          Promise.all(servicosPromises),
          Promise.all(materiaisPromises)
        ]);

        // Flatten dos resultados
        setMovimentos(movimentosResults.flat());
        setServicosPrestados(servicosResults.flat());
        setMateriaisPrestados(materiaisResults.flat());

      } catch (e) {
        setError('Erro ao carregar dados dos relatórios');
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEscolaId, periodo, dataInicio, dataFim, allEscolas]);

  const obterPeriodo = () => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    let inicio, fim;
    switch (periodo) {
      case 'hoje':
        inicio = new Date(hoje); inicio.setHours(0, 0, 0, 0); fim = hoje; break;
      case 'semana':
        inicio = new Date(hoje); inicio.setDate(hoje.getDate() - hoje.getDay()); inicio.setHours(0, 0, 0, 0); fim = hoje; break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1); inicio.setHours(0, 0, 0, 0); fim = hoje; break;
      case 'personalizado':
        inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
        fim = dataFim ? new Date(dataFim + 'T23:59:59') : null;
        break;
      default:
        inicio = null; fim = null;
    }
    return { inicio, fim };
  };

  const formatarPeriodo = () => {
    switch (periodo) {
      case 'hoje': return 'Hoje';
      case 'semana': return 'Semana Atual';
      case 'mes': return 'Mês Atual';
      case 'sempre': return 'Total de Sempre';
      case 'personalizado': return (dataInicio && dataFim) ? `${dataInicio} a ${dataFim}` : 'Período Personalizado';
      default: return 'Período';
    }
  };

  const exportXlsx = (nome, dados) => {
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nome);
    const fileName = `${nome}_${selectedEscolaId === 'todas' ? 'Todas' : (allEscolas.find(e => e.id === selectedEscolaId)?.name || selectedEscolaId)}_${formatarPeriodo().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportarMovimentos = () => {
    const dados = movimentos.map(m => {
      const data = m.date?.toDate ? m.date.toDate() : new Date(m.date);
      const naoAfetaFinanceiro = m.naoAfetarFinanceiro === true;
      return {
        'Escola': (allEscolas.find(e => e.id === m.escolaId)?.name) || m.escolaId,
        'Data': isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-PT'),
        'Tipo': m.type || m.tipo || 'N/A',
        'Descrição': m.description || m.descricao || 'N/A',
        'Quantidade': m.quantity || m.quantidade || 1,
        'Valor': m.value || m.valor || 0,
        'Método de Pagamento': m.paymentMethod || m.metodoPagamento || 'N/A',
        'Aluno': m.alunoName || 'N/A',
        'Tipo de Operação': m.typeOperacao || 'N/A',
        'Não Afeta Visão Financeira': naoAfetaFinanceiro ? 'Sim' : 'Não'
      };
    });
    exportXlsx('Movimentos', dados);
  };

  const exportarServicos = () => {
    const dados = servicosPrestados.map(r => {
      const data = r.data?.toDate ? r.data.toDate() : new Date(r.data);
      return {
        'Escola': (allEscolas.find(e => e.id === r.escolaId)?.name) || r.escolaId,
        'Data': isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-PT'),
        'Aluno': r.alunoName || 'N/A',
        'Serviço': r.servicoName || 'N/A',
        'Preço Unitário': r.precoUnitario || 0,
        'Quantidade': r.quantidade || 1,
        'Preço Total': r.precoTotal || ((r.precoUnitario || 0) * (r.quantidade || 1))
      };
    });
    exportXlsx('ServicosPrestados', dados);
  };

  const exportarMateriais = () => {
    const dados = materiaisPrestados.map(r => {
      const data = r.data?.toDate ? r.data.toDate() : new Date(r.data);
      return {
        'Escola': (allEscolas.find(e => e.id === r.escolaId)?.name) || r.escolaId,
        'Data': isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-PT'),
        'Aluno': r.alunoName || 'N/A',
        'Material': r.materialName || 'N/A',
        'Preço Unitário': r.precoUnitario || 0,
        'Quantidade': r.quantidade || 1,
        'Preço Total': r.precoTotal || ((r.precoUnitario || 0) * (r.quantidade || 1))
      };
    });
    exportXlsx('MateriaisPrestados', dados);
  };

  const totalizadores = useMemo(() => ({
    movimentos: movimentos.reduce((sum, m) => sum + (m.value || m.valor || 0), 0),
    servicos: servicosPrestados.reduce((sum, r) => sum + (r.precoTotal || (r.precoUnitario || 0) * (r.quantidade || 1)), 0),
    materiais: materiaisPrestados.reduce((sum, r) => sum + (r.precoTotal || (r.precoUnitario || 0) * (r.quantidade || 1)), 0)
  }), [movimentos, servicosPrestados, materiaisPrestados]);

  if (loadingEscolas || loading) {
    return (
      <div className="relatorios-globais">
        <Navigation showBackButton={true} backPath="/" />
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>A carregar relatórios...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relatorios-globais">
        <Navigation showBackButton={true} backPath="/" />
        <div className="container">
          <div className="error-container">
            <h2>Erro</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relatorios-globais">
      <Navigation showBackButton={true} backPath="/" />
      <div className="container">
        {/* Header removed - using App.js header instead */}

        <div className="controls">
          <div className="control-group">
            <label>Escola</label>
            <select value={selectedEscolaId} onChange={(e) => setSelectedEscolaId(e.target.value)}>
              <option value="todas">Todas as escolas</option>
              {allEscolas.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Período</label>
            <div className="periodo-buttons">
              <button className={`periodo-btn ${periodo === 'hoje' ? 'active' : ''}`} onClick={() => setPeriodo('hoje')}>Hoje</button>
              <button className={`periodo-btn ${periodo === 'semana' ? 'active' : ''}`} onClick={() => setPeriodo('semana')}>Semana Atual</button>
              <button className={`periodo-btn ${periodo === 'mes' ? 'active' : ''}`} onClick={() => setPeriodo('mes')}>Mês Atual</button>
              <button className={`periodo-btn ${periodo === 'sempre' ? 'active' : ''}`} onClick={() => setPeriodo('sempre')}>Total de Sempre</button>
              <button className={`periodo-btn ${periodo === 'personalizado' ? 'active' : ''}`} onClick={() => setPeriodo('personalizado')}>Personalizado</button>
            </div>
            {periodo === 'personalizado' && (
              <div className="date-inputs">
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="cards">
          <div className="card">
            <h3>💰 Movimentos</h3>
            <div className="card-content">
              <div className="total-info">
                <span className="total-label">Total:</span>
                <span className="total-value">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalizadores.movimentos)}</span>
              </div>
              <div className="count-info">
                <span className="count-label">Registos:</span>
                <span className="count-value">{movimentos.length}</span>
              </div>
            </div>
            <button className="export-button" onClick={exportarMovimentos}>
              📥 Exportar Movimentos
            </button>
          </div>
          <div className="card">
            <h3>🧾 Serviços Prestados</h3>
            <div className="card-content">
              <div className="total-info">
                <span className="total-label">Total:</span>
                <span className="total-value">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalizadores.servicos)}</span>
              </div>
              <div className="count-info">
                <span className="count-label">Registos:</span>
                <span className="count-value">{servicosPrestados.length}</span>
              </div>
            </div>
            <button className="export-button" onClick={exportarServicos}>
              📥 Exportar Serviços
            </button>
          </div>
          <div className="card">
            <h3>📦 Materiais Prestados</h3>
            <div className="card-content">
              <div className="total-info">
                <span className="total-label">Total:</span>
                <span className="total-value">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalizadores.materiais)}</span>
              </div>
              <div className="count-info">
                <span className="count-label">Registos:</span>
                <span className="count-value">{materiaisPrestados.length}</span>
              </div>
            </div>
            <button className="export-button" onClick={exportarMateriais}>
              📥 Exportar Materiais
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosGlobais;


