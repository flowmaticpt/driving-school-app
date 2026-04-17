import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import EditarEscolaModal from './EditarEscolaModal';
import ConfirmarRemocaoModal from './ConfirmarRemocaoModal';
import './ListaEscolas.css';

const ListaEscolas = ({ onEscolaAdded }) => {
  const [schools, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingEscola, setEditingEscola] = useState(null);
  const [removingEscola, setRemovingEscola] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchEscolas = async () => {
    try {
      setLoading(true);
      setError('');
      
      const schoolsRef = collection(db, 'schools');
      const q = query(schoolsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const schoolsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEscolas(schoolsData);
    } catch (err) {
      console.error('Erro ao buscar schools:', err);
      setError('Erro ao carregar schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscolas();
  }, []);

  // Recarregar lista quando uma nova escola for adicionada
  useEffect(() => {
    if (onEscolaAdded) {
      fetchEscolas();
    }
  }, [onEscolaAdded]);

  const handleEditEscola = (escola) => {
    setEditingEscola(escola);
  };

  const handleRemoveEscola = (escola) => {
    setRemovingEscola(escola);
  };

  const handleCloseEditModal = () => {
    setEditingEscola(null);
  };

  const handleCloseRemoveModal = () => {
    setRemovingEscola(null);
  };

  const handleSuccess = (message) => {
    setSuccessMessage(message);
    fetchEscolas(); // Recarregar lista
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

  if (loading) {
    return (
      <div className="lista-schools">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar schools...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lista-schools">
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchEscolas} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="lista-schools">
        <div className="empty-state">
          <div className="empty-icon">🏫</div>
          <h3>Nenhuma escola encontrada</h3>
          <p>Adicione a primeira escola usando o botão acima.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lista-schools">
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <div className="schools-header">
        <h3>Escolas Cadastradas ({schools.length})</h3>
      </div>
      
      <div className="schools-grid">
        {schools.map((escola) => (
          <div key={escola.id} className="escola-card">
            <div className="escola-header">
              <h4>{escola.name}</h4>
              <span className="escola-date">
                {formatDate(escola.createdAt)}
              </span>
            </div>
            
            <div className="escola-details">
              {escola.address && (
                <div className="detail-item">
                  <span className="detail-label">📍</span>
                  <span className="detail-value">{escola.address}</span>
                </div>
              )}
              
              {escola.number && (
                <div className="detail-item">
                  <span className="detail-label">📞</span>
                  <span className="detail-value">{escola.number}</span>
                </div>
              )}
              
              {escola.email && (
                <div className="detail-item">
                  <span className="detail-label">✉️</span>
                  <span className="detail-value">{escola.email}</span>
                </div>
              )}
            </div>
            
            <div className="escola-actions">
              <button 
                className="action-button edit"
                onClick={() => handleEditEscola(escola)}
              >
                Editar
              </button>
              <button 
                className="action-button delete"
                onClick={() => handleRemoveEscola(escola)}
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <EditarEscolaModal
        isOpen={!!editingEscola}
        onClose={handleCloseEditModal}
        escola={editingEscola}
        onSuccess={handleSuccess}
      />

      <ConfirmarRemocaoModal
        isOpen={!!removingEscola}
        onClose={handleCloseRemoveModal}
        escola={removingEscola}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default ListaEscolas;
