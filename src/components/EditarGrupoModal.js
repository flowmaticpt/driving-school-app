import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './EditarGrupoModal.css';

const EditarGrupoModal = ({ isOpen, onClose, grupo, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    selectedSchools: []
  });
  const [schools, setEscolas] = useState([]);
  const [filteredEscolas, setFilteredEscolas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEscolas, setIsLoadingEscolas] = useState(true);
  const [error, setError] = useState('');
  const [admins, setAdmins] = useState([]);
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const fetchAdmins = async () => {
    if (!grupo) return;
    
    setLoadingAdmins(true);
    try {
      // Buscar todos os utilizadores com role 'group owner'
      const usersRef = collection(db, 'users');
      const adminQuery = query(usersRef, where('role', '==', 'group owner'));
      const adminSnapshot = await getDocs(adminQuery);
      
      const allAdmins = [];
      adminSnapshot.forEach(doc => {
        allAdmins.push({ id: doc.id, ...doc.data() });
      });

      // Separar group owners já atribuídos e disponíveis
      // Um group owner pode ter vários grupos (gruposAtribuidos é um array)
      const assignedAdmins = allAdmins.filter(admin => 
        admin.gruposAtribuidos && admin.gruposAtribuidos.includes(grupo.id)
      );
      const availableAdminsList = allAdmins.filter(admin => 
        !admin.gruposAtribuidos || !admin.gruposAtribuidos.includes(grupo.id)
      );

      setAdmins(assignedAdmins);
      setAvailableAdmins(availableAdminsList);
    } catch (error) {
      console.error('Erro ao buscar group owners:', error);
      setError('Erro ao carregar lista de group owners');
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Preencher formulário quando grupo for passado
  useEffect(() => {
    if (grupo) {
      setFormData({
        name: grupo.name || '',
        selectedSchools: grupo.schoolIds || []
      });
      fetchAdmins();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo]);

  // Buscar todas as schools (com e sem grupo)
  const fetchEscolas = async () => {
    try {
      setIsLoadingEscolas(true);
      const schoolsRef = collection(db, 'schools');
      const querySnapshot = await getDocs(schoolsRef);
      
      const schoolsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEscolas(schoolsData);
      setFilteredEscolas(schoolsData);
    } catch (err) {
      console.error('Erro ao buscar schools:', err);
      setError('Erro ao carregar schools');
    } finally {
      setIsLoadingEscolas(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEscolas();
    }
  }, [isOpen]);

  // Filtrar schools baseado na pesquisa
  useEffect(() => {
    const filtered = schools.filter(escola =>
      escola.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEscolas(filtered);
  }, [searchTerm, schools]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSchoolToggle = (escolaId) => {
    setFormData(prev => ({
      ...prev,
      selectedSchools: prev.selectedSchools.includes(escolaId)
        ? prev.selectedSchools.filter(id => id !== escolaId)
        : [...prev.selectedSchools, escolaId]
    }));
  };

  const handleAssignAdmin = async (adminId) => {
    try {
      const adminRef = doc(db, 'users', adminId);
      const admin = availableAdmins.find(a => a.id === adminId);
      
      if (admin) {
        // Adicionar o grupo ao array gruposAtribuidos do group owner
        // Permite que um group owner tenha vários grupos
        const updatedGrupos = [...(admin.gruposAtribuidos || []), grupo.id];
        await updateDoc(adminRef, {
          gruposAtribuidos: updatedGrupos
        });
        
        // Atualizar listas locais
        setAdmins([...admins, admin]);
        setAvailableAdmins(availableAdmins.filter(a => a.id !== adminId));
      }
    } catch (error) {
      console.error('Erro ao atribuir group owner:', error);
      setError('Erro ao atribuir group owner');
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    try {
      const adminRef = doc(db, 'users', adminId);
      const admin = admins.find(a => a.id === adminId);
      
      if (admin) {
        // Remover o grupo do array gruposAtribuidos do group owner
        const updatedGrupos = admin.gruposAtribuidos.filter(id => id !== grupo.id);
        await updateDoc(adminRef, {
          gruposAtribuidos: updatedGrupos
        });
        
        // Atualizar listas locais
        setAdmins(admins.filter(a => a.id !== adminId));
        setAvailableAdmins([...availableAdmins, admin]);
      }
    } catch (error) {
      console.error('Erro ao remover group owner:', error);
      setError('Erro ao remover group owner');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação - nome é obrigatório
    if (!formData.name.trim()) {
      setError('O nome do grupo é obrigatório');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Atualizar documento na coleção 'groups'
      const grupoRef = doc(db, 'groups', grupo.id);
      const updatedData = {
        name: formData.name.trim(),
        schoolIds: formData.selectedSchools,
        updatedAt: Timestamp.now()
      };

      await updateDoc(grupoRef, updatedData);

      // Obter schools que estavam no grupo antes
      const schoolsAnteriores = grupo.schoolIds || [];
      
      // Remover groupID das schools que não estão mais no grupo
      const schoolsParaRemover = schoolsAnteriores.filter(id => 
        !formData.selectedSchools.includes(id)
      );
      
      // Adicionar groupID às schools que foram adicionadas ao grupo
      const schoolsParaAdicionar = formData.selectedSchools.filter(id => 
        !schoolsAnteriores.includes(id)
      );

      // Atualizar schools
      const updatePromises = [];

      // Remover groupID das schools que saíram do grupo
      schoolsParaRemover.forEach(escolaId => {
        const escolaRef = doc(db, 'schools', escolaId);
        updatePromises.push(updateDoc(escolaRef, {
          groupID: '',
          updatedAt: Timestamp.now()
        }));
      });

      // Adicionar groupID às schools que entraram no grupo
      schoolsParaAdicionar.forEach(escolaId => {
        const escolaRef = doc(db, 'schools', escolaId);
        updatePromises.push(updateDoc(escolaRef, {
          groupID: grupo.id,
          updatedAt: Timestamp.now()
        }));
      });

      await Promise.all(updatePromises);
      
      onSuccess('Grupo atualizado com sucesso!');
      onClose();
      
    } catch (err) {
      console.error('Erro ao atualizar grupo:', err);
      setError('Erro ao atualizar grupo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !grupo) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Grupo</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">
              Nome do Grupo <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Digite o nome do grupo"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Escolas do Grupo</label>
            <div className="search-container">
              <input
                type="text"
                placeholder="Pesquisar schools..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={isLoading || isLoadingEscolas}
                className="search-input"
              />
            </div>
            
            {isLoadingEscolas ? (
              <div className="loading-schools">
                <div className="loading-spinner"></div>
                <p>A carregar schools...</p>
              </div>
            ) : (
              <div className="schools-list">
                {filteredEscolas.length === 0 ? (
                  <p className="no-schools">
                    {searchTerm ? 'Nenhuma escola encontrada' : 'Nenhuma escola disponível'}
                  </p>
                ) : (
                  filteredEscolas.map((escola) => (
                    <label key={escola.id} className="escola-item">
                      <input
                        type="checkbox"
                        checked={formData.selectedSchools.includes(escola.id)}
                        onChange={() => handleSchoolToggle(escola.id)}
                        disabled={isLoading}
                      />
                      <span className="escola-name">{escola.name}</span>
                      {escola.address && (
                        <span className="escola-address">{escola.address}</span>
                      )}
                      {escola.groupID && escola.groupID !== grupo.id && (
                        <span className="escola-group-warning">(Já em outro grupo)</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            )}
            
            {formData.selectedSchools.length > 0 && (
              <div className="selected-count">
                {formData.selectedSchools.length} escola(s) selecionada(s)
              </div>
            )}
          </div>

          {/* Seção de Administradores */}
          <div className="admins-section">
            <h3>Admins de Grupo</h3>
            
            {loadingAdmins ? (
              <div className="loading-admins">
                <p>Carregando admins de grupo...</p>
              </div>
            ) : (
              <>
                {/* Admins Atribuídos */}
                <div className="admins-group">
                  <h4>Admins de Grupo Atribuídos ({admins.length})</h4>
                  {admins.length === 0 ? (
                    <p className="no-admins">Nenhum admin de grupo atribuído</p>
                  ) : (
                    <div className="admins-list">
                      {admins.map(admin => (
                        <div key={admin.id} className="admin-item">
                          <div className="admin-info">
                            <span className="admin-name">{admin.name}</span>
                            <span className="admin-email">{admin.email}</span>
                          </div>
                          <button
                            type="button"
                            className="remove-admin-btn"
                            onClick={() => handleRemoveAdmin(admin.id)}
                            disabled={isLoading}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admins Disponíveis */}
                <div className="admins-group">
                  <h4>Admins de Grupo Disponíveis ({availableAdmins.length})</h4>
                  {availableAdmins.length === 0 ? (
                    <p className="no-admins">Todos os admins de grupo já estão atribuídos a este grupo</p>
                  ) : (
                    <div className="admins-list">
                      {availableAdmins.map(admin => (
                        <div key={admin.id} className="admin-item">
                          <div className="admin-info">
                            <span className="admin-name">{admin.name}</span>
                            <span className="admin-email">{admin.email}</span>
                          </div>
                          <button
                            type="button"
                            className="assign-admin-btn"
                            onClick={() => handleAssignAdmin(admin.id)}
                            disabled={isLoading}
                          >
                            Atribuir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Atualizando...' : 'Atualizar Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarGrupoModal;
