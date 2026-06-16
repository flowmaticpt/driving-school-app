import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase/config';
import './AdicionarInstrutorModal.css';

const AdicionarInstrutorModal = ({ escolaId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    carroHabitual: ''
  });
  const [criarConta, setCriarConta] = useState(false);
  const [password, setPassword] = useState('');
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
    const emailTrimmed = formData.email.trim();
    if (emailTrimmed) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        setError('Por favor, insira um email válido');
        return;
      }
    }

    // Se criar conta, email e password são obrigatórios
    if (criarConta) {
      if (!emailTrimmed) {
        setError('O email é obrigatório para criar conta de acesso');
        return;
      }
      if (!password || password.length < 6) {
        setError('A palavra-passe deve ter pelo menos 6 caracteres');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const instrutorData = {
        name: formData.name.trim(),
        email: emailTrimmed ? emailTrimmed.toLowerCase() : null,
        phone: formData.phone.trim() || null,
        carroHabitual: formData.carroHabitual || null,
        role: 'instrutor',
        escolaId: escolaId,
        status: 'ativo',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Adicionar à coleção de utilizadores (registo interno)
      await addDoc(collection(db, 'utilizadores'), instrutorData);

      // Criar conta de acesso ao sistema (Firebase Auth + users collection)
      if (criarConta) {
        let secondaryApp = null;
        try {
          // Usar secondary app para não deslogar o admin atual
          secondaryApp = initializeApp(firebaseConfig, 'SecondaryInstrutor');
          const secondaryAuth = getAuth(secondaryApp);
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            emailTrimmed.toLowerCase(),
            password
          );

          // Criar documento na collection 'users'
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: formData.name.trim(),
            email: emailTrimmed.toLowerCase(),
            role: 'instrutor',
            phone: formData.phone.trim() || '',
            schoolId: escolaId,
            escolasAtribuidas: [escolaId],
            gruposAtribuidos: [],
            active: true,
            pendingApproval: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          await signOut(secondaryAuth);
        } catch (authError) {
          console.error('Erro ao criar conta de acesso:', authError);
          if (authError.code === 'auth/email-already-in-use') {
            setError('Este email já está registado no sistema. O instrutor foi adicionado mas sem conta de acesso.');
          } else {
            setError('Instrutor adicionado, mas erro ao criar conta de acesso: ' + authError.message);
          }
          setLoading(false);
          // O instrutor foi criado na collection 'utilizadores', mas a conta falhou
          onSuccess();
          return;
        } finally {
          if (secondaryApp) {
            try { await deleteApp(secondaryApp); } catch (e) { /* ignore */ }
          }
        }
      }

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

          {/* Conta de Acesso */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">🔑</span>
              <h3>Conta de Acesso</h3>
            </div>

            <div className="form-group">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={criarConta}
                  onChange={(e) => setCriarConta(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Criar conta para o instrutor aceder ao sistema</span>
              </label>
              <p style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '0.25rem' }}>
                O instrutor podera entrar na app e marcar as suas proprias aulas e ver a frota.
              </p>
            </div>

            {criarConta && (
              <>
                {!formData.email.trim() && (
                  <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    Preencha o email acima para criar a conta.
                  </p>
                )}
                <div className="form-group">
                  <label htmlFor="password">Palavra-passe *</label>
                  <input
                    type="text"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    className="form-input"
                  />
                  <p style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '0.25rem' }}>
                    Comunique esta palavra-passe ao instrutor. Ele pode altera-la depois.
                  </p>
                </div>
              </>
            )}
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