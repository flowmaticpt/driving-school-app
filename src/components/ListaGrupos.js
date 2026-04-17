import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import EditarGrupoModal from './EditarGrupoModal';
import ConfirmarRemocaoGrupoModal from './ConfirmarRemocaoGrupoModal';
import './ListaGrupos.css';

const ListaGrupos = ({ onGrupoAdded }) => {
  const [groups, setGrupos] = useState([]);
  const [schools, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingGrupo, setEditingGrupo] = useState(null);
  const [removingGrupo, setRemovingGrupo] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchGrupos = async () => {
    try {
      setLoading(true);
      setError('');
      
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setGrupos(groupsData);
    } catch (err) {
      console.error('Erro ao buscar groups:', err);
      setError('Erro ao carregar groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchEscolas = async () => {
    try {
      const schoolsRef = collection(db, 'schools');
      const querySnapshot = await getDocs(schoolsRef);
      
      const schoolsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEscolas(schoolsData);
    } catch (err) {
      console.error('Erro ao buscar schools:', err);
    }
  };

  useEffect(() => {
    fetchGrupos();
    fetchEscolas();
  }, []);

  // Recarregar lista quando um novo grupo for adicionado
  useEffect(() => {
    if (onGrupoAdded) {
      fetchGrupos();
      fetchEscolas();
    }
  }, [onGrupoAdded]);

  const handleEditGrupo = (grupo) => {
    setEditingGrupo(grupo);
  };

  const handleRemoveGrupo = (grupo) => {
    setRemovingGrupo(grupo);
  };

  const handleCloseEditModal = () => {
    setEditingGrupo(null);
  };

  const handleCloseRemoveModal = () => {
    setRemovingGrupo(null);
  };

  const handleSuccess = (message) => {
    setSuccessMessage(message);
    fetchGrupos();
    fetchEscolas();
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEscolasDoGrupo = (grupo) => {
    if (!grupo.schoolIds || grupo.schoolIds.length === 0) return [];
    return schools.filter(escola => grupo.schoolIds.includes(escola.id));
  };

  if (loading) {
    return (
      <div className="lista-groups">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lista-groups">
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchGrupos} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="lista-groups">
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>Nenhum grupo encontrado</h3>
          <p>Adicione o primeiro grupo usando o botão acima.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lista-groups">
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <div className="groups-header">
        <h3>Grupos Cadastrados ({groups.length})</h3>
      </div>
      
      <div className="groups-grid">
        {groups.map((grupo) => {
          const schoolsDoGrupo = getEscolasDoGrupo(grupo);
          return (
            <div key={grupo.id} className="grupo-card">
              <div className="grupo-header">
                <h4>{grupo.name}</h4>
                <span className="grupo-date">
                  {formatDate(grupo.createdAt)}
                </span>
              </div>
              
              <div className="grupo-details">
                <div className="detail-item">
                  <span className="detail-label">🏫</span>
                  <span className="detail-value">
                    {schoolsDoGrupo.length} escola(s) associada(s)
                  </span>
                </div>
                
                {schoolsDoGrupo.length > 0 && (
                  <div className="schools-list">
                    {schoolsDoGrupo.slice(0, 3).map((escola) => (
                      <div key={escola.id} className="escola-item">
                        <span className="escola-name">{escola.name}</span>
                      </div>
                    ))}
                    {schoolsDoGrupo.length > 3 && (
                      <div className="escola-item more">
                        +{schoolsDoGrupo.length - 3} mais
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grupo-actions">
                <button 
                  className="action-button edit"
                  onClick={() => handleEditGrupo(grupo)}
                >
                  Editar
                </button>
                <button 
                  className="action-button delete"
                  onClick={() => handleRemoveGrupo(grupo)}
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <EditarGrupoModal
        isOpen={!!editingGrupo}
        onClose={handleCloseEditModal}
        grupo={editingGrupo}
        onSuccess={handleSuccess}
      />

      <ConfirmarRemocaoGrupoModal
        isOpen={!!removingGrupo}
        onClose={handleCloseRemoveModal}
        grupo={removingGrupo}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default ListaGrupos;
