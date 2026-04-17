import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import './EditarEscolaModal.css';

const EditarEscolaModal = ({ isOpen, onClose, escola, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [admins, setAdmins] = useState([]);
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Preencher formulário quando escola for passada
  useEffect(() => {
    if (escola) {
      setFormData({
        name: escola.name || '',
        address: escola.address || '',
        phone: escola.number || '',
        email: escola.email || ''
      });
      fetchAdmins();
    }
  }, [escola]);

  const fetchAdmins = async () => {
    if (!escola) return;
    
    setLoadingAdmins(true);
    try {
      // Buscar todos os utilizadores admin
      const usersRef = collection(db, 'users');
      const adminQuery = query(usersRef, where('role', '==', 'admin'));
      const adminSnapshot = await getDocs(adminQuery);
      
      const allAdmins = [];
      adminSnapshot.forEach(doc => {
        allAdmins.push({ id: doc.id, ...doc.data() });
      });

      // Separar admins já atribuídos e disponíveis
      const assignedAdmins = allAdmins.filter(admin => 
        admin.escolasAtribuidas && admin.escolasAtribuidas.includes(escola.id)
      );
      const availableAdmins = allAdmins.filter(admin => 
        !admin.escolasAtribuidas || !admin.escolasAtribuidas.includes(escola.id)
      );

      setAdmins(assignedAdmins);
      setAvailableAdmins(availableAdmins);
    } catch (error) {
      console.error('Erro ao buscar admins:', error);
      setError('Erro ao carregar lista de administradores');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssignAdmin = async (adminId) => {
    try {
      const adminRef = doc(db, 'users', adminId);
      const admin = availableAdmins.find(a => a.id === adminId);
      
      if (admin) {
        const updatedEscolas = [...(admin.escolasAtribuidas || []), escola.id];
        await updateDoc(adminRef, {
          escolasAtribuidas: updatedEscolas
        });
        
        // Atualizar listas locais
        setAdmins([...admins, admin]);
        setAvailableAdmins(availableAdmins.filter(a => a.id !== adminId));
      }
    } catch (error) {
      console.error('Erro ao atribuir admin:', error);
      setError('Erro ao atribuir administrador');
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    try {
      const adminRef = doc(db, 'users', adminId);
      const admin = admins.find(a => a.id === adminId);
      
      if (admin) {
        const updatedEscolas = admin.escolasAtribuidas.filter(id => id !== escola.id);
        await updateDoc(adminRef, {
          escolasAtribuidas: updatedEscolas
        });
        
        // Atualizar listas locais
        setAdmins(admins.filter(a => a.id !== adminId));
        setAvailableAdmins([...availableAdmins, admin]);
      }
    } catch (error) {
      console.error('Erro ao remover admin:', error);
      setError('Erro ao remover administrador');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação - apenas nome é obrigatório
    if (!formData.name.trim()) {
      setError('O nome da escola é obrigatório');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Atualizar documento na coleção 'escolas'
      const escolaRef = doc(db, 'escolas', escola.id);
      const updatedData = {
        name: formData.name.trim(),
        address: formData.address.trim() || '',
        number: formData.phone.trim() || '',
        email: formData.email.trim() || '',
        updatedAt: new Date()
      };

      await updateDoc(escolaRef, updatedData);
      
      onSuccess('Escola atualizada com sucesso!');
      onClose();
      
    } catch (err) {
      console.error('Erro ao atualizar escola:', err);
      setError('Erro ao atualizar escola. Tente novamente.');
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

  if (!isOpen || !escola) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Escola</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">
              Nome da Escola <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Digite o nome da escola"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Endereço</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Digite o endereço da escola"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Digite o número de telefone"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Digite o email da escola"
              disabled={isLoading}
            />
          </div>

          {/* Seção de Administradores */}
          <div className="admins-section">
            <h3>Administradores da Escola</h3>
            
            {loadingAdmins ? (
              <div className="loading-admins">
                <p>Carregando administradores...</p>
              </div>
            ) : (
              <>
                {/* Admins Atribuídos */}
                <div className="admins-group">
                  <h4>Administradores Atribuídos ({admins.length})</h4>
                  {admins.length === 0 ? (
                    <p className="no-admins">Nenhum administrador atribuído</p>
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
                  <h4>Administradores Disponíveis ({availableAdmins.length})</h4>
                  {availableAdmins.length === 0 ? (
                    <p className="no-admins">Todos os administradores já estão atribuídos</p>
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
              {isLoading ? 'Atualizando...' : 'Atualizar Escola'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarEscolaModal;
