import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import './EscolaDetalhes.css';

const EscolaDetalhes = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const { userData, logout } = useAuth();
  const [escola, setEscola] = useState(null);
  const [grupo, setGrupo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });

  const fetchEscola = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🏫 EscolaDetalhes: Buscando escola com ID:', escolaId);
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);

      console.log('📊 EscolaDetalhes: Resultado da busca:', { 
        exists: escolaSnap.exists(), 
        hasData: escolaSnap.exists() ? escolaSnap.data() : null 
      });

      if (!escolaSnap.exists()) {
        console.error('❌ EscolaDetalhes: Escola não encontrada na base de dados');
        setError('Escola não encontrada');
        return;
      }

      const escolaData = {
        id: escolaSnap.id,
        ...escolaSnap.data()
      };

      console.log('✅ EscolaDetalhes: Escola encontrada:', { 
        id: escolaData.id, 
        name: escolaData.name 
      });

      setEscola(escolaData);
      setEditData({
        name: escolaData.name || '',
        address: escolaData.address || '',
        phone: escolaData.number || '',
        email: escolaData.email || ''
      });

      // Buscar grupo se a escola tiver um
      if (escolaData.groupID) {
        console.log('👥 EscolaDetalhes: Buscando grupo com ID:', escolaData.groupID);
        const grupoRef = doc(db, 'groups', escolaData.groupID);
        const grupoSnap = await getDoc(grupoRef);
        
        if (grupoSnap.exists()) {
          const grupoData = {
            id: grupoSnap.id,
            ...grupoSnap.data()
          };
          console.log('✅ EscolaDetalhes: Grupo encontrado:', { id: grupoData.id, name: grupoData.name });
          setGrupo(grupoData);
        } else {
          console.log('⚠️ EscolaDetalhes: Grupo não encontrado');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar escola:', err);
      setError('Erro ao carregar dados da escola');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 EscolaDetalhes: useEffect executado com escolaId:', escolaId);
    if (escolaId) {
      fetchEscola();
    }
  }, [escolaId]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: escola.name || '',
      address: escola.address || '',
      phone: escola.number || '',
      email: escola.email || ''
    });
  };

  const handleSave = async () => {
    try {
      console.log('💾 EscolaDetalhes: Salvando alterações da escola:', escolaId);
      const escolaRef = doc(db, 'schools', escolaId);
      await updateDoc(escolaRef, {
        name: editData.name.trim(),
        address: editData.address.trim(),
        number: editData.phone.trim(),
        email: editData.email.trim(),
        updatedAt: new Date()
      });

      console.log('✅ EscolaDetalhes: Escola atualizada com sucesso');

      // Atualizar estado local
      setEscola(prev => ({
        ...prev,
        name: editData.name.trim(),
        address: editData.address.trim(),
        number: editData.phone.trim(),
        email: editData.email.trim()
      }));

      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao atualizar escola:', err);
      setError('Erro ao atualizar escola');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="escola-detalhes">
        <Navigation showBackButton={userData?.role !== 'admin'} backPath="/visao-geral" />
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar dados da escola...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="escola-detalhes">
        <Navigation showBackButton={userData?.role !== 'admin'} backPath="/visao-geral" />
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchEscola} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="escola-detalhes">
        <Navigation showBackButton={userData?.role !== 'admin'} backPath="/visao-geral" />
        <div className="not-found">
          <h2>Escola não encontrada</h2>
          <p>A escola que procura não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="escola-detalhes">
      <Navigation showBackButton={userData?.role !== 'admin'} backPath="/visao-geral" />
      
      <div className="content">
        {/* Informações da Escola */}
        <div className="escola-info-section">
          <div className="escola-header">
            <div className="escola-main-info">
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleInputChange}
                  className="edit-input escola-name-input"
                  placeholder="Nome da escola"
                />
              ) : (
                <h1>{escola.name}</h1>
              )}
              
              <div className="escola-meta">
                <span className="created-date">
                  Criada em: {formatDate(escola.createdAt)}
                </span>
                {escola.updatedAt && (
                  <span className="updated-date">
                    Atualizada em: {formatDate(escola.updatedAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="escola-actions">
              {isEditing ? (
                <>
                  <button className="action-button save" onClick={handleSave}>
                    Guardar
                  </button>
                  <button className="action-button cancel" onClick={handleCancel}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button className="action-button edit" onClick={handleEdit}>
                  Editar
                </button>
              )}
              {userData?.role === 'admin' && (
                <button className="action-button logout" onClick={handleLogout}>
                  Sair
                </button>
              )}
            </div>
          </div>

          <div className="escola-details-grid">
            <div className="detail-item">
              <label>Endereço</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={editData.address}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Endereço da escola"
                />
              ) : (
                <span className="detail-value">
                  {escola.address || 'Não informado'}
                </span>
              )}
            </div>

            <div className="detail-item">
              <label>Telefone</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={editData.phone}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Número de telefone"
                />
              ) : (
                <span className="detail-value">
                  {escola.number || 'Não informado'}
                </span>
              )}
            </div>

            <div className="detail-item">
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editData.email}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Email da escola"
                />
              ) : (
                <span className="detail-value">
                  {escola.email || 'Não informado'}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Menu de Navegação */}
        <div className="escola-menu-section">
          <h2>Gestão da Escola</h2>
          <div className="menu-grid">
            <button 
              className="menu-button" 
              onClick={() => navigate(`/escola/${escolaId}/alunos`)}
            >
              <div className="menu-icon">👥</div>
              <span className="menu-label">Alunos</span>
            </button>

            <button 
              className="menu-button" 
              onClick={() => navigate(`/escola/${escolaId}/alunos-antigos`)}
            >
              <div className="menu-icon">📜</div>
              <span className="menu-label">Alunos Antigos</span>
            </button>

            <button 
              className="menu-button"
              onClick={() => navigate(`/escola/${escolaId}/instrutores`)}
            >
              <div className="menu-icon">👨‍🏫</div>
              <span className="menu-label">Instrutores</span>
            </button>

            <button 
              className="menu-button"
              onClick={() => navigate(`/escola/${escolaId}/aulas`)}
            >
              <div className="menu-icon">📚</div>
              <span className="menu-label">Aulas</span>
            </button>
            
                    <button 
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/servicos`)}
                    >
                      <div className="menu-icon">⚙️</div>
                      <span className="menu-label">Serviços</span>
                    </button>
            
            <button 
              className="menu-button"
              onClick={() => navigate(`/escola/${escolaId}/frota`)}
            >
              <div className="menu-icon">🚗</div>
              <span className="menu-label">Frota</span>
            </button>
            
                    <button 
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/inventario`)}
                    >
                      <div className="menu-icon">📦</div>
                      <span className="menu-label">Inventário</span>
                    </button>

            
                    <button 
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/movimentos`)}
                    >
                      <div className="menu-icon">📈</div>
                      <span className="menu-label">Movimentos</span>
                    </button>

                    <button 
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/servicos-prestados`)}
                    >
                      <div className="menu-icon">🧾</div>
                      <span className="menu-label">Serviços Prestados</span>
                    </button>

                    <button 
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/materiais-prestados`)}
                    >
                      <div className="menu-icon">📦</div>
                      <span className="menu-label">Materiais Prestados</span>
                    </button>

                    <button 
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/despesas`)}
                    >
                      <div className="menu-icon">💸</div>
                      <span className="menu-label">Despesas</span>
                    </button>

                    <button 
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/visao-financeira`)}
                    >
                      <div className="menu-icon">📊</div>
                      <span className="menu-label">Visão Financeira</span>
                    </button>

                    <button 
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/relatorios`)}
                    >
                      <div className="menu-icon">📋</div>
                      <span className="menu-label">Relatórios</span>
                    </button>

                    <button
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/suporte`)}
                    >
                      <div className="menu-icon">🆘</div>
                      <span className="menu-label">Suporte</span>
                    </button>

                    <button
                      className="menu-button"
                      onClick={() => navigate(`/escola/${escolaId}/modelos-contrato`)}
                    >
                      <div className="menu-icon">📝</div>
                      <span className="menu-label">Modelos de Contrato</span>
                    </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscolaDetalhes;
