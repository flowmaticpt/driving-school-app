import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import * as XLSX from 'xlsx';
import './Relatorios.css';

const Relatorios = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const [escola, setEscola] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState('sempre');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [students, setAlunos] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [servicosPrestados, setServicosPrestados] = useState([]);
  const [materiaisPrestados, setMateriaisPrestados] = useState([]);

  useEffect(() => {
    fetchEscola();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaId]);

  useEffect(() => {
    if (escola) {
      fetchAlunos();
      fetchMovimentos();
      fetchServicosPrestados();
      fetchMateriaisPrestados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escola, periodo, dataInicio, dataFim]);

  const fetchEscola = async () => {
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);
      
      if (escolaSnap.exists()) {
        setEscola({ id: escolaSnap.id, ...escolaSnap.data() });
      } else {
        setError('Escola não encontrada');
      }
    } catch (err) {
      console.error('Erro ao buscar escola:', err);
      setError('Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlunos = async () => {
    try {
      const studentsRef = collection(db, 'schools', escolaId, 'students');
      const studentsSnap = await getDocs(query(studentsRef, orderBy('name'), limit(1000)));
      
      const studentsData = [];
      studentsSnap.forEach(doc => {
        studentsData.push({ id: doc.id, ...doc.data() });
      });
      
      setAlunos(studentsData);
    } catch (err) {
      console.error('Erro ao buscar students:', err);
    }
  };

  const fetchMovimentos = async () => {
    try {
      const movementsRef = collection(db, 'schools', escolaId, 'movements');
      let movementsQuery = query(movementsRef, orderBy('date', 'desc'), limit(1000));
      
      // Aplicar filtro de data se necessário
      if (periodo !== 'sempre') {
        const { inicio, fim } = obterPeriodo();
        if (inicio && fim) {
          movementsQuery = query(
            movementsRef,
            where('date', '>=', inicio),
            where('date', '<=', fim),
            orderBy('date', 'desc'),
            limit(1000)
          );
        }
      }
      
      const movementsSnap = await getDocs(movementsQuery);
      const movementsData = [];
      movementsSnap.forEach(doc => {
        movementsData.push({ id: doc.id, ...doc.data() });
      });
      
      setMovimentos(movementsData);
    } catch (err) {
      console.error('Erro ao buscar movimentos:', err);
    }
  };

  const fetchServicosPrestados = async () => {
    try {
      const ref = collection(db, 'schools', escolaId, 'servicosPrestados');
      let qRef = query(ref, orderBy('data', 'desc'), limit(1000));
      if (periodo !== 'sempre') {
        const { inicio, fim } = obterPeriodo();
        if (inicio && fim) {
          qRef = query(ref, where('data', '>=', inicio), where('data', '<=', fim), orderBy('data', 'desc'), limit(1000));
        }
      }
      const snap = await getDocs(qRef);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setServicosPrestados(items);
    } catch (err) {
      console.error('Erro ao buscar serviços prestados:', err);
    }
  };

  const fetchMateriaisPrestados = async () => {
    try {
      const ref = collection(db, 'schools', escolaId, 'materiaisPrestados');
      let qRef = query(ref, orderBy('data', 'desc'), limit(1000));
      if (periodo !== 'sempre') {
        const { inicio, fim } = obterPeriodo();
        if (inicio && fim) {
          qRef = query(ref, where('data', '>=', inicio), where('data', '<=', fim), orderBy('data', 'desc'), limit(1000));
        }
      }
      const snap = await getDocs(qRef);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMateriaisPrestados(items);
    } catch (err) {
      console.error('Erro ao buscar materiais prestados:', err);
    }
  };

  const obterPeriodo = () => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    let inicio, fim;
    
    switch (periodo) {
      case 'hoje':
        inicio = new Date(hoje);
        inicio.setHours(0, 0, 0, 0);
        fim = hoje;
        break;
      case 'semana':
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - hoje.getDay());
        inicio.setHours(0, 0, 0, 0);
        fim = hoje;
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        inicio.setHours(0, 0, 0, 0);
        fim = hoje;
        break;
      case 'personalizado':
        inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
        fim = dataFim ? new Date(dataFim + 'T23:59:59') : null;
        break;
      default:
        inicio = null;
        fim = null;
    }
    
    return { inicio, fim };
  };

  const calcularDividaAluno = (aluno) => {
    let totalServicos = 0;
    let totalMateriais = 0;
    let totalPagamentos = 0;

    // Calcular total de serviços
    if (aluno.servicosAtivos) {
      aluno.servicosAtivos.forEach(servico => {
        if (servico.ativo) {
          totalServicos += servico.servicoPrice * servico.quantidade;
        }
      });
    }

    // Calcular total de materiais
    if (aluno.materiaisComprados) {
      aluno.materiaisComprados.forEach(material => {
        totalMateriais += material.materialPrice * material.quantidade;
      });
    }

    // Calcular total de pagamentos efetuados (apenas pagos)
    if (aluno.pagamentos) {
      aluno.pagamentos.forEach(pagamento => {
        // Compatibilidade com ambas as estruturas
        const pagamentoType = pagamento.type || pagamento.tipo || 'pronto';
        const pagamentoValue = pagamento.value || pagamento.valor || 0;
        
        // Para pagamentos a pronto, sempre contar o valor (já estão pagos)
        if (pagamentoType === 'pronto') {
          totalPagamentos += pagamentoValue;
        }
        // Para prestações, só contar se estiverem pagas
        else if (pagamentoType === 'prestacao' && pagamento.isPago === true) {
          totalPagamentos += pagamento.valorPrestacao || pagamentoValue;
        }
        // Para outros tipos (compatibilidade), contar o valor
        else {
          totalPagamentos += pagamento.valorPago || pagamentoValue;
        }
      });
    }

    return {
      totalDivida: totalServicos + totalMateriais,
      totalPagamentos: totalPagamentos,
      saldo: (totalServicos + totalMateriais) - totalPagamentos
    };
  };


  const formatarPeriodo = () => {
    switch (periodo) {
      case 'hoje':
        return 'Hoje';
      case 'semana':
        return 'Semana Atual';
      case 'mes':
        return 'Mês Atual';
      case 'sempre':
        return 'Total de Sempre';
      case 'personalizado':
        if (dataInicio && dataFim) {
          return `${dataInicio} a ${dataFim}`;
        }
        return 'Período Personalizado';
      default:
        return 'Período';
    }
  };

  const handlePeriodoChange = (novoPeriodo) => {
    setPeriodo(novoPeriodo);
    if (novoPeriodo !== 'personalizado') {
      setDataInicio('');
      setDataFim('');
    }
  };

  const handleVoltar = () => {
    navigate(`/escola/${escolaId}`);
  };

  const calcularLargurasColunas = (dados) => {
    const colWidths = dados.reduce((acc, row) => {
      Object.keys(row).forEach((key, i) => {
        const len = String(row[key] || '').length;
        acc[i] = Math.max(acc[i] || key.length, len);
      });
      return acc;
    }, {});
    return Object.values(colWidths).map(w => ({ wch: Math.min(w + 2, 40) }));
  };

  const exportarRelatorioAlunos = () => {
    try {
      const dados = students.map(aluno => {
        const divida = calcularDividaAluno(aluno);
        return {
          'Nome': aluno.name,
          'Número de Aluno': aluno.numeroAluno || 'N/A',
          'Total a Pagar': (divida.totalDivida || 0).toFixed(2) + ' \u20AC',
          'Total Já Pago': (divida.totalPagamentos || 0).toFixed(2) + ' \u20AC',
          'Saldo': (divida.saldo || 0).toFixed(2) + ' \u20AC'
        };
      });

      const ws = XLSX.utils.json_to_sheet(dados);
      ws['!cols'] = calcularLargurasColunas(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Alunos');

      const fileName = `Relatorio_Alunos_${escola?.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Erro ao exportar relatório de alunos:', err);
      alert('Erro ao exportar relatório de alunos. Tente novamente.');
    }
  };

  const exportarRelatorioMovimentos = () => {
    try {
      const dados = movimentos.map(movimento => {
        const data = movimento.date?.toDate ? movimento.date.toDate() : new Date(movimento.date);
        const alunoNumero = (() => {
          const aluno = students.find(a => a.id === movimento.alunoId);
          return aluno?.enrollmentNumber || aluno?.studentNumber || 'N/A';
        })();
        const naoAfetaFinanceiro = movimento.naoAfetarFinanceiro === true;
        return {
          'Data': data.toLocaleDateString('pt-PT'),
          'Tipo': movimento.type || movimento.tipo || 'N/A',
          'Descrição': movimento.description || movimento.descricao || 'N/A',
          'Quantidade': movimento.quantity || movimento.quantidade || 1,
          'Valor': (movimento.value || movimento.valor || 0).toFixed(2) + ' \u20AC',
          'Método de Pagamento': movimento.paymentMethod || movimento.metodoPagamento || 'N/A',
          'Aluno': movimento.alunoName || 'N/A',
          'Número de Aluno': alunoNumero,
          'Tipo de Operação': movimento.typeOperacao || 'N/A',
          'Não Afeta Visão Financeira': naoAfetaFinanceiro ? 'Sim' : 'Não'
        };
      });

      const ws = XLSX.utils.json_to_sheet(dados);
      ws['!cols'] = calcularLargurasColunas(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Movimentos');

      const fileName = `Relatorio_Movimentos_${escola?.name}_${formatarPeriodo().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Erro ao exportar relatório de movimentos:', err);
      alert('Erro ao exportar relatório de movimentos. Tente novamente.');
    }
  };

  const exportarRelatorioServicosPrestados = () => {
    try {
      const dados = servicosPrestados.map(r => {
        const data = r.data?.toDate ? r.data.toDate() : new Date(r.data);
        const total = r.precoTotal || ((r.precoUnitario || 0) * (r.quantidade || 1));
        return {
          'Data': data.toLocaleDateString('pt-PT'),
          'Aluno': r.alunoName || 'N/A',
          'Serviço': r.servicoName || 'N/A',
          'Preço Unitário': (r.precoUnitario || 0).toFixed(2) + ' \u20AC',
          'Quantidade': r.quantidade || 1,
          'Preço Total': (total).toFixed(2) + ' \u20AC'
        };
      });

      const ws = XLSX.utils.json_to_sheet(dados);
      ws['!cols'] = calcularLargurasColunas(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Serviços Prestados');
      const fileName = `Relatorio_ServicosPrestados_${escola?.name}_${formatarPeriodo().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Erro ao exportar relatório de serviços prestados:', err);
      alert('Erro ao exportar relatório de serviços prestados. Tente novamente.');
    }
  };

  const exportarRelatorioMateriaisPrestados = () => {
    try {
      const dados = materiaisPrestados.map(r => {
        const data = r.data?.toDate ? r.data.toDate() : new Date(r.data);
        const total = r.precoTotal || ((r.precoUnitario || 0) * (r.quantidade || 1));
        return {
          'Data': data.toLocaleDateString('pt-PT'),
          'Aluno': r.alunoName || 'N/A',
          'Material': r.materialName || 'N/A',
          'Preço Unitário': (r.precoUnitario || 0).toFixed(2) + ' \u20AC',
          'Quantidade': r.quantidade || 1,
          'Preço Total': (total).toFixed(2) + ' \u20AC'
        };
      });

      const ws = XLSX.utils.json_to_sheet(dados);
      ws['!cols'] = calcularLargurasColunas(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Materiais Prestados');
      const fileName = `Relatorio_MateriaisPrestados_${escola?.name}_${formatarPeriodo().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Erro ao exportar relatório de materiais prestados:', err);
      alert('Erro ao exportar relatório de materiais prestados. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="relatorios">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando relatórios...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relatorios">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="container">
          <div className="error-container">
            <h2>Erro</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Tentar Novamente</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relatorios">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
      
      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="header-left">
              <button className="back-button" onClick={handleVoltar}>
                ← Voltar
              </button>
              <div className="header-text">
                <h1>Relatórios - {escola?.name}</h1>
                <p className="subtitle">Exporte dados em formato Excel</p>
              </div>
            </div>
          </div>
        </div>

        {/* Relatório de Alunos */}
        <div className="report-section">
          <div className="report-header">
            <h2>📊 Relatório de Alunos</h2>
            <p>Lista todos os students com informações de pagamento</p>
          </div>
          
          <div className="report-info">
            <div className="info-item">
              <span className="info-label">Total de Alunos:</span>
              <span className="info-value">{students.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Período:</span>
              <span className="info-value">Todos os tempos</span>
            </div>
          </div>
          
          <button className="export-button students" onClick={exportarRelatorioAlunos}>
            📥 Exportar Relatório de Alunos
          </button>
        </div>

        {/* Relatório de Movimentos */}
        <div className="report-section">
          <div className="report-header">
            <h2>💰 Relatório de Movimentos</h2>
            <p>Lista todos os movimentos financeiros</p>
          </div>

          {/* Seletor de Período */}
          <div className="periodo-selector">
            <div className="periodo-buttons">
              <button 
                className={`periodo-btn ${periodo === 'hoje' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('hoje')}
              >
                Hoje
              </button>
              <button 
                className={`periodo-btn ${periodo === 'semana' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('semana')}
              >
                Semana Atual
              </button>
              <button 
                className={`periodo-btn ${periodo === 'mes' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('mes')}
              >
                Mês Atual
              </button>
              <button 
                className={`periodo-btn ${periodo === 'sempre' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('sempre')}
              >
                Total de Sempre
              </button>
              <button 
                className={`periodo-btn ${periodo === 'personalizado' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('personalizado')}
              >
                Personalizado
              </button>
            </div>
            
            {periodo === 'personalizado' && (
              <div className="date-inputs">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  placeholder="Data de início"
                />
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  placeholder="Data de fim"
                />
              </div>
            )}
          </div>
          
          <div className="report-info">
            <div className="info-item">
              <span className="info-label">Total de Movimentos:</span>
              <span className="info-value">{movimentos.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Período:</span>
              <span className="info-value">{formatarPeriodo()}</span>
            </div>
          </div>
          
          <button className="export-button movimentos" onClick={exportarRelatorioMovimentos}>
            📥 Exportar Relatório de Movimentos
          </button>
        </div>

        {/* Relatório de Serviços Prestados */}
        <div className="report-section">
          <div className="report-header">
            <h2>🧾 Relatório de Serviços Prestados</h2>
            <p>Lista todos os serviços adicionados aos alunos</p>
          </div>

          <div className="periodo-selector">
            <div className="periodo-buttons">
              <button 
                className={`periodo-btn ${periodo === 'hoje' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('hoje')}
              >
                Hoje
              </button>
              <button 
                className={`periodo-btn ${periodo === 'semana' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('semana')}
              >
                Semana Atual
              </button>
              <button 
                className={`periodo-btn ${periodo === 'mes' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('mes')}
              >
                Mês Atual
              </button>
              <button 
                className={`periodo-btn ${periodo === 'sempre' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('sempre')}
              >
                Total de Sempre
              </button>
              <button 
                className={`periodo-btn ${periodo === 'personalizado' ? 'active' : ''}`}
                onClick={() => handlePeriodoChange('personalizado')}
              >
                Personalizado
              </button>
            </div>
            {periodo === 'personalizado' && (
              <div className="date-inputs">
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            )}
          </div>

          <div className="report-info">
            <div className="info-item">
              <span className="info-label">Total de Registos:</span>
              <span className="info-value">{servicosPrestados.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Período:</span>
              <span className="info-value">{formatarPeriodo()}</span>
            </div>
          </div>

          <button className="export-button movimentos" onClick={exportarRelatorioServicosPrestados}>
            📥 Exportar Relatório de Serviços Prestados
          </button>
        </div>

        {/* Relatório de Materiais Prestados */}
        <div className="report-section">
          <div className="report-header">
            <h2>📦 Relatório de Materiais Prestados</h2>
            <p>Lista todos os materiais fornecidos aos alunos</p>
          </div>

          <div className="periodo-selector">
            <div className="periodo-buttons">
              <button className={`periodo-btn ${periodo === 'hoje' ? 'active' : ''}`} onClick={() => handlePeriodoChange('hoje')}>Hoje</button>
              <button className={`periodo-btn ${periodo === 'semana' ? 'active' : ''}`} onClick={() => handlePeriodoChange('semana')}>Semana Atual</button>
              <button className={`periodo-btn ${periodo === 'mes' ? 'active' : ''}`} onClick={() => handlePeriodoChange('mes')}>Mês Atual</button>
              <button className={`periodo-btn ${periodo === 'sempre' ? 'active' : ''}`} onClick={() => handlePeriodoChange('sempre')}>Total de Sempre</button>
              <button className={`periodo-btn ${periodo === 'personalizado' ? 'active' : ''}`} onClick={() => handlePeriodoChange('personalizado')}>Personalizado</button>
            </div>
            {periodo === 'personalizado' && (
              <div className="date-inputs">
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            )}
          </div>

          <div className="report-info">
            <div className="info-item">
              <span className="info-label">Total de Registos:</span>
              <span className="info-value">{materiaisPrestados.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Período:</span>
              <span className="info-value">{formatarPeriodo()}</span>
            </div>
          </div>

          <button className="export-button movimentos" onClick={exportarRelatorioMateriaisPrestados}>
            📥 Exportar Relatório de Materiais Prestados
          </button>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
