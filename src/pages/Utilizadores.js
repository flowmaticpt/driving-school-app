import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import ConfirmarRemocaoUtilizadorModal from '../components/ConfirmarRemocaoUtilizadorModal';
import EditarUtilizadorModal from '../components/EditarUtilizadorModal';
import { useAuth } from '../contexts/AuthContext';
import './Utilizadores.css';

const Utilizadores = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [users, setUtilizadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedUtilizador, setSelectedUtilizador] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [escolas, setEscolas] = useState([]);

  useEffect(() => {
    fetchUtilizadores();
    fetchGrupos();
    fetchEscolas();
  }, []);

  const fetchGrupos = async () => {
    try {
      const groupsRef = collection(db, 'groups');
      const groupsSnap = await getDocs(groupsRef);
      const groupsData = [];
      groupsSnap.forEach(doc => {
        groupsData.push({ id: doc.id, ...doc.data() });
      });
      setGrupos(groupsData);
    } catch (err) {
      console.error('Erro ao buscar groups:', err);
    }
  };

  const fetchEscolas = async () => {
    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnap = await getDocs(schoolsRef);
      const schoolsData = [];
      schoolsSnap.forEach(doc => {
        schoolsData.push({ id: doc.id, ...doc.data() });
      });
      setEscolas(schoolsData);
    } catch (err) {
      console.error('Erro ao buscar schools:', err);
    }
  };

  const fetchUtilizadores = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(query(usersRef, orderBy('name')));
      
      const usersData = [];
      usersSnap.forEach(doc => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      
      setUtilizadores(usersData);
    } catch (err) {
      console.error('Erro ao buscar users:', err);
      setError('Erro ao carregar users');
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    navigate('/');
  };




  // Função para verificar se o utilizador logado pode editar outro utilizador
  const canEditUser = (utilizador) => {
    if (!userData) return false;

    const currentUserRole = userData.role;
    const targetUserRole = utilizador.role;

    // Owner pode editar tudo abaixo (todos exceto outros owners)
    if (currentUserRole === 'dono') {
      return targetUserRole !== 'dono'; // Dono pode editar todos exceto outros donos
    }

    // Group owner pode editar utilizadores dos seus grupos
    if (currentUserRole === 'group owner' || currentUserRole === 'group_owner') {
      // Verificar se o utilizador está em alguma escola dos grupos do group owner
      const gruposDoOwner = userData.gruposAtribuidos || userData.groupsAtribuidos || [];
      
      // Obter todas as escolas dos grupos do owner
      const escolasDosGrupos = grupos
        .filter(grupo => gruposDoOwner.includes(grupo.id))
        .flatMap(grupo => grupo.schoolIds || []);
      
      // Verificar se o utilizador tem escolas atribuídas que estão nos grupos do owner
      const escolasDoUtilizador = utilizador.escolasAtribuidas || utilizador.schoolsAtribuidas || [];
      
      // Verificar se há interseção entre as escolas do utilizador e as escolas dos grupos
      const podeEditar = escolasDoUtilizador.some(escolaId => 
        escolasDosGrupos.includes(escolaId)
      );
      
      return podeEditar;
    }

    // Admin pode editar utilizadores abaixo (das suas escolas atribuídas)
    if (currentUserRole === 'admin') {
      const escolasDoAdmin = userData.escolasAtribuidas || userData.schoolsAtribuidas || [];
      const escolasDoUtilizador = utilizador.escolasAtribuidas || utilizador.schoolsAtribuidas || [];
      
      // Verificar se há interseção entre as escolas do admin e as escolas do utilizador
      return escolasDoUtilizador.some(escolaId => escolasDoAdmin.includes(escolaId));
    }

    return false;
  };

  const handleEditar = (utilizador) => {
    setSelectedUtilizador(utilizador);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUtilizador(null);
  };

  const handleRemover = (utilizador) => {
    setSelectedUtilizador(utilizador);
    setShowRemoveModal(true);
  };

  const handleCloseRemoveModal = () => {
    setShowRemoveModal(false);
    setSelectedUtilizador(null);
  };

  const handleConfirmRemove = async () => {
    try {
      const utilizadorRef = doc(db, 'users', selectedUtilizador.id);
      await deleteDoc(utilizadorRef);
      
      setUtilizadores(users.filter(u => u.id !== selectedUtilizador.id));
      setShowRemoveModal(false);
      setSelectedUtilizador(null);
    } catch (err) {
      console.error('Erro ao remover utilizador:', err);
      setError('Erro ao remover utilizador');
    }
  };

  const filteredUtilizadores = users.filter(utilizador => {
    const matchesSearch = !searchTerm || 
      utilizador.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      utilizador.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      utilizador.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || utilizador.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role) => {
    switch (role) {
      case 'dono':
      case 'owner':
        return 'Dono';
      case 'group_owner':
      case 'group owner':
        return 'Admin de Grupo';
      case 'admin':
        return 'Admin';
      case 'instructor':
        return 'Instrutor';
      default:
        return 'N/A';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'dono':
      case 'owner':
        return '#dc3545'; // Vermelho
      case 'group_owner':
      case 'group owner':
        return '#fd7e14'; // Laranja
      case 'admin':
        return '#007bff'; // Azul
      case 'instructor':
        return '#28a745'; // Verde
      default:
        return '#6c757d'; // Cinza
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'dono':
      case 'owner':
        return '👑';
      case 'group_owner':
      case 'group owner':
        return '👨‍💼';
      case 'admin':
        return '👤';
      case 'instructor':
        return '🎓';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="users">
        <Navigation showUserActions={true} />
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users">
        <Navigation showUserActions={true} />
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
    <div className="users">
      <Navigation showUserActions={true} />
      
      <div className="container">
        <div className="page-header">
          <button className="back-button" onClick={handleVoltar}>
            ← Voltar
          </button>
          <h1>Gestão de Utilizadores</h1>
          <p className="subtitle">Controlo de acesso e permissões</p>
        </div>

        <div className="search-form">
          <div className="search-row">
            <input
              type="text"
              placeholder="Pesquisar por nome, email ou role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Todos os Roles</option>
              <option value="dono">Dono</option>
              <option value="group_owner">Admin de Grupo</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{users.length}</div>
              <div className="stat-label">Total de Utilizadores</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👑</div>
            <div className="stat-content">
              <div className="stat-number">
                {users.filter(u => u.role === 'dono').length}
              </div>
              <div className="stat-label">Donos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👨‍💼</div>
            <div className="stat-content">
              <div className="stat-number">
                {users.filter(u => u.role === 'group_owner').length}
              </div>
              <div className="stat-label">Admins de Grupo</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <div className="stat-number">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <div className="stat-label">Admins</div>
            </div>
          </div>
        </div>

        <div className="users-container">
          <div className="users-header">
            <h2>Utilizadores ({filteredUtilizadores.length})</h2>
          </div>
          
          {filteredUtilizadores.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>Nenhum utilizador encontrado</h3>
              <p>
                {searchTerm 
                  ? 'Nenhum utilizador corresponde à sua pesquisa.' 
                  : 'Ainda não há users registados.'
                }
              </p>
            </div>
          ) : (
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Escolas Atribuídas</th>
                    <th>Grupos Atribuídos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUtilizadores.map(utilizador => (
                    <tr key={utilizador.id}>
                      <td>
                        <div className="user-info">
                          <span className="user-name">{utilizador.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="user-email">{utilizador.email}</span>
                      </td>
                      <td>
                        <span 
                          className="role-badge"
                          style={{ backgroundColor: getRoleColor(utilizador.role) }}
                        >
                          {getRoleIcon(utilizador.role)} {getRoleLabel(utilizador.role)}
                        </span>
                      </td>
                      <td>
                        <span className="assigned-info">
                          {utilizador.escolasAtribuidas?.length || 0} escola(s)
                        </span>
                      </td>
                      <td>
                        <span className="assigned-info">
                          {utilizador.gruposAtribuidos?.length || 0} grupo(s)
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {canEditUser(utilizador) && (
                            <button 
                              className="action-btn edit"
                              onClick={() => handleEditar(utilizador)}
                              title="Editar"
                            >
                              ✏️
                            </button>
                          )}
                          <button 
                            className="action-btn remove"
                            onClick={() => handleRemover(utilizador)}
                            title="Remover"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>



      {showEditModal && selectedUtilizador && (
        <EditarUtilizadorModal
          utilizador={selectedUtilizador}
          onClose={handleCloseEditModal}
          onSuccess={() => {
            fetchUtilizadores();
            handleCloseEditModal();
          }}
        />
      )}

      {showRemoveModal && selectedUtilizador && (
        <ConfirmarRemocaoUtilizadorModal
          utilizador={selectedUtilizador}
          onClose={handleCloseRemoveModal}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  );
};

export default Utilizadores;
