import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './AdicionarNovoAlunoModal.css';

const AdicionarNovoAlunoModal = ({ isOpen, onClose, onSuccess, escolaId }) => {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    nif: '',
    cc: '',
    enrollmentDate: '',
    enrollmentNumber: ''
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
    
    // Validação - nome é obrigatório
    if (!formData.name.trim()) {
      setError('O nome do aluno é obrigatório');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Criar documento na subcoleção 'students' da escola
      const studentsRef = collection(db, 'schools', escolaId, 'students');
      const alunoData = {
        name: formData.name.trim(),
        email: formData.email.trim() || '',
        address: formData.address.trim() || '',
        phone: formData.phone.trim() || '',
        nif: formData.nif.trim() || '',
        cc: formData.cc.trim() || '',
        enrollmentDate: formData.enrollmentDate || null,
        enrollmentNumber: formData.enrollmentNumber.trim() || '',
        totalDivida: 0, // Inicializar dívida total
        active: true, // New students are active by default
        createdAt: Timestamp.now(),
        createdBy: userData?.name || 'Desconhecido',
        createdByUserId: userData?.id || null
      };

      const docRef = await addDoc(studentsRef, alunoData);

      // Limpar formulário
      setFormData({
        name: '',
        email: '',
        address: '',
        phone: '',
        nif: '',
        cc: '',
        enrollmentDate: '',
        enrollmentNumber: ''
      });

      // Passar o aluno criado com o ID para o componente pai poder adicioná-lo à lista imediatamente
      // Usar Date() real em vez do Timestamp sentinel para o optimistic update funcionar no sort
      onSuccess({ id: docRef.id, ...alunoData, createdAt: new Date(), updatedAt: new Date() });
      
    } catch (err) {
      console.error('Erro ao adicionar aluno:', err);
      setError('Erro ao adicionar aluno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        email: '',
        address: '',
        phone: '',
        nif: '',
        cc: '',
        enrollmentDate: '',
        enrollmentNumber: ''
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
          <h2>Adicionar Novo Aluno</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">
                Nome do Aluno <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Digite o nome completo do aluno"
                required
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
                placeholder="Digite o email do aluno"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Morada</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Digite a morada completa"
              disabled={isLoading}
            />
          </div>

          <div className="form-row">
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
              <label htmlFor="nif">NIF</label>
              <input
                type="text"
                id="nif"
                name="nif"
                value={formData.nif}
                onChange={handleInputChange}
                placeholder="Digite o NIF"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cc">Cartão de Cidadão</label>
              <input
                type="text"
                id="cc"
                name="cc"
                value={formData.cc}
                onChange={handleInputChange}
                placeholder="Digite o número do CC"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="enrollmentDate">Data de Inscrição</label>
              <input
                type="datetime-local"
                id="enrollmentDate"
                name="enrollmentDate"
                value={formData.enrollmentDate}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="enrollmentNumber">Número de Inscrição</label>
              <input
                type="text"
                id="enrollmentNumber"
                name="enrollmentNumber"
                value={formData.enrollmentNumber}
                onChange={handleInputChange}
                placeholder="Digite o número de inscrição"
                disabled={isLoading}
              />
            </div>

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
              {isLoading ? 'Adicionando...' : 'Adicionar Aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarNovoAlunoModal;
