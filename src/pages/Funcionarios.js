import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import AdicionarInstrutorModal from '../components/AdicionarInstrutorModal';
import VerFichaFuncionarioModal from '../components/VerFichaFuncionarioModal';
import ConfirmarRemocaoFuncionarioModal from '../components/ConfirmarRemocaoFuncionarioModal';
import './Funcionarios.css';

const Funcionarios = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const [escola, setEscola] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);
  const [showVerFichaModal, setShowVerFichaModal] = useState(false);
  const [showRemoverModal, setShowRemoverModal] = useState(false);

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

  const fetchFuncionarios = async () => {
    try {
      const funcionariosRef = collection(db, 'schools', escolaId, 'funcionarios');
      const querySnapshot = await getDocs(funcionariosRef);
      
      if (querySnapshot.empty) {
        setFuncionarios([]);
        return;
      }
      
      const funcionariosData = querySnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        return data;
      });
      
      setFuncionarios(funcionariosData);
    } catch (err) {
      setError('Erro ao carregar funcionários');
    }
  };

  useEffect(() => {
    if (escolaId) {
      const loadData = async () => {
        setLoading(true);
        await fetchEscola();
        await fetchFuncionarios();
        setLoading(false);
      };
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaId]);

  const handleSuccess = async () => {
    await fetchFuncionarios();
    setIsModalOpen(false);
    
    if (selectedFuncionario) {
      const funcionarioAtualizado = funcionarios.find(f => f.id === selectedFuncionario.id);
      if (funcionarioAtualizado) {
        setSelectedFuncionario(funcionarioAtualizado);
      }
    }
  };

  const handleVerFicha = (funcionario) => {
    setSelectedFuncionario(funcionario);
    setShowVerFichaModal(true);
  };

  const handleRemover = (funcionario) => {
    setSelectedFuncionario(funcionario);
    setShowRemoverModal(true);
  };

  const filteredFuncionarios = funcionarios.filter(funcionario => {
    if (!searchTerm || typeof searchTerm !== 'string') return true;
    
    const searchLower = searchTerm.toLowerCase();
    const name = (funcionario.name || '').toLowerCase();
    const email = (funcionario.email || '').toLowerCase();
    const role = (funcionario.role || '').toLowerCase();
    
    return name.includes(searchLower) || 
           email.includes(searchLower) || 
           role.includes(searchLower);
  });

  const getRoleLabel = (role) => {
    const roles = {
      'admin': 'Administrador',
      'Instructor': 'Instrutor',
      'group_owner': 'Gestor de Grupo',
      'dono': 'Dono'
    };
    return roles[role] || role;
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      'admin': 'admin-badge',
      'Instructor': 'instrutor-badge',
      'group_owner': 'group-owner-badge',
      'dono': 'dono-badge'
    };
    return classes[role] || 'default-badge';
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
      <div className="funcionarios-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar funcionários...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="funcionarios-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="error-container">
          <h2>Erro</h2>
          <p>{error}</p>
          <button onClick={() => navigate(`/escola/${escolaId}`)} className="retry-button">
            Voltar à Escola
          </button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="funcionarios-container">
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
    <div className="funcionarios-container">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
      
      <div className="funcionarios-content">
        <div className="page-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Funcionários - {escola.name}</h1>
              <p>Gerir funcionários desta escola</p>
            </div>
            <button
              onClick={() => navigate(`/escola/${escolaId}`)}
              className="back-button"
            >
              ← Voltar à Escola
            </button>
          </div>
        </div>

        <div className="funcionarios-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Pesquisar funcionários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="button-group">
            <button
              onClick={() => setIsModalOpen(true)}
              className="add-button"
            >
              + Adicionar Instrutor
            </button>
          </div>
        </div>

        <div className="funcionarios-stats">
          <div className="stat-card">
            <h3>Total de Funcionários</h3>
            <span className="stat-number">{funcionarios.length}</span>
          </div>
          <div className="stat-card">
            <h3>Instrutores</h3>
            <span className="stat-number">
              {funcionarios.filter(f => f.role === 'Instructor').length}
            </span>
          </div>
          <div className="stat-card">
            <h3>Administradores</h3>
            <span className="stat-number">
              {funcionarios.filter(f => f.role === 'admin').length}
            </span>
          </div>
        </div>

        {filteredFuncionarios.length === 0 ? (
          <div className="no-funcionarios">
            <h3>Nenhum funcionário encontrado</h3>
            <p>
              {searchTerm 
                ? 'Nenhum funcionário corresponde à sua pesquisa.' 
                : 'Esta escola ainda não tem funcionários registados.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="add-button"
              >
                Adicionar Primeiro Funcionário
              </button>
            )}
          </div>
        ) : (
          <div className="funcionarios-table-container">
            <table className="funcionarios-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Cargo</th>
                  <th>Data de Registo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredFuncionarios.map((funcionario) => (
                  <tr key={funcionario.id}>
                    <td className="funcionario-name">{funcionario.name || 'N/A'}</td>
                    <td>{funcionario.email || 'N/A'}</td>
                    <td>
                      <span className={`role-badge ${getRoleBadgeClass(funcionario.role)}`}>
                        {getRoleLabel(funcionario.role)}
                      </span>
                    </td>
                    <td>{formatDate(funcionario.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${funcionario.isActive !== false ? 'active' : 'inactive'}`}>
                        {funcionario.isActive !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        onClick={() => handleVerFicha(funcionario)}
                        className="view-button"
                      >
                        Ver Ficha
                      </button>
                      <button
                        onClick={() => handleRemover(funcionario)}
                        className="remove-button"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Adicionar Instrutor */}
      <AdicionarInstrutorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        escolaId={escolaId}
      />

      {/* Modal de Ver Ficha */}
      {selectedFuncionario && (
        <VerFichaFuncionarioModal
          isOpen={showVerFichaModal}
          onClose={() => {
            setShowVerFichaModal(false);
            setSelectedFuncionario(null);
          }}
          onSuccess={handleSuccess}
          funcionario={selectedFuncionario}
          escolaId={escolaId}
        />
      )}

      {/* Modal de Confirmação de Remoção */}
      {selectedFuncionario && (
        <ConfirmarRemocaoFuncionarioModal
          isOpen={showRemoverModal}
          onClose={() => {
            setShowRemoverModal(false);
            setSelectedFuncionario(null);
          }}
          onSuccess={handleSuccess}
          funcionario={selectedFuncionario}
          escolaId={escolaId}
        />
      )}
    </div>
  );
};

export default Funcionarios;
