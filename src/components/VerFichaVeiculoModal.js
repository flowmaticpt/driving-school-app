import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './VerFichaVeiculoModal.css';

const VerFichaVeiculoModal = ({ veiculo, escolaId, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    registration: veiculo.registration || '',
    brand: veiculo.brand || '',
    model: veiculo.model || '',
    year: veiculo.year || '',
    type: veiculo.type || '',
    insurance: veiculo.insurance || '',
    insuranceExpiry: veiculo.insuranceExpiry ? 
      (veiculo.insuranceExpiry.toDate ? 
        veiculo.insuranceExpiry.toDate().toISOString().split('T')[0] : 
        new Date(veiculo.insuranceExpiry).toISOString().split('T')[0]
      ) : '',
    inspectionExpiry: veiculo.inspectionExpiry ? 
      (veiculo.inspectionExpiry.toDate ? 
        veiculo.inspectionExpiry.toDate().toISOString().split('T')[0] : 
        new Date(veiculo.inspectionExpiry).toISOString().split('T')[0]
      ) : '',
    notes: veiculo.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const typesVeiculo = [
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      registration: veiculo.registration || '',
      brand: veiculo.brand || '',
      model: veiculo.model || '',
      year: veiculo.year || '',
      type: veiculo.type || '',
      insurance: veiculo.insurance || '',
      insuranceExpiry: veiculo.insuranceExpiry ? 
        (veiculo.insuranceExpiry.toDate ? 
          veiculo.insuranceExpiry.toDate().toISOString().split('T')[0] : 
          new Date(veiculo.insuranceExpiry).toISOString().split('T')[0]
        ) : '',
      inspectionExpiry: veiculo.inspectionExpiry ? 
        (veiculo.inspectionExpiry.toDate ? 
          veiculo.inspectionExpiry.toDate().toISOString().split('T')[0] : 
          new Date(veiculo.inspectionExpiry).toISOString().split('T')[0]
        ) : '',
      notes: veiculo.notes || ''
    });
    setError('');
  };

  const handleSave = async () => {
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
        insuranceExpiry: formData.insuranceExpiry ? new Date(formData.insuranceExpiry) : null,
        inspectionExpiry: formData.inspectionExpiry ? new Date(formData.inspectionExpiry) : null,
        notes: formData.notes.trim(),
        updatedAt: new Date()
      };

      const veiculoRef = doc(db, 'schools', escolaId, 'fleet', veiculo.id);
      await updateDoc(veiculoRef, veiculoData);

      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error('Erro ao atualizar veículo:', err);
      setError('Erro ao atualizar veículo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setError('');
    onClose();
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('pt-PT');
  };

  const isDocumentExpired = (date) => {
    if (!date) return false;
    const d = date.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    const diffTime = d - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 30; // Expira em 30 dias
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header">
          <h2>Detalhes do Veículo</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Navegação por Abas */}
          <div className="tabs-navigation">
            <button
              className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <span className="tab-icon">🚗</span>
              <span className="tab-label">Informações</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'docs' ? 'active' : ''}`}
              onClick={() => setActiveTab('docs')}
            >
              <span className="tab-icon">📋</span>
              <span className="tab-label">Documentação</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              <span className="tab-icon">ℹ️</span>
              <span className="tab-label">Sistema</span>
            </button>
          </div>

          <div className="modal-content">
            {/* Aba: Informações Básicas */}
            {activeTab === 'info' && (
              <div className="info-section">
                <div className="section-header">
                  <span className="section-icon">🚗</span>
                  <h3>Informações Básicas</h3>
                </div>
                
                <div className="info-grid">
                  <div className="info-item">
                    <label>Matrícula</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="registration"
                        value={formData.registration}
                        onChange={handleInputChange}
                        className="edit-input"
                        required
                      />
                    ) : (
                      <span className="info-value">{veiculo.registration || 'N/A'}</span>
                    )}
                  </div>

                  <div className="info-item">
                    <label>Marca</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="brand"
                        value={formData.brand}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <span className="info-value">{veiculo.brand || 'N/A'}</span>
                    )}
                  </div>

                  <div className="info-item">
                    <label>Modelo</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <span className="info-value">{veiculo.model || 'N/A'}</span>
                    )}
                  </div>

                  <div className="info-item">
                    <label>Ano</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <span className="info-value">{veiculo.year || 'N/A'}</span>
                    )}
                  </div>

                  <div className="info-item">
                    <label>Tipo</label>
                    {isEditing ? (
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="edit-select"
                      >
                        <option value="">Selecionar tipo...</option>
                        {typesVeiculo.map(tipo => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="info-value">{veiculo.type || 'N/A'}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Aba: Documentação */}
            {activeTab === 'docs' && (
              <div className="info-section">
                <div className="section-header">
                  <span className="section-icon">📋</span>
                  <h3>Documentação</h3>
                </div>
                
                <div className="info-grid">
                  <div className="info-item">
                    <label>Seguradora</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="insurance"
                        value={formData.insurance}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <span className="info-value">{veiculo.insurance || 'N/A'}</span>
                    )}
                  </div>

                  <div className="info-item">
                    <label>Validade Seguro</label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="insuranceExpiry"
                        value={formData.insuranceExpiry}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <span className={`info-value ${isDocumentExpired(veiculo.insuranceExpiry) ? 'expired' : ''}`}>
                        {formatDate(veiculo.insuranceExpiry)}
                      </span>
                    )}
                  </div>

                  <div className="info-item">
                    <label>Validade Inspeção</label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="inspectionExpiry"
                        value={formData.inspectionExpiry}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <span className={`info-value ${isDocumentExpired(veiculo.inspectionExpiry) ? 'expired' : ''}`}>
                        {formatDate(veiculo.inspectionExpiry)}
                      </span>
                    )}
                  </div>

                  <div className="info-item full-width">
                    <label>Notas</label>
                    {isEditing ? (
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="edit-textarea"
                        rows="3"
                        placeholder="Adicionar notas sobre o veículo..."
                      />
                    ) : (
                      <span className="info-value">{veiculo.notes || 'Nenhuma nota'}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Aba: Informações do Sistema */}
            {activeTab === 'system' && (
              <div className="info-section">
                <div className="section-header">
                  <span className="section-icon">ℹ️</span>
                  <h3>Informações do Sistema</h3>
                </div>
                
                <div className="info-grid">
                  <div className="info-item">
                    <label>Data de Criação</label>
                    <span className="info-value">
                      {veiculo.createdAt ? formatDate(veiculo.createdAt) : 'N/A'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Última Atualização</label>
                    <span className="info-value">
                      {veiculo.updatedAt ? formatDate(veiculo.updatedAt) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="modal-actions">
              {isEditing ? (
                <>
                  <button className="cancel-button" onClick={handleCancel}>
                    Cancelar
                  </button>
                  <button className="save-button" onClick={handleSave} disabled={loading}>
                    {loading ? 'A guardar...' : 'Guardar'}
                  </button>
                </>
              ) : (
                <>
                  <button className="cancel-button" onClick={handleClose}>
                    Fechar
                  </button>
                  <button className="edit-button" onClick={handleEdit}>
                    Editar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerFichaVeiculoModal;
