import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, doc, getDoc, updateDoc, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import VerFichaAlunoModal from '../components/VerFichaAlunoModal';
import { formatPrice } from '../utils/formatters';
import './Alunos.css';

const AlunosAntigos = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const [escola, setEscola] = useState(null);
  const [students, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos', 'divida', 'atraso'
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [showVerFichaModal, setShowVerFichaModal] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

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
      
      // Filter only inactive students (active === false)
      const inactiveStudents = studentsData.filter(student => {
        return student.active === false;
      });
      
      setAlunos(inactiveStudents);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaId]);

  const handleReactivate = async (aluno) => {
    if (!window.confirm(`Tem certeza que deseja reativar o aluno ${aluno.name}?`)) {
      return;
    }

    setIsReactivating(true);
    try {
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      await updateDoc(alunoRef, {
        active: true,
        updatedAt: Timestamp.now()
      });

      // Remove from list
      setAlunos(students.filter(s => s.id !== aluno.id));
      alert('Aluno reativado com sucesso!');
    } catch (err) {
      console.error('Erro ao reativar aluno:', err);
      setError('Erro ao reativar aluno. Tente novamente.');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleAlunoUpdate = (alunoAtualizado) => {
    // Update the student in the list
    setAlunos(prevAlunos => 
      prevAlunos.map(aluno => 
        aluno.id === alunoAtualizado.id ? alunoAtualizado : aluno
      )
    );
    
    if (selectedAluno && selectedAluno.id === alunoAtualizado.id) {
      setSelectedAluno(alunoAtualizado);
    }
  };

  const handleVerFicha = (aluno) => {
    setSelectedAluno(aluno);
    setShowVerFichaModal(true);
  };

  const calculateTotalDivida = (aluno) => {
    const servicosAtivos = aluno.servicosAtivos || aluno.services || [];
    const materiaisComprados = aluno.materiaisComprados || aluno.materials || [];
    const pagamentos = aluno.pagamentos || [];

    const totalServicos = servicosAtivos.reduce((sum, servico) => {
      return sum + (servico.total || servico.price || 0);
    }, 0);

    const totalMateriais = materiaisComprados.reduce((sum, material) => {
      return sum + (material.total || material.price || 0);
    }, 0);

    const totalPagamentos = pagamentos.reduce((sum, pagamento) => {
      const valor = pagamento.valor || pagamento.value || 0;
      const isPago = pagamento.isPago !== false && (pagamento.tipo === 'pagamento' || pagamento.type === 'payment' || pagamento.tipo === 'pronto');
      return sum + (isPago ? valor : 0);
    }, 0);

    return (totalServicos + totalMateriais) - totalPagamentos;
  };

  const filteredAlunos = students.filter(aluno => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = (aluno.name || '').toLowerCase().includes(searchLower);
      const emailMatch = (aluno.email || '').toLowerCase().includes(searchLower);
      const phoneMatch = (aluno.phone || '').toLowerCase().includes(searchLower);
      
      if (!nameMatch && !emailMatch && !phoneMatch) {
        return false;
      }
    }

    // Active filter
    if (activeFilter === 'divida') {
      const divida = calculateTotalDivida(aluno);
      return divida > 0;
    } else if (activeFilter === 'atraso') {
      // Check for overdue payments
      const pagamentos = aluno.pagamentos || [];
      const hoje = new Date();
      const temAtraso = pagamentos.some(pagamento => {
        if (pagamento.isPago || pagamento.tipo === 'pagamento' || pagamento.type === 'payment' || pagamento.tipo === 'pronto') {
          return false;
        }
        if (pagamento.dataMaximaPagamento) {
          const dataMaxima = pagamento.dataMaximaPagamento.toDate ? pagamento.dataMaximaPagamento.toDate() : new Date(pagamento.dataMaximaPagamento);
          return dataMaxima < hoje;
        }
        return false;
      });
      return temAtraso;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="alunos-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar alunos antigos...</p>
        </div>
      </div>
    );
  }

  if (error && !escola) {
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
          <h1>Alunos Antigos - {escola.name}</h1>
          <p>Alunos inativos (apenas visualização e reativação)</p>
        </div>

        <div className="alunos-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Pesquisar alunos antigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-container">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todos</option>
              <option value="divida">Com Dívida</option>
              <option value="atraso">Com Atraso</option>
            </select>
          </div>
        </div>

        <div className="alunos-stats">
          <div className="stat-card">
            <h3>Total de Alunos Antigos</h3>
            <span className="stat-number">{students.length}</span>
          </div>
          <div className="stat-card">
            <h3>Com Dívida</h3>
            <span className="stat-number">
              {students.filter(aluno => calculateTotalDivida(aluno) > 0).length}
            </span>
          </div>
        </div>

        {filteredAlunos.length === 0 ? (
          <div className="no-students">
            <h3>Nenhum aluno antigo encontrado</h3>
            <p>
              {searchTerm || activeFilter !== 'todos'
                ? 'Nenhum aluno antigo corresponde aos filtros aplicados.' 
                : 'Esta escola ainda não tem alunos antigos registados.'
              }
            </p>
          </div>
        ) : (
          <div className="students-grid">
            {filteredAlunos.map((aluno) => {
              const totalDivida = calculateTotalDivida(aluno);
              return (
                <div key={aluno.id} className="student-card">
                  <div className="student-header">
                    <h3>{aluno.name}</h3>
                    <span className={`status-badge inactive`}>
                      Inativo
                    </span>
                  </div>
                  
                  <div className="student-info">
                    {aluno.email && (
                      <p className="student-email">📧 {aluno.email}</p>
                    )}
                    {aluno.phone && (
                      <p className="student-phone">📞 {aluno.phone}</p>
                    )}
                    
                    <div className="student-details">
                      <div className="detail-item">
                        <span className="label">Dívida Total:</span>
                        <span className={`value ${totalDivida > 0 ? 'debt' : 'no-debt'}`}>
                          {formatPrice(totalDivida)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="student-actions">
                    <button
                      onClick={() => handleVerFicha(aluno)}
                      className="view-button"
                    >
                      Ver Detalhes
                    </button>
                    <button
                      onClick={() => handleReactivate(aluno)}
                      className="reactivate-button"
                      disabled={isReactivating}
                    >
                      ↶ Reativar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Ver Ficha - Read-only mode */}
      {selectedAluno && (
        <VerFichaAlunoModal
          isOpen={showVerFichaModal}
          onClose={() => {
            setShowVerFichaModal(false);
            setSelectedAluno(null);
          }}
          onSuccess={handleAlunoUpdate}
          aluno={selectedAluno}
          escolaId={escolaId}
          onAlunoUpdate={handleAlunoUpdate}
          readOnly={true} // Pass read-only flag
        />
      )}
    </div>
  );
};

export default AlunosAntigos;


