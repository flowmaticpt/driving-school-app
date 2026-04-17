import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdicionarInstrutorModal.css';

const AdicionarInstrutorModal = ({ escolaId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    carroHabitual: ''
  });
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Buscar veículos da frota
  useEffect(() => {
    const fetchVeiculos = async () => {
      try {
        const veiculosRef = collection(db, 'schools', escolaId, 'fleet');
        const veiculosSnapshot = await getDocs(veiculosRef);
        const veiculosData = veiculosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVeiculos(veiculosData);
      } catch (error) {
        console.error('Erro ao buscar veículos:', error);
        setError('Erro ao carregar veículos da frota');
      }
    };

    if (escolaId) {
      fetchVeiculos();
    }
  }, [escolaId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('O nome é obrigatório');
      return;
    }

    // Validar formato do email apenas se fornecido
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Por favor, insira um email válido');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const instrutorData = {
        name: formData.name.trim(),
        email: formData.email.trim() ? formData.email.trim().toLowerCase() : null,
        phone: formData.phone.trim() || null,
        carroHabitual: formData.carroHabitual || null,
        role: 'instrutor',
        escolaId: escolaId,
        status: 'ativo',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Adicionar à coleção de utilizadores
      await addDoc(collection(db, 'utilizadores'), instrutorData);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar instrutor:', error);
      setError('Erro ao criar instrutor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Instrutor</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Informações Pessoais */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">👨‍🏫</span>
              <h3>Informações Pessoais</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Nome Completo *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: João Silva"
                  required
                  className="form-input"
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
                  placeholder="Ex: joao.silva@email.com (opcional)"
                  className="form-input"
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
                  placeholder="Ex: 912 345 678 (opcional)"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Veículo Habitual */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">🚗</span>
              <h3>Veículo Habitual</h3>
            </div>
            
            <div className="form-group">
              <label htmlFor="carroHabitual">Carro Habitual</label>
              <select
                id="carroHabitual"
                name="carroHabitual"
                value={formData.carroHabitual}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Selecionar veículo... (opcional)</option>
                {veiculos.map(veiculo => (
                  <option key={veiculo.id} value={veiculo.id}>
                    {veiculo.registration} - {veiculo.brand} {veiculo.model}
                  </option>
                ))}
              </select>
              {veiculos.length === 0 && (
                <p className="no-vehicles-message">
                  Nenhum veículo disponível na frota. Adicione veículos primeiro.
                </p>
              )}
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
              {loading ? 'A criar...' : 'Criar Instrutor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarInstrutorModal;