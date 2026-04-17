import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import './Aprovacoes.css';

const Aprovacoes = () => {
  const navigate = useNavigate();
  const [users, setUtilizadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    fetchUtilizadores();
  }, []);

  const fetchUtilizadores = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(query(usersRef, orderBy('createdAt', 'desc')));
      
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

  const filteredUtilizadores = users.filter(utilizador => {
    const searchLower = searchTerm.toLowerCase();
    return (
      utilizador.name.toLowerCase().includes(searchLower) ||
      utilizador.email.toLowerCase().includes(searchLower) ||
      utilizador.role.toLowerCase().includes(searchLower)
    );
  });

  const handleVoltar = () => {
    navigate('/');
  };

  const handleAprovar = (utilizador) => {
    setSelectedUser(utilizador);
    setShowApprovalModal(true);
  };

  const handleCloseApprovalModal = () => {
    setShowApprovalModal(false);
    setSelectedUser(null);
  };

  const handleConfirmApproval = async (role, schoolsAtribuidas = [], groupsAtribuidos = []) => {
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        role: role,
        active: true,
        pendingApproval: false,
        schoolsAtribuidas: schoolsAtribuidas,
        groupsAtribuidos: groupsAtribuidos,
        updatedAt: Timestamp.now()
      });

      await fetchUtilizadores();
      handleCloseApprovalModal();
    } catch (err) {
      console.error('Erro ao aprovar utilizador:', err);
      setError('Erro ao aprovar utilizador. Tente novamente.');
    }
  };

  const handleRejeitar = async (utilizador) => {
    if (window.confirm(`Tem certeza que deseja rejeitar o registo de ${utilizador.name}?`)) {
      try {
        const userRef = doc(db, 'users', utilizador.id);
        await updateDoc(userRef, {
          active: false,
          pendingApproval: false,
          rejected: true,
          updatedAt: Timestamp.now()
        });

        await fetchUtilizadores();
      } catch (err) {
        console.error('Erro ao rejeitar utilizador:', err);
        setError('Erro ao rejeitar utilizador. Tente novamente.');
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'pending': return '#ff9800';
      case 'admin': return '#2196f3';
      case 'group_owner': return '#9c27b0';
      case 'dono': return '#f44336';
      case 'rejected': return '#f44336';
      default: return '#757575';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'pending': return 'Pendente';
      case 'admin': return 'Admin';
      case 'group_owner': return 'Admin de Grupo';
      case 'dono': return 'Dono';
      case 'rejected': return 'Rejeitado';
      default: return role;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'pending': return '⏳';
      case 'admin': return '👨‍💼';
      case 'group_owner': return '👑';
      case 'dono': return '👑';
      case 'rejected': return '❌';
      default: return '👤';
    }
  };

  const pendingUsers = filteredUtilizadores.filter(u => u.role === 'pending' || u.pendingApproval);
  const approvedUsers = filteredUtilizadores.filter(u => u.role !== 'pending' && !u.pendingApproval && u.role !== 'rejected');
  const rejectedUsers = filteredUtilizadores.filter(u => u.rejected);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="aprovacoes-page">
      <Navigation showUserActions={true} />
      
      <div className="container">
        <div className="page-header">
          <button className="back-button" onClick={handleVoltar}>
            ← Voltar
          </button>
          <h1>Aprovação de Utilizadores</h1>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="search-container">
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="stats-container">
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{pendingUsers.length}</div>
              <div className="stat-label">Pendentes</div>
            </div>
          </div>
          <div className="stat-card approved">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{approvedUsers.length}</div>
              <div className="stat-label">Aprovados</div>
            </div>
          </div>
          <div className="stat-card rejected">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-number">{rejectedUsers.length}</div>
              <div className="stat-label">Rejeitados</div>
            </div>
          </div>
        </div>

        {/* Utilizadores Pendentes */}
        {pendingUsers.length > 0 && (
          <div className="section">
            <h2>⏳ Utilizadores Pendentes ({pendingUsers.length})</h2>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Data de Registo</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(utilizador => (
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
                        <span className="date-info">
                          {utilizador.createdAt?.toDate ? 
                            utilizador.createdAt.toDate().toLocaleDateString('pt-PT') : 
                            'N/A'
                          }
                        </span>
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
                        <div className="action-buttons">
                          <button 
                            className="action-btn approve"
                            onClick={() => handleAprovar(utilizador)}
                            title="Aprovar"
                          >
                            ✅
                          </button>
                          <button 
                            className="action-btn reject"
                            onClick={() => handleRejeitar(utilizador)}
                            title="Rejeitar"
                          >
                            ❌
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Utilizadores Aprovados */}
        {approvedUsers.length > 0 && (
          <div className="section">
            <h2>✅ Utilizadores Aprovados ({approvedUsers.length})</h2>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Data de Aprovação</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedUsers.map(utilizador => (
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
                        <span className="date-info">
                          {utilizador.updatedAt?.toDate ? 
                            utilizador.updatedAt.toDate().toLocaleDateString('pt-PT') : 
                            'N/A'
                          }
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${utilizador.active ? 'active' : 'inactive'}`}>
                          {utilizador.active ? 'Ativo' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Utilizadores Rejeitados */}
        {rejectedUsers.length > 0 && (
          <div className="section">
            <h2>❌ Utilizadores Rejeitados ({rejectedUsers.length})</h2>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Data de Rejeição</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedUsers.map(utilizador => (
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
                        <span className="date-info">
                          {utilizador.updatedAt?.toDate ? 
                            utilizador.updatedAt.toDate().toLocaleDateString('pt-PT') : 
                            'N/A'
                          }
                        </span>
                      </td>
                      <td>
                        <span 
                          className="role-badge"
                          style={{ backgroundColor: getRoleColor('rejected') }}
                        >
                          {getRoleIcon('rejected')} {getRoleLabel('rejected')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredUtilizadores.length === 0 && (
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
        )}
      </div>

      {showApprovalModal && selectedUser && (
        <ApprovalModal
          utilizador={selectedUser}
          onClose={handleCloseApprovalModal}
          onApprove={handleConfirmApproval}
        />
      )}
    </div>
  );
};

// Modal de Aprovação
const ApprovalModal = ({ utilizador, onClose, onApprove }) => {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [schoolsAtribuidas, setEscolasAtribuidas] = useState([]);
  const [groupsAtribuidos, setGruposAtribuidos] = useState([]);
  const [schools, setEscolas] = useState([]);
  const [groups, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEscolas();
    fetchGrupos();
  }, []);

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

  const handleEscolaChange = (escolaId, checked) => {
    setEscolasAtribuidas(prev => 
      checked 
        ? [...prev, escolaId]
        : prev.filter(id => id !== escolaId)
    );
  };

  const handleGrupoChange = (grupoId, checked) => {
    setGruposAtribuidos(prev => 
      checked 
        ? [...prev, grupoId]
        : prev.filter(id => id !== grupoId)
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onApprove(selectedRole, schoolsAtribuidas, groupsAtribuidos);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'admin', label: 'Admin', description: 'Acesso às schools atribuídas' },
    { value: 'group_owner', label: 'Admin de Grupo', description: 'Admin dos groups atribuídos' }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header">
          <h2>Aprovar Utilizador</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="user-summary">
            <h3>Utilizador a Aprovar</h3>
            <div className="user-details">
              <p><strong>Nome:</strong> {utilizador.name}</p>
              <p><strong>Email:</strong> {utilizador.email}</p>
              <p><strong>Data de Registo:</strong> {
                utilizador.createdAt?.toDate ? 
                  utilizador.createdAt.toDate().toLocaleDateString('pt-PT') : 
                  'N/A'
              }</p>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">👤</span>
              <h3>Atribuir Role</h3>
            </div>
            
            <div className="form-group">
              <label htmlFor="role">Tipo de Utilizador</label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-select"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <div className="role-description">
                {roles.find(r => r.value === selectedRole)?.description}
              </div>
            </div>
          </div>

          {/* Escolas Atribuídas */}
          {selectedRole === 'admin' && (
            <div className="form-section">
              <div className="section-header">
                <span className="section-icon">🏢</span>
                <h3>Escolas Atribuídas</h3>
              </div>
              
              <div className="assignment-list">
                {schools.map(escola => (
                  <label key={escola.id} className="assignment-item">
                    <input
                      type="checkbox"
                      checked={schoolsAtribuidas.includes(escola.id)}
                      onChange={(e) => handleEscolaChange(escola.id, e.target.checked)}
                      className="assignment-checkbox"
                    />
                    <span className="assignment-text">{escola.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Grupos Atribuídos */}
          {selectedRole === 'group_owner' && (
            <div className="form-section">
              <div className="section-header">
                <span className="section-icon">👥</span>
                <h3>Grupos Atribuídos</h3>
              </div>
              
              <div className="assignment-list">
                {groups.map(grupo => (
                  <label key={grupo.id} className="assignment-item">
                    <input
                      type="checkbox"
                      checked={groupsAtribuidos.includes(grupo.id)}
                      onChange={(e) => handleGrupoChange(grupo.id, e.target.checked)}
                      className="assignment-checkbox"
                    />
                    <span className="assignment-text">{grupo.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button className="cancel-button" onClick={onClose}>
              Cancelar
            </button>
            <button 
              className="approve-button"
              onClick={handleSubmit}
              disabled={loading || (selectedRole === 'admin' && schoolsAtribuidas.length === 0) || (selectedRole === 'group_owner' && groupsAtribuidos.length === 0)}
            >
              {loading ? 'A aprovar...' : 'Aprovar Utilizador'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aprovacoes;
