import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './VerFichaFuncionarioModal.css';

const VerFichaFuncionarioModal = ({ isOpen, onClose, onSuccess, funcionario, escolaId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: funcionario?.name || '',
    email: funcionario?.email || '',
    phone: funcionario?.phone || '',
    role: funcionario?.role || '',
    schoolId: funcionario?.schoolId || '',
    groupIds: funcionario?.groupIds || [],
    isActive: funcionario?.isActive !== false,
    baseSalary: funcionario?.baseSalary || 0,
    christmasAllowance: funcionario?.christmasAllowance || 0,
    mealAllowance: funcionario?.mealAllowance || 0,
    nightShiftAllowance: funcionario?.nightShiftAllowance || 0,
    otherCosts: funcionario?.otherCosts || 0,
    socialSecurity: funcionario?.socialSecurity || 0,
    vacationAllowance: funcionario?.vacationAllowance || 0,
    weeklyHours: funcionario?.weeklyHours || 40
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      setError('Nome e email são obrigatórios');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const funcionarioRef = doc(db, 'schools', escolaId, 'funcionarios', funcionario.id);
      await updateDoc(funcionarioRef, {
        ...formData,
        updatedAt: new Date()
      });

      onSuccess();
      setIsEditing(false);
    } catch (err) {
      setError('Erro ao atualizar funcionário: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: funcionario?.name || '',
      email: funcionario?.email || '',
      phone: funcionario?.phone || '',
      role: funcionario?.role || '',
      schoolId: funcionario?.schoolId || '',
      groupIds: funcionario?.groupIds || [],
      isActive: funcionario?.isActive !== false,
      baseSalary: funcionario?.baseSalary || 0,
      christmasAllowance: funcionario?.christmasAllowance || 0,
      mealAllowance: funcionario?.mealAllowance || 0,
      nightShiftAllowance: funcionario?.nightShiftAllowance || 0,
      otherCosts: funcionario?.otherCosts || 0,
      socialSecurity: funcionario?.socialSecurity || 0,
      vacationAllowance: funcionario?.vacationAllowance || 0,
      weeklyHours: funcionario?.weeklyHours || 40
    });
    setError('');
    setIsEditing(false);
  };

  const getRoleLabel = (role) => {
    const roles = {
      'admin': 'Administrador',
      'Instructor': 'Instrutor',
      'group_owner': 'Gestor de Grupo',
      'dono': 'Dono'
    };
    return roles[role] || role;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen || !funcionario) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ficha do Funcionário</h2>
          <div className="header-actions">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="edit-button"
                disabled={isLoading}
              >
                Editar
              </button>
            ) : (
              <div className="edit-actions">
                <button
                  onClick={handleCancel}
                  className="cancel-button"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="save-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            )}
            <button className="close-button" onClick={onClose} disabled={isLoading}>
              ×
            </button>
          </div>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form className="funcionario-form">
            <div className="form-section">
              <h3>Informações Básicas</h3>
              
              <div className="form-group">
                <label>Nome Completo</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={isLoading}
                  />
                ) : (
                  <span className="info-value">{funcionario.name || 'N/A'}</span>
                )}
              </div>

              <div className="form-group">
                <label>Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={isLoading}
                  />
                ) : (
                  <span className="info-value">{funcionario.email || 'N/A'}</span>
                )}
              </div>

              <div className="form-group">
                <label>Telefone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={isLoading}
                  />
                ) : (
                  <span className="info-value">{funcionario.phone || 'N/A'}</span>
                )}
              </div>

              <div className="form-group">
                <label>Cargo</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={isLoading}
                  />
                ) : (
                  <span className="info-value">{funcionario.role || 'N/A'}</span>
                )}
              </div>

              <div className="form-group">
                <label>Horas Semanais</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="weeklyHours"
                    value={formData.weeklyHours}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={isLoading}
                    min="0"
                    max="60"
                  />
                ) : (
                  <span className="info-value">{funcionario.weeklyHours || 'N/A'} horas</span>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3>Informações Salariais</h3>
              
              <div className="form-group">
                <label>Salário Base (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="baseSalary"
                    value={formData.baseSalary}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                  />
                ) : (
                  <span className="info-value">{funcionario.baseSalary ? `${funcionario.baseSalary}€` : 'N/A'}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Subsídio de Natal (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="christmasAllowance"
                      value={formData.christmasAllowance}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={isLoading}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="info-value">{funcionario.christmasAllowance ? `${funcionario.christmasAllowance}€` : 'N/A'}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Subsídio de Férias (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="vacationAllowance"
                      value={formData.vacationAllowance}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={isLoading}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="info-value">{funcionario.vacationAllowance ? `${funcionario.vacationAllowance}€` : 'N/A'}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Subsídio de Refeição (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="mealAllowance"
                      value={formData.mealAllowance}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={isLoading}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="info-value">{funcionario.mealAllowance ? `${funcionario.mealAllowance}€` : 'N/A'}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Subsídio de Turno Noturno (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="nightShiftAllowance"
                      value={formData.nightShiftAllowance}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={isLoading}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="info-value">{funcionario.nightShiftAllowance ? `${funcionario.nightShiftAllowance}€` : 'N/A'}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Segurança Social (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="socialSecurity"
                      value={formData.socialSecurity}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={isLoading}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="info-value">{funcionario.socialSecurity ? `${funcionario.socialSecurity}€` : 'N/A'}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Outros Custos (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="otherCosts"
                      value={formData.otherCosts}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={isLoading}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="info-value">{funcionario.otherCosts ? `${funcionario.otherCosts}€` : 'N/A'}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                {isEditing ? (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    <span className="checkbox-text">Funcionário ativo</span>
                  </label>
                ) : (
                  <span className={`status-badge ${funcionario.isActive !== false ? 'active' : 'inactive'}`}>
                    {funcionario.isActive !== false ? 'Ativo' : 'Inativo'}
                  </span>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3>Informações do Sistema</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Data de Criação</label>
                  <span className="info-value">{formatDate(funcionario.createdAt)}</span>
                </div>
                <div className="form-group">
                  <label>Última Atualização</label>
                  <span className="info-value">{formatDate(funcionario.updatedAt)}</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerFichaFuncionarioModal;
