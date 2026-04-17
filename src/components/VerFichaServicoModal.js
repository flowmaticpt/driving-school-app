import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './VerFichaServicoModal.css';

const VerFichaServicoModal = ({ isOpen, onClose, servico, escolaId, onSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: ''
  });

  useEffect(() => {
    if (servico) {
      setFormData({
        name: servico.name || '',
        description: servico.description || '',
        category: servico.category || '',
        price: servico.price || ''
      });
    }
  }, [servico]);

  if (!isOpen || !servico) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    // Reset form data to original values
    if (servico) {
      setFormData({
        name: servico.name || '',
        description: servico.description || '',
        price: servico.price || ''
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('O nome do serviço é obrigatório.');
      return;
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      setError('Por favor, insira um preço válido.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const servicoRef = doc(db, 'schools', escolaId, 'services', servico.id);
      await updateDoc(servicoRef, {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        price: parseFloat(formData.price),
        updatedAt: new Date()
      });

      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao atualizar serviço:', err);
      setError('Erro ao atualizar serviço. Tente novamente.');
    } finally {
      setIsLoading(false);
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

  const formatPrice = (price) => {
    if (!price) return '0,00 €';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ver-ficha-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalhes do Serviço</h2>
          <div className="header-actions">
            {!isEditing ? (
              <button className="edit-button" onClick={handleEdit}>
                Editar
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-button" 
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button 
                  className="cancel-button" 
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
              </div>
            )}
            <button className="close-button" onClick={onClose} disabled={isLoading}>
              ×
            </button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="servico-header-info">
            <div className="servico-name-section">
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="edit-input servico-name-input"
                  placeholder="Nome do serviço"
                  required
                />
              ) : (
                <h3>{servico.name}</h3>
              )}
            </div>
            <div className="servico-status">
              <div className="status-indicator">
                <div className="status-icon"></div>
                <span>Ativo</span>
              </div>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form className="edit-form">
            <div className="form-group">
              <label htmlFor="description">Descrição</label>
              {isEditing ? (
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="edit-input description-input"
                  placeholder="Descrição do serviço"
                  rows="4"
                />
              ) : (
                <div className="info-value description-value">
                  {servico.description || 'Não informado'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="category">Categoria</label>
              {isEditing ? (
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="edit-input category-input"
                  placeholder="Ex: Teórica, Prática, Exame"
                />
              ) : (
                <div className="info-value category-value">
                  {servico.category ? (
                    <span className="category-badge">{servico.category}</span>
                  ) : (
                    'Não informado'
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="price">Preço</label>
              {isEditing ? (
                <div className="price-input-container">
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    onWheel={(e) => e.target.blur()}
                    className="edit-input price-input"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                  <span className="currency-symbol">€</span>
                </div>
              ) : (
                <div className="info-value price-value">
                  {formatPrice(servico.price)}
                </div>
              )}
            </div>

            <div className="info-item">
              <label>Data de Criação:</label>
              <span className="info-value">{formatDate(servico.createdAt)}</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerFichaServicoModal;
