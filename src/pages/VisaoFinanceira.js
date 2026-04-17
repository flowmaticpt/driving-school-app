import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import './VisaoFinanceira.css';

const VisaoFinanceira = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [escola, setEscola] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dadosFinanceiros, setDadosFinanceiros] = useState({
    totalAPagar: 0,
    receitas: 0,
    despesas: 0,
    lucroLiquido: 0,
    banco: 0,
    dinheiroFisico: 0
  });

  // Verificar se o utilizador é owner
  const isOwner = userData?.role === 'dono';

  useEffect(() => {
    if (escolaId) {
      fetchEscola();
    }
  }, [escolaId]);

  useEffect(() => {
    if (escola) {
      calcularDadosFinanceiros();
    }
  }, [escola, periodo, dataInicio, dataFim]);

  // Forçar período "hoje" para utilizadores não-owner
  useEffect(() => {
    if (userData && !isOwner && periodo !== 'hoje') {
      setPeriodo('hoje');
      setDataInicio('');
      setDataFim('');
    }
  }, [userData, isOwner, periodo]);

  const fetchEscola = async () => {
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaDoc = await getDoc(escolaRef);
      
      if (escolaDoc.exists()) {
        setEscola({ id: escolaDoc.id, ...escolaDoc.data() });
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

  const obterPeriodo = () => {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);
    
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);

    switch (periodo) {
      case 'hoje':
        return {
          inicio: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0, 0),
          fim: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999)
        };
      case 'semana':
        return { inicio: inicioSemana, fim: fimSemana };
      case 'mes':
        return { inicio: inicioMes, fim: fimMes };
      case 'sempre':
        return { inicio: null, fim: null }; // Sem filtro de data
      case 'personalizado':
        return {
          inicio: dataInicio ? new Date(dataInicio + 'T00:00:00.000Z') : null,
          fim: dataFim ? new Date(dataFim + 'T23:59:59.999Z') : null
        };
      default:
        return { inicio: null, fim: null };
    }
  };

  const calcularDadosFinanceiros = async () => {
    try {
      setLoading(true);
      
      // Calcular total a pagar (sempre de todos os tempos)
      const totalAPagar = await calcularTotalAPagar();
      
      // Obter período selecionado
      const { inicio, fim } = obterPeriodo();
      
      if (!inicio || !fim) {
        setDadosFinanceiros({
          totalAPagar,
          receitas: 0,
          despesas: 0,
          lucroLiquido: 0,
          banco: 0,
          dinheiroFisico: 0
        });
        return;
      }

      // Calcular outros valores baseados no período
      const { receitas, despesas, banco, dinheiroFisico } = await calcularValoresPeriodo(inicio, fim);
      const lucroLiquido = receitas - despesas;

      setDadosFinanceiros({
        totalAPagar,
        receitas,
        despesas,
        lucroLiquido,
        banco,
        dinheiroFisico
      });
    } catch (err) {
      console.error('Erro ao calcular dados financeiros:', err);
      setError('Erro ao calcular dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalAPagar = async () => {
    try {
      // Buscar todos os students
      const studentsRef = collection(db, 'schools', escolaId, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      let total = 0;
      studentsSnapshot.forEach(doc => {
        const aluno = doc.data();
        
        const totalServicos = (aluno.servicosAtivos || []).reduce((sum, servico) => {
          return sum + (servico.servicoPrice * servico.quantity);
        }, 0);

        const totalMateriais = (aluno.materiaisComprados || []).reduce((sum, material) => {
          return sum + (material.materialPrice * material.quantity);
        }, 0);

        const totalPagamentos = (aluno.pagamentos || []).reduce((sum, pagamento) => {
          const tipo = pagamento.tipo || pagamento.type;
          
          // Pagamentos do tipo "pagamento" não têm "isPago", apenas "valor"
          if (tipo === 'pagamento' && pagamento.valor) {
            return sum + parseFloat(pagamento.valor);
          }
          
          // Para pagamentos a pronto, sempre contar o valor (já estão pagos)
          if (tipo === 'pronto' && pagamento.value) {
            return sum + parseFloat(pagamento.value);
          }
          
          // Para prestações, só contar se estiverem pagas
          if (tipo === 'prestacao' && pagamento.isPago === true) {
            return sum + parseFloat(pagamento.valorPrestacao || pagamento.value || 0);
          }
          
          // Outros tipos: só contar se isPago é true
          if (pagamento.isPago === true && pagamento.value) {
            return sum + parseFloat(pagamento.value);
          }
          
          return sum;
        }, 0);

        total += (totalServicos + totalMateriais) - totalPagamentos;
      });

      return total;
    } catch (err) {
      console.error('Erro ao calcular total a pagar:', err);
      return 0;
    }
  };

  const calcularValoresPeriodo = async (inicio, fim) => {
    try {
      // Buscar movimentos do período
      const movementsRef = collection(db, 'schools', escolaId, 'movements');
      let q;
      
      if (inicio && fim) {
        q = query(
          movementsRef,
          where('date', '>=', inicio),
          where('date', '<=', fim),
          orderBy('date', 'desc'),
          limit(1000)
        );
      } else {
        // Para "sempre", buscar todos os movimentos (limitado para performance)
        q = query(movementsRef, orderBy('date', 'desc'), limit(1000));
      }
      
      const movementsSnapshot = await getDocs(q);
      
      let receitas = 0;
      let despesas = 0;
      let banco = 0;
      let dinheiroFisico = 0;

      movementsSnapshot.forEach(doc => {
        const movimento = doc.data();
        
        // Ignorar movimentos que não afetam o financeiro
        if (movimento.naoAfetarFinanceiro) {
          return;
        }
        
        // Receitas: pagamentos de students (valor positivo)
        if (movimento.type === 'pagamento' && movimento.value > 0) {
          receitas += movimento.value;
        }
        
        // Despesas: movimentos negativos (criação/reabastecimento de materiais, despesas)
        if (movimento.value < 0) {
          despesas += Math.abs(movimento.value);
        }

        // Banco: transferências e multibanco
        if (movimento.paymentMethod === 'transferencia' || movimento.paymentMethod === 'multibanco') {
          if (movimento.value > 0) {
            banco += movimento.value;
          } else {
            banco += movimento.value; // Pode ser negativo para despesas
          }
        }

        // Dinheiro físico: movimentos com dinheiro
        if (movimento.paymentMethod === 'dinheiro') {
          if (movimento.value > 0) {
            dinheiroFisico += movimento.value;
          } else {
            dinheiroFisico += movimento.value; // Pode ser negativo para despesas
          }
        }
      });

      return { receitas, despesas, banco, dinheiroFisico };
    } catch (err) {
      console.error('Erro ao calcular valores do período:', err);
      return { receitas: 0, despesas: 0, banco: 0, dinheiroFisico: 0 };
    }
  };

  const handlePeriodoChange = (novoPeriodo) => {
    // Apenas owner pode alterar o período
    if (!isOwner && novoPeriodo !== 'hoje') {
      return;
    }
    
    setPeriodo(novoPeriodo);
    if (novoPeriodo !== 'personalizado') {
      setDataInicio('');
      setDataFim('');
    }
  };

  const handleVoltar = () => {
    navigate(`/escola/${escolaId}`);
  };


  const formatarPeriodo = () => {
    if (periodo === 'sempre') {
      return 'Total de Sempre';
    }
    
    const { inicio, fim } = obterPeriodo();
    if (!inicio || !fim) return 'Período inválido';
    
    if (periodo === 'hoje') {
      return 'Hoje';
    } else if (periodo === 'semana') {
      return `Semana de ${inicio.toLocaleDateString('pt-PT')} a ${fim.toLocaleDateString('pt-PT')}`;
    } else if (periodo === 'mes') {
      return `Mês de ${inicio.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`;
    } else if (periodo === 'personalizado') {
      return `${inicio.toLocaleDateString('pt-PT')} a ${fim.toLocaleDateString('pt-PT')}`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="visao-financeira">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar dados financeiros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visao-financeira">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="error-container">
          <h2>Erro</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visao-financeira">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
      
      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="header-left">
              <button className="back-button" onClick={handleVoltar}>
                ← Voltar
              </button>
              <div className="header-text">
                <h1>Visão Financeira - {escola?.name}</h1>
                <p className="periodo-info">{formatarPeriodo()}</p>
              </div>
            </div>
          </div>
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
            {isOwner && (
              <>
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
              </>
            )}
          </div>

          {isOwner && periodo === 'personalizado' && (
            <div className="periodo-custom">
              <div className="date-inputs">
                <div className="date-group">
                  <label htmlFor="dataInicio">Data Início:</label>
                  <input
                    type="date"
                    id="dataInicio"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                <div className="date-group">
                  <label htmlFor="dataFim">Data Fim:</label>
                  <input
                    type="date"
                    id="dataFim"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cards Financeiros */}
        <div className="cards-container">
          <div className="finance-card total-pagar">
            <div className="card-header">
              <h3>Total a Pagar (De Sempre)</h3>
              <span className="card-icon">💰</span>
            </div>
            <div className="card-value">
              {formatPrice(dadosFinanceiros.totalAPagar)}
            </div>
            <p className="card-description">Dívidas de todos os students</p>
          </div>

          <div className="finance-card receitas">
            <div className="card-header">
              <h3>Receitas</h3>
              <span className="card-icon">📈</span>
            </div>
            <div className="card-value">
              {formatPrice(dadosFinanceiros.receitas)}
            </div>
            <p className="card-description">Pagamentos de students</p>
          </div>

          <div className="finance-card despesas">
            <div className="card-header">
              <h3>Despesas</h3>
              <span className="card-icon">📉</span>
            </div>
            <div className="card-value">
              {formatPrice(dadosFinanceiros.despesas)}
            </div>
            <p className="card-description">Gastos da escola</p>
          </div>

          <div className="finance-card lucro">
            <div className="card-header">
              <h3>Lucro Líquido</h3>
              <span className="card-icon">💎</span>
            </div>
            <div className="card-value">
              {formatPrice(dadosFinanceiros.lucroLiquido)}
            </div>
            <p className="card-description">Receitas - Despesas</p>
          </div>

          <div className="finance-card banco">
            <div className="card-header">
              <h3>Banco</h3>
              <span className="card-icon">🏦</span>
            </div>
            <div className="card-value">
              {formatPrice(dadosFinanceiros.banco)}
            </div>
            <p className="card-description">Transferências + Multibanco</p>
          </div>

          <div className="finance-card dinheiro">
            <div className="card-header">
              <h3>Dinheiro Físico</h3>
              <span className="card-icon">💵</span>
            </div>
            <div className="card-value">
              {formatPrice(dadosFinanceiros.dinheiroFisico)}
            </div>
            <p className="card-description">Pagamentos em dinheiro</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisaoFinanceira;
