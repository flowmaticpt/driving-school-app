import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import { usePermissions } from '../hooks/usePermissions';
import './VisaoGeralEscolas.css';

const VisaoGeralEscolas = () => {
  const navigate = useNavigate();
  const [allEscolas, setAllEscolas] = useState([]);
  const [allGrupos, setAllGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { getAccessibleSchools, getAccessibleGroups, userRole } = usePermissions();

  // Filtrar schools e groups baseado nas permissões do utilizador
  const schools = getAccessibleSchools(allEscolas);
  const groups = getAccessibleGroups(allGrupos);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Buscar schools
      const schoolsRef = collection(db, 'schools');
      const schoolsQuery = query(schoolsRef, orderBy('name'));
      const schoolsSnapshot = await getDocs(schoolsQuery);
      
      const schoolsData = schoolsSnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        return data;
      });

      // Buscar groups
      const groupsRef = collection(db, 'groups');
      const groupsQuery = query(groupsRef, orderBy('name'));
      const groupsSnapshot = await getDocs(groupsQuery);
      
      const groupsData = groupsSnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        return data;
      });

      setAllEscolas(schoolsData);
      setAllGrupos(groupsData);
    } catch (err) {
      setError('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEscolaClick = (escolaId) => {
    const escolaEncontrada = schools.find(s => s.id === escolaId);
    if (escolaEncontrada) {
      navigate(`/escola/${escolaId}`);
    } else {
      setError(`Escola com ID ${escolaId} não encontrada`);
    }
  };

  const getEscolasPorGrupo = () => {
    const schoolsPorGrupo = {};
    
    // Para group_owner, mostrar schools dos groups atribuídos
    if (userRole === 'group_owner') {
      // Inicializar apenas os groups atribuídos ao utilizador
      groups.forEach(grupo => {
        schoolsPorGrupo[grupo.id] = {
          grupo: grupo,
          schools: []
        };
      });

      // Distribuir schools pelos groups atribuídos
      schools.forEach(escola => {
        if (escola.groupID && schoolsPorGrupo[escola.groupID]) {
          schoolsPorGrupo[escola.groupID].schools.push(escola);
        }
      });
    } else {
      // Para dono e admin, usar lógica original
      groups.forEach(grupo => {
        schoolsPorGrupo[grupo.id] = {
          grupo: grupo,
          schools: []
        };
      });

      // Adicionar grupo "Sem Grupo" para schools sem grupo
      schoolsPorGrupo['sem-grupo'] = {
        grupo: { name: 'Sem Grupo', id: 'sem-grupo' },
        schools: []
      };

      // Distribuir schools pelos groups
      schools.forEach(escola => {
        if (escola.groupID && schoolsPorGrupo[escola.groupID]) {
          schoolsPorGrupo[escola.groupID].schools.push(escola);
        } else {
          schoolsPorGrupo['sem-grupo'].schools.push(escola);
        }
      });
    }

    return schoolsPorGrupo;
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
      <div className="visao-geral-container">
        <Navigation showBackButton={true} backPath="/" showUserActions={true} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visao-geral-container">
        <Navigation showBackButton={true} backPath="/" showUserActions={true} />
        <div className="error-container">
          <h2>Erro</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-button">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const schoolsPorGrupo = getEscolasPorGrupo();

  return (
    <div className="visao-geral-container">
      <Navigation showBackButton={true} backPath="/" showUserActions={true} />
      
      <div className="visao-geral-content">
        {/* Header removed - using App.js header instead */}

        {Object.keys(schoolsPorGrupo).map(grupoId => {
          const grupoData = schoolsPorGrupo[grupoId];
          const { grupo, schools: escolasDoGrupo } = grupoData;

          return (
            <div key={grupoId} className="grupo-section">
              <div className="grupo-header">
                <h2>{grupo.name}</h2>
                <span className="escola-count">
                  {escolasDoGrupo.length} escola{escolasDoGrupo.length !== 1 ? 's' : ''}
                </span>
              </div>

              {escolasDoGrupo.length === 0 ? (
                <div className="no-schools">
                  <p>Nenhuma escola neste grupo</p>
                </div>
              ) : (
                <div className="escolas-grid">
                  {escolasDoGrupo.map(escola => (
                    <div
                      key={escola.id}
                      className="escola-card"
                      onClick={() => handleEscolaClick(escola.id)}
                    >
                      <div className="escola-header">
                        <h4>{escola.name}</h4>
                        <span className="escola-date">
                          {formatDate(escola.createdAt)}
                        </span>
                      </div>
                      
                      <div className="escola-info">
                        <p className="escola-location">
                          📍 {escola.location || 'Localização não definida'}
                        </p>
                        <p className="escola-description">
                          {escola.description || 'Sem descrição'}
                        </p>
                      </div>

                      <div className="escola-actions">
                        <button className="view-button">
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(schoolsPorGrupo).length === 0 && (
          <div className="no-data">
            <h2>Nenhuma escola encontrada</h2>
            <p>Não há escolas disponíveis para visualizar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisaoGeralEscolas;