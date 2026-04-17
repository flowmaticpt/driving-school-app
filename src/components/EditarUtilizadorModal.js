import React, { useState, useEffect } from 'react';
import { getDocs, collection, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './EditarUtilizadorModal.css';

const EditarUtilizadorModal = ({ utilizador, onClose, onSuccess }) => {
  const [schools, setEscolas] = useState([]);
  const [groups, setGrupos] = useState([]);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    escolasAtribuidas: [],
    gruposAtribuidos: [],
    phone: '',
    schoolId: '',
    baseSalary: '',
    weeklyHours: '',
    mealAllowance: '',
    christmasAllowance: '',
    vacationAllowance: '',
    nightShiftAllowance: '',
    socialSecurity: '',
    otherCosts: ''
  });

  const roles = [
    { value: 'dono', label: 'Dono', description: 'Acesso total a tudo' },
    { value: 'group_owner', label: 'Admin de Grupo', description: 'Admin dos groups atribuídos' },
    { value: 'admin', label: 'Admin', description: 'Acesso apenas às schools atribuídas' }
  ];

  useEffect(() => {
    fetchEscolas();
    fetchGrupos();
  }, []);

  useEffect(() => {
    if (utilizador) {
      setFormData({
        name: utilizador.name || '',
        email: utilizador.email || '',
        role: utilizador.role || '',
        escolasAtribuidas: utilizador.escolasAtribuidas || utilizador.schoolsAtribuidas || [],
        gruposAtribuidos: utilizador.gruposAtribuidos || utilizador.groupsAtribuidos || [],
        phone: utilizador.phone || '',
        schoolId: utilizador.schoolId || '',
        baseSalary: utilizador.baseSalary?.toString() || '0',
        weeklyHours: utilizador.weeklyHours?.toString() || '40',
        mealAllowance: utilizador.mealAllowance?.toString() || '0',
        christmasAllowance: utilizador.christmasAllowance?.toString() || '0',
        vacationAllowance: utilizador.vacationAllowance?.toString() || '0',
        nightShiftAllowance: utilizador.nightShiftAllowance?.toString() || '0',
        socialSecurity: utilizador.socialSecurity?.toString() || '0',
        otherCosts: utilizador.otherCosts?.toString() || '0'
      });
    }
  }, [utilizador]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSchoolToggle = (escolaId) => {
    setFormData(prev => ({
      ...prev,
      escolasAtribuidas: prev.escolasAtribuidas.includes(escolaId)
        ? prev.escolasAtribuidas.filter(id => id !== escolaId)
        : [...prev.escolasAtribuidas, escolaId]
    }));
  };

  const handleGroupToggle = (grupoId) => {
    setFormData(prev => ({
      ...prev,
      gruposAtribuidos: prev.gruposAtribuidos.includes(grupoId)
        ? prev.gruposAtribuidos.filter(id => id !== grupoId)
        : [...prev.gruposAtribuidos, grupoId]
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      const utilizadorRef = doc(db, 'users', utilizador.id);
      await updateDoc(utilizadorRef, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        escolasAtribuidas: formData.escolasAtribuidas,
        gruposAtribuidos: formData.gruposAtribuidos,
        phone: formData.phone.trim() || null,
        schoolId: formData.schoolId.trim() || null,
        baseSalary: formData.baseSalary ? parseFloat(formData.baseSalary) || 0 : 0,
        weeklyHours: formData.weeklyHours ? parseFloat(formData.weeklyHours) || 40 : 40,
        mealAllowance: formData.mealAllowance ? parseFloat(formData.mealAllowance) || 0 : 0,
        christmasAllowance: formData.christmasAllowance ? parseFloat(formData.christmasAllowance) || 0 : 0,
        vacationAllowance: formData.vacationAllowance ? parseFloat(formData.vacationAllowance) || 0 : 0,
        nightShiftAllowance: formData.nightShiftAllowance ? parseFloat(formData.nightShiftAllowance) || 0 : 0,
        socialSecurity: formData.socialSecurity ? parseFloat(formData.socialSecurity) || 0 : 0,
        otherCosts: formData.otherCosts ? parseFloat(formData.otherCosts) || 0 : 0,
        updatedAt: Timestamp.now()
      });

      setIsEditing(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Erro ao atualizar utilizador:', err);
      setError('Erro ao atualizar utilizador. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (utilizador) {
      setFormData({
        name: utilizador.name || '',
        email: utilizador.email || '',
        role: utilizador.role || '',
        escolasAtribuidas: utilizador.escolasAtribuidas || utilizador.schoolsAtribuidas || [],
        gruposAtribuidos: utilizador.gruposAtribuidos || utilizador.groupsAtribuidos || [],
        phone: utilizador.phone || '',
        schoolId: utilizador.schoolId || '',
        baseSalary: utilizador.baseSalary?.toString() || '0',
        weeklyHours: utilizador.weeklyHours?.toString() || '40',
        mealAllowance: utilizador.mealAllowance?.toString() || '0',
        christmasAllowance: utilizador.christmasAllowance?.toString() || '0',
        vacationAllowance: utilizador.vacationAllowance?.toString() || '0',
        nightShiftAllowance: utilizador.nightShiftAllowance?.toString() || '0',
        socialSecurity: utilizador.socialSecurity?.toString() || '0',
        otherCosts: utilizador.otherCosts?.toString() || '0'
      });
    }
    setIsEditing(false);
    setError('');
  };

  const handleClose = () => {
    setError('');
    setIsEditing(false);
    onClose();
  };

  if (!utilizador) return null;

  const currentRole = formData.role || utilizador.role;
  const displayRole = roles.find(r => r.value === currentRole)?.label || currentRole;

  return (
    <div className="edit-user-modal-overlay" onClick={handleClose}>
      <div className="edit-user-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-user-modal-header">
          <h2>{isEditing ? 'Editar Utilizador' : 'Detalhes do Utilizador'}</h2>
          <div className="edit-user-modal-actions">
            {!isEditing ? (
              <button 
                className="edit-user-btn-edit" 
                onClick={() => setIsEditing(true)}
                type="button"
              >
                ✏️ Editar
              </button>
            ) : (
              <div className="edit-user-btn-group">
                <button 
                  className="edit-user-btn-cancel" 
                  onClick={handleCancel}
                  disabled={isLoading}
                  type="button"
                >
                  Cancelar
                </button>
                <button 
                  className="edit-user-btn-save" 
                  onClick={handleSave}
                  disabled={isLoading || !formData.name.trim()}
                  type="button"
                >
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
            <button 
              className="edit-user-btn-close" 
              onClick={handleClose}
              type="button"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="edit-user-modal-body">
          {error && (
            <div className="edit-user-error">
              ⚠️ {error}
            </div>
          )}

          {/* Informações Básicas */}
          <section className="edit-user-section">
            <h3 className="edit-user-section-title">
              <span className="edit-user-section-icon">👤</span>
              Informações Básicas
            </h3>
            
            <div className="edit-user-form-row">
              <div className="edit-user-field">
                <label htmlFor="edit-name" className="edit-user-label">
                  Nome <span className="required">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    required
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.name || 'N/A'}</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-email" className="edit-user-label">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    id="edit-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.email || 'N/A'}</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-role" className="edit-user-label">
                  Função
                </label>
                {isEditing ? (
                  <select
                    id="edit-role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="edit-user-value">
                    {displayRole}
                    {roles.find(r => r.value === currentRole)?.description && (
                      <span className="edit-user-role-desc">
                        {roles.find(r => r.value === currentRole).description}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Atribuições */}
          <section className="edit-user-section">
            <h3 className="edit-user-section-title">
              <span className="edit-user-section-icon">🔗</span>
              Atribuições
            </h3>

            {/* Escolas */}
            {(currentRole === 'admin' || currentRole === 'dono') && (
              <div className="edit-user-assignment">
                <h4 className="edit-user-assignment-title">Escolas Atribuídas</h4>
                {isEditing ? (
                  <div className="edit-user-checklist">
                    {schools.length === 0 ? (
                      <div className="edit-user-empty">Nenhuma escola disponível</div>
                    ) : (
                      schools.map(escola => (
                        <label key={escola.id} className="edit-user-checkbox-item">
                          <input
                            type="checkbox"
                            checked={formData.escolasAtribuidas.includes(escola.id)}
                            onChange={() => handleSchoolToggle(escola.id)}
                            disabled={isLoading}
                          />
                          <span>{escola.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="edit-user-list">
                    {(utilizador.schoolsAtribuidas || utilizador.escolasAtribuidas || []).length > 0 ? (
                      (utilizador.schoolsAtribuidas || utilizador.escolasAtribuidas || []).map(escolaId => {
                        const escola = schools.find(e => e.id === escolaId);
                        return escola ? (
                          <div key={escolaId} className="edit-user-list-item">
                            ✅ {escola.name}
                          </div>
                        ) : null;
                      })
                    ) : (
                      <div className="edit-user-empty">Nenhuma escola atribuída</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Grupos */}
            {(currentRole === 'group_owner' || currentRole === 'dono') && (
              <div className="edit-user-assignment">
                <h4 className="edit-user-assignment-title">Grupos Atribuídos</h4>
                {isEditing ? (
                  <div className="edit-user-checklist">
                    {groups.length === 0 ? (
                      <div className="edit-user-empty">Nenhum grupo disponível</div>
                    ) : (
                      groups.map(grupo => (
                        <label key={grupo.id} className="edit-user-checkbox-item">
                          <input
                            type="checkbox"
                            checked={formData.gruposAtribuidos.includes(grupo.id)}
                            onChange={() => handleGroupToggle(grupo.id)}
                            disabled={isLoading}
                          />
                          <span>{grupo.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="edit-user-list">
                    {(utilizador.groupsAtribuidos || utilizador.gruposAtribuidos || []).length > 0 ? (
                      (utilizador.groupsAtribuidos || utilizador.gruposAtribuidos || []).map(grupoId => {
                        const grupo = groups.find(g => g.id === grupoId);
                        return grupo ? (
                          <div key={grupoId} className="edit-user-list-item">
                            ✅ {grupo.name}
                          </div>
                        ) : null;
                      })
                    ) : (
                      <div className="edit-user-empty">Nenhum grupo atribuído</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Informações Salariais */}
          <section className="edit-user-section">
            <h3 className="edit-user-section-title">
              <span className="edit-user-section-icon">💰</span>
              Informações Salariais
            </h3>
            
            <div className="edit-user-form-grid">
              <div className="edit-user-field">
                <label htmlFor="edit-phone" className="edit-user-label">Telefone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    id="edit-phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    placeholder="Ex: +351 912 345 678"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.phone || 'N/A'}</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-schoolId" className="edit-user-label">ID da Escola</label>
                {isEditing ? (
                  <input
                    type="text"
                    id="edit-schoolId"
                    name="schoolId"
                    value={formData.schoolId}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    placeholder="ID da escola"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.schoolId || 'N/A'}</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-baseSalary" className="edit-user-label">Salário Base (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    id="edit-baseSalary"
                    name="baseSalary"
                    value={formData.baseSalary}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.baseSalary || 0} €</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-weeklyHours" className="edit-user-label">Horas Semanais</label>
                {isEditing ? (
                  <input
                    type="number"
                    id="edit-weeklyHours"
                    name="weeklyHours"
                    value={formData.weeklyHours}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    min="0"
                    step="0.5"
                    placeholder="40"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.weeklyHours || 40} horas</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-mealAllowance" className="edit-user-label">Subsídio de Refeição (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    id="edit-mealAllowance"
                    name="mealAllowance"
                    value={formData.mealAllowance}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.mealAllowance || 0} €</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-christmasAllowance" className="edit-user-label">Subsídio de Natal (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    id="edit-christmasAllowance"
                    name="christmasAllowance"
                    value={formData.christmasAllowance}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.christmasAllowance || 0} €</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-vacationAllowance" className="edit-user-label">Subsídio de Férias (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    id="edit-vacationAllowance"
                    name="vacationAllowance"
                    value={formData.vacationAllowance}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.vacationAllowance || 0} €</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-nightShiftAllowance" className="edit-user-label">Subsídio de Turno Noturno (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    id="edit-nightShiftAllowance"
                    name="nightShiftAllowance"
                    value={formData.nightShiftAllowance}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.nightShiftAllowance || 0} €</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-socialSecurity" className="edit-user-label">Segurança Social (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    id="edit-socialSecurity"
                    name="socialSecurity"
                    value={formData.socialSecurity}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.socialSecurity || 0} €</div>
                )}
              </div>

              <div className="edit-user-field">
                <label htmlFor="edit-otherCosts" className="edit-user-label">Outros Custos (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    id="edit-otherCosts"
                    name="otherCosts"
                    value={formData.otherCosts}
                    onChange={handleInputChange}
                    className="edit-user-input"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="edit-user-value">{utilizador.otherCosts || 0} €</div>
                )}
              </div>
            </div>
          </section>

          {/* Informações do Sistema */}
          <section className="edit-user-section">
            <h3 className="edit-user-section-title">
              <span className="edit-user-section-icon">ℹ️</span>
              Informações do Sistema
            </h3>
            
            <div className="edit-user-form-row">
              <div className="edit-user-field">
                <label className="edit-user-label">Data de Criação</label>
                <div className="edit-user-value">
                  {utilizador.createdAt ? 
                    utilizador.createdAt.toDate ? 
                      utilizador.createdAt.toDate().toLocaleDateString('pt-PT') : 
                      new Date(utilizador.createdAt).toLocaleDateString('pt-PT')
                    : 'N/A'
                  }
                </div>
              </div>
              <div className="edit-user-field">
                <label className="edit-user-label">Última Atualização</label>
                <div className="edit-user-value">
                  {utilizador.updatedAt ? 
                    utilizador.updatedAt.toDate ? 
                      utilizador.updatedAt.toDate().toLocaleDateString('pt-PT') : 
                      new Date(utilizador.updatedAt).toLocaleDateString('pt-PT')
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EditarUtilizadorModal;
