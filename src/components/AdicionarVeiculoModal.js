import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdicionarVeiculoModal.css';

const AdicionarVeiculoModal = ({ escolaId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    registration: '',
    brand: '',
    model: '',
    year: '',
    type: '',
    insurance: '',
    insuranceExpiry: '',
    inspectionExpiry: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const typesVeiculo = [
    'carro',
    'Automóvel',
    'Motociclo',
    'Ciclomotor',
    'Quadriciclo',
    'Triciclo',
    'Outro'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.registration.trim()) {
      setError('A matrícula é obrigatória');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const veiculoData = {
        registration: formData.registration.toUpperCase().trim(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: formData.year.trim(),
        type: formData.type.trim(),
        insurance: formData.insurance.trim(),
        insuranceExpiry: formData.insuranceExpiry || '',
        inspectionExpiry: formData.inspectionExpiry || '',
        notes: formData.notes.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const vehiclesRef = collection(db, 'schools', escolaId, 'fleet');
      await addDoc(vehiclesRef, veiculoData);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao adicionar veículo:', err);
      setError('Erro ao adicionar veículo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      registration: '',
      brand: '',
      model: '',
      year: '',
      type: '',
      insurance: '',
      insuranceExpiry: '',
      inspectionExpiry: '',
      notes: ''
    });
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Adicionar Veículo</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Informações Básicas */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">🚗</span>
              <h3>Informações Básicas</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="registration">Matrícula *</label>
                <input
                  type="text"
                  id="registration"
                  name="registration"
                  value={formData.registration}
                  onChange={handleInputChange}
                  placeholder="Ex: 62-RZ-56"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="brand">Marca</label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="Ex: RENAULT"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="model">Modelo</label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="Ex: CAPTUR"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="year">Ano</label>
                <input
                  type="text"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder="Ex: 2018"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Tipo</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Selecionar type...</option>
                  {typesVeiculo.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Documentação */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">📋</span>
              <h3>Documentação</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="insurance">Seguradora</label>
                <input
                  type="text"
                  id="insurance"
                  name="insurance"
                  value={formData.insurance}
                  onChange={handleInputChange}
                  placeholder="Ex: ZURICH"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="insuranceExpiry">Validade Seguro</label>
                <input
                  type="date"
                  id="insuranceExpiry"
                  name="insuranceExpiry"
                  value={formData.insuranceExpiry}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="inspectionExpiry">Validade Inspeção</label>
                <input
                  type="date"
                  id="inspectionExpiry"
                  name="inspectionExpiry"
                  value={formData.inspectionExpiry}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">📝</span>
              <h3>Notas</h3>
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Observações</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Notas adicionais sobre o veículo..."
                rows="3"
                className="form-textarea"
              />
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
              {loading ? 'A adicionar...' : 'Adicionar Veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarVeiculoModal;
