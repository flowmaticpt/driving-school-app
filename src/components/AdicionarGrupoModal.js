import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdicionarGrupoModal.css';

const AdicionarGrupoModal = ({ isOpen, onClose, onSuccess }) => {
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

  // Buscar schools sem grupo
  const fetchEscolasSemGrupo = async () => {
    try {
      setIsLoadingEscolas(true);
      const schoolsRef = collection(db, 'schools');
      const q = query(schoolsRef, where('groupID', '==', ''));
      const querySnapshot = await getDocs(q);
      
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
      fetchEscolasSemGrupo();
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
      // Criar documento na coleção 'groups'
      const grupoData = {
        name: formData.name.trim(),
        admins: [],
        schoolIds: formData.selectedSchools,
        createdAt: Timestamp.now()
      };

      const grupoRef = await addDoc(collection(db, 'groups'), grupoData);
      const grupoId = grupoRef.id;

      // Atualizar schools selecionadas com o groupID
      if (formData.selectedSchools.length > 0) {
        const updatePromises = formData.selectedSchools.map(escolaId => {
          const escolaRef = doc(db, 'schools', escolaId);
          return updateDoc(escolaRef, {
            groupID: grupoId,
            updatedAt: Timestamp.now()
          });
        });

        await Promise.all(updatePromises);
      }
      
      // Limpar formulário
      setFormData({
        name: '',
        selectedSchools: []
      });
      setSearchTerm('');
      
      onSuccess('Grupo adicionado com sucesso!');
      onClose();
      
    } catch (err) {
      console.error('Erro ao adicionar grupo:', err);
      setError('Erro ao adicionar grupo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        selectedSchools: []
      });
      setSearchTerm('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Novo Grupo</h2>
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
            <label>Escolas Disponíveis</label>
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
              {isLoading ? 'Adicionando...' : 'Adicionar Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarGrupoModal;
