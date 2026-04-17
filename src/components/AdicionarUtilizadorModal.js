import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdicionarUtilizadorModal.css';

const AdicionarUtilizadorModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    phone: '',
    schoolId: '',
    schoolsAtribuidas: [],
    groupsAtribuidos: [],
    baseSalary: 0,
    weeklyHours: 40,
    mealAllowance: 0,
    christmasAllowance: 0,
    vacationAllowance: 0,
    nightShiftAllowance: 0,
    socialSecurity: 0,
    otherCosts: 0,
    active: true
  });
  const [schools, setEscolas] = useState([]);
  const [groups, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = [
    { value: 'dono', label: 'Dono', description: 'Acesso total a tudo' },
    { value: 'group_owner', label: 'Admin de Grupo', description: 'Admin dos groups atribuídos' },
    { value: 'admin', label: 'Admin', description: 'Acesso apenas às schools atribuídas' }
  ];

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleEscolaChange = (escolaId, checked) => {
    setFormData(prev => ({
      ...prev,
      schoolsAtribuidas: checked 
        ? [...prev.schoolsAtribuidas, escolaId]
        : prev.schoolsAtribuidas.filter(id => id !== escolaId)
    }));
  };

  const handleGrupoChange = (grupoId, checked) => {
    setFormData(prev => ({
      ...prev,
      groupsAtribuidos: checked 
        ? [...prev.groupsAtribuidos, grupoId]
        : prev.groupsAtribuidos.filter(id => id !== grupoId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('O nome é obrigatório');
      return;
    }

    if (!formData.email.trim()) {
      setError('O email é obrigatório');
      return;
    }

    if (!formData.password.trim()) {
      setError('A palavra-passe é obrigatória');
      return;
    }

    if (!formData.role) {
      setError('O role é obrigatório');
      return;
    }

    // Validações específicas por role
    if (formData.role === 'admin' && formData.schoolsAtribuidas.length === 0) {
      setError('Admins devem ter pelo menos uma escola atribuída');
      return;
    }

    if (formData.role === 'group_owner' && formData.groupsAtribuidos.length === 0) {
      setError('Admins de Grupo devem ter pelo menos um grupo atribuído');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const utilizadorData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        role: formData.role,
        schoolsAtribuidas: formData.schoolsAtribuidas,
        groupsAtribuidos: formData.groupsAtribuidos,
        active: formData.active,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const usersRef = collection(db, 'users');
      await addDoc(usersRef, utilizadorData);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao adicionar utilizador:', err);
      setError('Erro ao adicionar utilizador. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      phone: '',
      schoolId: '',
      schoolsAtribuidas: [],
      groupsAtribuidos: [],
      baseSalary: 0,
      weeklyHours: 40,
      mealAllowance: 0,
      christmasAllowance: 0,
      vacationAllowance: 0,
      nightShiftAllowance: 0,
      socialSecurity: 0,
      otherCosts: 0,
      active: true
    });
    setError('');
    onClose();
  };

  const getRoleDescription = (roleValue) => {
    const role = roles.find(r => r.value === roleValue);
    return role ? role.description : '';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header">
          <h2>Adicionar Utilizador</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Informações Básicas */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">👤</span>
              <h3>Informações Básicas</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Nome *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nome completo"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@exemplo.com"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Palavra-passe *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Palavra-passe segura"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">Selecionar role...</option>
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {formData.role && (
                  <div className="role-description">
                    {getRoleDescription(formData.role)}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Utilizador active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Atribuições */}
          {formData.role && (
            <div className="form-section">
              <div className="section-header">
                <span className="section-icon">🔗</span>
                <h3>Atribuições</h3>
              </div>
              
              {/* Escolas */}
              {(formData.role === 'admin' || formData.role === 'dono') && (
                <div className="assignment-group">
                  <h4>Escolas Atribuídas</h4>
                  <div className="assignment-list">
                    {schools.map(escola => (
                      <label key={escola.id} className="assignment-item">
                        <input
                          type="checkbox"
                          checked={formData.schoolsAtribuidas.includes(escola.id)}
                          onChange={(e) => handleEscolaChange(escola.id, e.target.checked)}
                          className="assignment-checkbox"
                        />
                        <span className="assignment-text">{escola.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Grupos */}
              {(formData.role === 'group_owner' || formData.role === 'dono') && (
                <div className="assignment-group">
                  <h4>Grupos Atribuídos</h4>
                  <div className="assignment-list">
                    {groups.map(grupo => (
                      <label key={grupo.id} className="assignment-item">
                        <input
                          type="checkbox"
                          checked={formData.groupsAtribuidos.includes(grupo.id)}
                          onChange={(e) => handleGrupoChange(grupo.id, e.target.checked)}
                          className="assignment-checkbox"
                        />
                        <span className="assignment-text">{grupo.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Informações Salariais */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">💰</span>
              <h3>Informações Salariais</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="phone">Telefone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Número de telefone"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="schoolId">ID da Escola</label>
                <input
                  type="text"
                  id="schoolId"
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  placeholder="ID da escola principal"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="baseSalary">Salário Base (€)</label>
                <input
                  type="number"
                  id="baseSalary"
                  name="baseSalary"
                  value={formData.baseSalary}
                  onChange={handleInputChange}
                  onWheel={(e) => e.target.blur()}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="weeklyHours">Horas Semanais</label>
                <input
                  type="number"
                  id="weeklyHours"
                  name="weeklyHours"
                  value={formData.weeklyHours}
                  onChange={handleInputChange}
                  min="0"
                  max="60"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="mealAllowance">Subsídio de Refeição (€)</label>
                <input
                  type="number"
                  id="mealAllowance"
                  name="mealAllowance"
                  value={formData.mealAllowance}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="christmasAllowance">Subsídio de Natal (€)</label>
                <input
                  type="number"
                  id="christmasAllowance"
                  name="christmasAllowance"
                  value={formData.christmasAllowance}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="vacationAllowance">Subsídio de Férias (€)</label>
                <input
                  type="number"
                  id="vacationAllowance"
                  name="vacationAllowance"
                  value={formData.vacationAllowance}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="nightShiftAllowance">Subsídio de Turno Noturno (€)</label>
                <input
                  type="number"
                  id="nightShiftAllowance"
                  name="nightShiftAllowance"
                  value={formData.nightShiftAllowance}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="socialSecurity">Segurança Social (€)</label>
                <input
                  type="number"
                  id="socialSecurity"
                  name="socialSecurity"
                  value={formData.socialSecurity}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="otherCosts">Outros Custos (€)</label>
                <input
                  type="number"
                  id="otherCosts"
                  name="otherCosts"
                  value={formData.otherCosts}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'A adicionar...' : 'Adicionar Utilizador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarUtilizadorModal;
