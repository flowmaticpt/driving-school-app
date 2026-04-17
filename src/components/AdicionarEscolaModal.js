import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdicionarEscolaModal.css';

const AdicionarEscolaModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      // Criar documento na coleção 'schools'
      const escolaData = {
        name: formData.name.trim(),
        address: formData.address.trim() || '',
        number: formData.phone.trim() || '',
        email: formData.email.trim() || '',
        groupID: '',
        admins: [],
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'schools'), escolaData);
      
      // Limpar formulário
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: ''
      });
      
      onSuccess('Escola adicionada com sucesso!');
      onClose();
      
    } catch (err) {
      console.error('Erro ao adicionar escola:', err);
      setError('Erro ao adicionar escola. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: ''
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
          <h2>Adicionar Nova Escola</h2>
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
              {isLoading ? 'Adicionando...' : 'Adicionar Escola'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarEscolaModal;
