import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where, doc, getDoc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import AdicionarNovoAlunoModal from '../components/AdicionarNovoAlunoModal';
import VerFichaAlunoModal from '../components/VerFichaAlunoModal';
import ConfirmarRemocaoAlunoModal from '../components/ConfirmarRemocaoAlunoModal';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../utils/formatters';
import './Alunos.css';

const Alunos = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [escola, setEscola] = useState(null);
  const [students, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos', 'divida', 'atraso'
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [showVerFichaModal, setShowVerFichaModal] = useState(false);
  const [showRemoverModal, setShowRemoverModal] = useState(false);
  
  // Check if user is owner (only owner can delete students)
  const isOwner = userData?.role === 'dono';

  const fetchEscola = async () => {
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);

      if (!escolaSnap.exists()) {
        setError('Escola não encontrada');
        return;
      }

      const escolaData = {
        id: escolaSnap.id,
        ...escolaSnap.data()
      };

      setEscola(escolaData);
    } catch (err) {
      setError('Erro ao carregar dados da escola');
    }
  };

  const fetchAlunos = async () => {
    try {
      const studentsRef = collection(db, 'schools', escolaId, 'students');
      const querySnapshot = await getDocs(query(studentsRef, limit(1000)));
      
      if (querySnapshot.empty) {
        setAlunos([]);
        return;
      }
      
      const studentsData = querySnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        return data;
      });
      
      // Filter only active students (active !== false, default to true if not set)
      const activeStudents = studentsData.filter(student => {
        return student.active !== false; // Default to true if not set
      });

      // Sort by last modified (updatedAt or createdAt) — most recent first
      activeStudents.sort((a, b) => {
        const getTime = (s) => {
          const t = s.updatedAt || s.createdAt;
          if (!t) return 0;
          if (t.toDate) return t.toDate().getTime();
          if (t.seconds) return t.seconds * 1000;
          if (t instanceof Date) return t.getTime();
          return new Date(t).getTime() || 0;
        };
        return getTime(b) - getTime(a);
      });

      setAlunos(activeStudents);
    } catch (err) {
      setError('Erro ao carregar alunos');
    }
  };

  useEffect(() => {
    if (escolaId) {
      const loadData = async () => {
        setLoading(true);
        await fetchEscola();
        await fetchAlunos();
        setLoading(false);
      };
      loadData();
    }
  }, [escolaId]);

  const handleSuccess = async (novoAluno) => {
    setIsModalOpen(false);

    // Se recebemos o aluno criado, adicioná-lo à lista imediatamente (otimista)
    if (novoAluno && novoAluno.id) {
      setAlunos(prev => sortByLastModified([novoAluno, ...prev]));
    }

    // Re-fetch em background para sincronização completa com Firebase
    // Pequeno delay para garantir que o Firestore propagou o documento
    setTimeout(async () => {
      await fetchAlunos();
    }, 500);
  };

  const sortByLastModified = (list) => {
    return [...list].sort((a, b) => {
      const getTime = (s) => {
        const t = s.updatedAt || s.createdAt;
        if (!t) return 0;
        if (t.toDate) return t.toDate().getTime();
        if (t.seconds) return t.seconds * 1000;
        if (t instanceof Date) return t.getTime();
        return new Date(t).getTime() || 0;
      };
      return getTime(b) - getTime(a);
    });
  };

  const handleAlunoUpdate = (alunoAtualizado) => {
    // Criar um novo objeto para garantir que o React detecte a mudança
    const novoAluno = { ...alunoAtualizado };

    // Atualizar o selectedAluno quando o modal fizer alterações
    setSelectedAluno(novoAluno);

    // Atualizar na lista e re-ordenar por último modificado
    setAlunos(prevAlunos =>
      sortByLastModified(
        prevAlunos.map(aluno =>
          aluno.id === novoAluno.id ? novoAluno : aluno
        )
      )
    );
  };

  const calcularDividaAluno = (aluno) => {
    if (!aluno) return 0;
    
    // Sempre calcular dinamicamente para garantir consistência com a ficha
    const servicosAtivos = aluno.services || aluno.servicosAtivos || [];
    const materiaisComprados = aluno.materials || aluno.materiaisComprados || [];
    const pagamentos = aluno.pagamentos || [];

    const totalServicos = servicosAtivos.reduce((total, servico) => {
      return total + (servico.servicoPrice * servico.quantity);
    }, 0);

    const totalMateriais = materiaisComprados.reduce((total, material) => {
      return total + (material.materialPrice * material.quantity);
    }, 0);

    const totalPagamentos = pagamentos.reduce((total, pagamento) => {
      // Compatibilidade com ambas as estruturas
      const pagamentoType = pagamento.type || pagamento.tipo || 'pronto';
      const pagamentoValue = pagamento.value || pagamento.valor || 0;
      
      if (pagamentoType === 'pronto') {
        return total + pagamentoValue;
      }
      if (pagamentoType === 'prestacao' && pagamento.isPago === true) {
        // Prestações só reduzem a dívida se estiverem pagas
        return total + (pagamento.valorPrestacao || pagamentoValue);
      }
      return total;
    }, 0);

    return (totalServicos + totalMateriais) - totalPagamentos;
  };

  const criarTotalDividaSeNaoExistir = async (aluno) => {
    // Esta função não é mais necessária pois sempre calculamos dinamicamente
    // Mantida para compatibilidade, mas não faz nada
    return;
  };

  // Calcular número de alunos com prestações em atraso
  const calcularAlunosComPrestacoesEmAtraso = () => {
    return students.filter(aluno => {
      const pagamentos = aluno.pagamentos || [];
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999); // Final do dia atual
      
      return pagamentos.some(pagamento => {
        const pagamentoType = pagamento.type || pagamento.tipo || 'pronto';
        
        if (pagamentoType === 'prestacao' && (pagamento.isPago === false || pagamento.isPago === undefined || pagamento.isPago === null)) {
          const dataMaxima = pagamento.dataMaximaPagamento;
          if (dataMaxima) {
            const dataLimite = dataMaxima.toDate ? dataMaxima.toDate() : new Date(dataMaxima);
            return dataLimite < hoje;
          }
        }
        return false;
      });
    }).length;
  };

  const handleVerFicha = (aluno) => {
    setSelectedAluno(aluno);
    setShowVerFichaModal(true);
  };

  const handleRemover = (aluno) => {
    // Only allow deletion if user is owner
    if (!isOwner) {
      alert('Apenas o dono pode remover alunos.');
      return;
    }
    setSelectedAluno(aluno);
    setShowRemoverModal(true);
  };

  const filteredAlunos = students.filter(aluno => {
    // Filtro por texto de pesquisa
    const matchesSearch = !searchTerm || typeof searchTerm !== 'string' || (() => {
      const searchLower = searchTerm.toLowerCase();
      const name = (aluno.name || '').toLowerCase();
      const email = (aluno.email || '').toLowerCase();
      const phone = (aluno.phone || '').toLowerCase();
      const enrollmentNumber = (aluno.enrollmentNumber || '').toLowerCase();
      
      return name.includes(searchLower) || 
             email.includes(searchLower) || 
             phone.includes(searchLower) ||
             enrollmentNumber.includes(searchLower);
    })();

    // Filtro por categoria
    let matchesFilter = true;
    if (activeFilter === 'divida') {
      matchesFilter = calcularDividaAluno(aluno) > 0;
    } else if (activeFilter === 'atraso') {
      const pagamentos = aluno.pagamentos || [];
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      
      matchesFilter = pagamentos.some(pagamento => {
        const pagamentoType = pagamento.type || pagamento.tipo || 'pronto';
        
        if (pagamentoType === 'prestacao' && (pagamento.isPago === false || pagamento.isPago === undefined || pagamento.isPago === null)) {
          const dataMaxima = pagamento.dataMaximaPagamento;
          if (dataMaxima) {
            const dataLimite = dataMaxima.toDate ? dataMaxima.toDate() : new Date(dataMaxima);
            return dataLimite < hoje;
          }
        }
        return false;
      });
    }

    return matchesSearch && matchesFilter;
  });

  const formatPrice = (price) => {
    if (!price) return '0,00 €';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="alunos-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar alunos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alunos-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="error-container">
          <h2>Erro</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/escolas')} className="retry-button">
            Voltar às Escolas
          </button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="alunos-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="error-container">
          <h2>Escola não encontrada</h2>
          <p>A escola solicitada não existe.</p>
          <button onClick={() => navigate('/escolas')} className="retry-button">
            Voltar às Escolas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alunos-container">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
      
      <div className="alunos-content">
        <div className="page-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Alunos - {escola.name}</h1>
              <p>Gerir alunos desta escola</p>
            </div>
            <button
              onClick={() => navigate(`/escola/${escolaId}`)}
              className="back-button"
            >
              ← Voltar à Escola
            </button>
          </div>
        </div>

        <div className="alunos-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Pesquisar por nome, email, telefone ou número de inscrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-buttons">
            <button
              className={`filter-btn ${activeFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setActiveFilter('todos')}
            >
              Todos ({students.length})
            </button>
            <button
              className={`filter-btn ${activeFilter === 'divida' ? 'active' : ''}`}
              onClick={() => setActiveFilter('divida')}
            >
              Em Dívida ({students.filter(aluno => calcularDividaAluno(aluno) > 0).length})
            </button>
            <button
              className={`filter-btn atraso ${activeFilter === 'atraso' ? 'active' : ''}`}
              onClick={() => setActiveFilter('atraso')}
            >
              Prestações em Atraso ({calcularAlunosComPrestacoesEmAtraso()})
            </button>
          </div>
          
          <div className="button-group">
            <button
              onClick={() => setIsModalOpen(true)}
              className="add-button"
            >
              + Adicionar Aluno
            </button>
            <button
              onClick={() => navigate(`/escola/${escolaId}/aulas`)}
              className="lessons-button"
            >
              📚 Aulas
            </button>
          </div>
        </div>

        <div className="alunos-stats">
          <div className="stat-card">
            <h3>Total de Alunos</h3>
            <span className="stat-number">{students.length}</span>
          </div>
          <div className="stat-card">
            <h3>Alunos em Dívida</h3>
            <span className="stat-number">
              {students.filter(aluno => calcularDividaAluno(aluno) > 0).length}
            </span>
          </div>
          <div className="stat-card">
            <h3>Prestações em Atraso</h3>
            <span className="stat-number atraso">
              {calcularAlunosComPrestacoesEmAtraso()}
            </span>
          </div>
        </div>

        {filteredAlunos.length === 0 ? (
          <div className="no-alunos">
            <h3>Nenhum aluno encontrado</h3>
            <p>
              {searchTerm 
                ? 'Nenhum aluno corresponde à sua pesquisa.' 
                : 'Esta escola ainda não tem alunos registados.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="add-button"
              >
                Adicionar Primeiro Aluno
              </button>
            )}
          </div>
        ) : (
          <div className="alunos-table-container">
            <table className="alunos-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Nº Inscrição</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Data de Registo</th>
                  <th>Valor em Dívida</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlunos.map((aluno) => {
                  const divida = calcularDividaAluno(aluno);
                  return (
                    <tr key={aluno.id}>
                      <td className="aluno-name">{aluno.name || 'N/A'}</td>
                      <td className="numero-inscricao">{aluno.enrollmentNumber || 'N/A'}</td>
                      <td>{aluno.email || 'N/A'}</td>
                      <td>{aluno.phone || 'N/A'}</td>
                      <td>{formatDate(aluno.createdAt)}</td>
                      <td className={`divida ${divida > 0 ? 'positive' : 'zero'}`}>
                        {formatPrice(divida)}
                      </td>
                      <td className="actions">
                        <button
                          onClick={() => handleVerFicha(aluno)}
                          className="view-button"
                        >
                          Ver Ficha
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => handleRemover(aluno)}
                            className="remove-button"
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Adicionar Aluno */}
      <AdicionarNovoAlunoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        escolaId={escolaId}
      />

      {/* Modal de Ver Ficha */}
      {selectedAluno && (
        <VerFichaAlunoModal
          isOpen={showVerFichaModal}
          onClose={() => {
            setShowVerFichaModal(false);
            setSelectedAluno(null);
          }}
          onSuccess={handleSuccess}
          onAlunoUpdate={handleAlunoUpdate}
          aluno={selectedAluno}
          escolaId={escolaId}
          userRole={userData?.role}
        />
      )}

      {/* Modal de Confirmação de Remoção */}
      {selectedAluno && (
        <ConfirmarRemocaoAlunoModal
          isOpen={showRemoverModal}
          onClose={() => {
            setShowRemoverModal(false);
            setSelectedAluno(null);
          }}
          onConfirm={async () => {
            try {
              // Remover aluno da base de dados
              const alunoRef = doc(db, 'schools', escolaId, 'students', selectedAluno.id);
              await deleteDoc(alunoRef);
              
              // Atualizar lista de alunos
              setAlunos(students.filter(aluno => aluno.id !== selectedAluno.id));
              
              // Fechar modal
              setShowRemoverModal(false);
              setSelectedAluno(null);
            } catch (error) {
              console.error('Erro ao remover aluno:', error);
              throw error;
            }
          }}
          aluno={selectedAluno}
        />
      )}
    </div>
  );
};

export default Alunos;