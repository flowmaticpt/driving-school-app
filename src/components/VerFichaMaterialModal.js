import React, { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './VerFichaMaterialModal.css';

const VerFichaMaterialModal = ({ isOpen, onClose, material, escolaId, onSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  });

  useEffect(() => {
    if (material) {
      // Obter preço atual do último reabastecimento
      let currentPrice = '';
      if (material.reabastecimentos && material.reabastecimentos.length > 0) {
        const lastReabastecimento = material.reabastecimentos[material.reabastecimentos.length - 1];
        currentPrice = lastReabastecimento.unitPrice || '';
      }
      if (!currentPrice) {
        currentPrice = material.unitPrice || material.price || '';
      }
      
      setFormData({
        name: material.name || '',
        description: material.description || '',
        price: currentPrice
      });
    }
  }, [material]);

  if (!isOpen || !material) return null;

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
    if (material) {
      setFormData({
        name: material.name || '',
        description: material.description || '',
        price: material.price || ''
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('O nome do material é obrigatório.');
      return;
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      setError('Por favor, insira um preço válido.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const materialRef = doc(db, 'schools', escolaId, 'materials', material.id);
      await updateDoc(materialRef, {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        unitPrice: parseFloat(formData.price),
        price: parseFloat(formData.price), // Manter compatibilidade
        updatedAt: Timestamp.now()
      });

      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao atualizar material:', err);
      setError('Erro ao atualizar material. Tente novamente.');
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

  const getTotalQuantity = () => {
    if (!material.reabastecimentos || material.reabastecimentos.length === 0) {
      return 0;
    }
    return material.reabastecimentos.reduce((total, reabastecimento) => 
      total + (reabastecimento.quantity || 0), 0
    );
  };

  const getTotalValue = () => {
    if (!material.reabastecimentos || material.reabastecimentos.length === 0) {
      return 0;
    }
    return material.reabastecimentos.reduce((total, reabastecimento) => 
      total + (reabastecimento.totalPrice || 0), 0
    );
  };

  const getCurrentPrice = () => {
    if (!material.reabastecimentos || material.reabastecimentos.length === 0) {
      return material.unitPrice || material.price || 0;
    }
    // Pegar o último reabastecimento (o mais recente)
    const lastReabastecimento = material.reabastecimentos[material.reabastecimentos.length - 1];
    return lastReabastecimento.unitPrice || material.unitPrice || material.price || 0;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ver-ficha-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalhes do Material</h2>
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
          <div className="material-header-info">
            <div className="material-name-section">
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="edit-input material-name-input"
                  placeholder="Nome do material"
                  required
                />
              ) : (
                <h3>{material.name}</h3>
              )}
            </div>
            <div className="material-status">
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
                  placeholder="Descrição do material"
                  rows="3"
                />
              ) : (
                <div className="info-value description-value">
                  {material.description || 'Não informado'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="price">Preço Unitário Atual</label>
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
                  {formatPrice(getCurrentPrice())}
                </div>
              )}
            </div>

            <div className="stats-section">
              <div className="stat-item">
                <label>Quantidade Total:</label>
                <span className="stat-value quantity">{getTotalQuantity()}</span>
              </div>
              <div className="stat-item">
                <label>Valor Total Investido:</label>
                <span className="stat-value value">{formatPrice(getTotalValue())}</span>
              </div>
            </div>

            <div className="info-item">
              <label>Data de Criação:</label>
              <span className="info-value">{formatDate(material.createdAt)}</span>
            </div>
          </form>

          {/* Histórico de Reabastecimentos */}
          {material.reabastecimentos && material.reabastecimentos.length > 0 && (
            <div className="reabastecimentos-section">
              <h4>Histórico de Reabastecimentos</h4>
              <div className="reabastecimentos-list">
                {material.reabastecimentos.map((reabastecimento, index) => (
                  <div key={index} className="reabastecimento-item">
                    <div className="reabastecimento-info">
                      <span className="type">
                        {reabastecimento.type === 'criacao' ? 'Criação' : 'Reabastecimento'}
                      </span>
                      <span className="quantity">Qtd: {reabastecimento.quantity}</span>
                      <span className="unit-price">
                        {formatPrice(reabastecimento.unitPrice)}/un
                      </span>
                      <span className="total-price">
                        {formatPrice(reabastecimento.totalPrice)}
                      </span>
                    </div>
                    <span className="date">
                      {formatDate(reabastecimento.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerFichaMaterialModal;
