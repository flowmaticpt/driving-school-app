import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdicionarNovoServicoModal.css';

const AdicionarNovoServicoModal = ({ isOpen, onClose, onSuccess, escolaId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      // Criar documento na subcoleção 'services' da escola
      const servicesRef = collection(db, 'schools', escolaId, 'services');
      const servicoData = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        price: parseFloat(formData.price),
        createdAt: Timestamp.now()
      };

      await addDoc(servicesRef, servicoData);
      
      // Limpar formulário
      setFormData({
        name: '',
        description: '',
        price: ''
      });
      
      onSuccess();
      
    } catch (err) {
      console.error('Erro ao adicionar serviço:', err);
      setError('Erro ao adicionar serviço. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        description: '',
        price: ''
      });
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Novo Serviço</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">
              Nome do Serviço <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Digite o nome do serviço"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrição</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Digite uma descrição do serviço"
              rows="4"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Categoria</label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="Ex: Teórica, Prática, Exame"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">
              Preço <span className="required">*</span>
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              onWheel={(e) => e.target.blur()}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              disabled={isLoading}
            />
            <span className="currency-symbol">€</span>
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
              disabled={isLoading}
            >
              {isLoading ? 'Adicionando...' : 'Adicionar Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarNovoServicoModal;
