import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();
  const navigate = useNavigate();


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔐 Auth: Iniciando processo de autenticação:', { 
      isLogin, 
      email: formData.email,
      hasPassword: !!formData.password 
    });

    try {
      if (isLogin) {
        // Login
        console.log('🔐 Auth: Tentando fazer login...');
        await login(formData.email, formData.password);
        console.log('✅ Auth: Login bem-sucedido, redirecionando...');
        navigate('/redirect');
      } else {
        // Registro
        console.log('📝 Auth: Tentando fazer registo...');
        if (formData.password !== formData.confirmPassword) {
          setError('As palavras-passe não coincidem');
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('A palavra-passe deve ter pelo menos 6 caracteres');
          setLoading(false);
          return;
        }

        await signup(formData.email, formData.password, formData.name, 'admin');
        console.log('✅ Auth: Registo bem-sucedido, redirecionando...');
        navigate('/redirect');
      }
    } catch (error) {
      console.error('❌ Auth: Erro de autenticação:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setError('Utilizador não encontrado');
          break;
        case 'auth/wrong-password':
          setError('Palavra-passe incorreta');
          break;
        case 'auth/email-already-in-use':
          setError('Este email já está em uso');
          break;
        case 'auth/weak-password':
          setError('A palavra-passe é muito fraca');
          break;
        case 'auth/invalid-email':
          setError('Email inválido');
          break;
        default:
          setError('Erro de autenticação. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Driving School App</h1>
          <h2>{isLogin ? 'Iniciar Sessão' : 'Criar Conta'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Nome Completo</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Seu nome completo"
                required={!isLogin}
                className="form-input"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="seu@email.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Palavra-passe</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Sua palavra-passe"
              required
              className="form-input"
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Palavra-passe</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirme sua palavra-passe"
                  required={!isLogin}
                  className="form-input"
                />
              </div>
            </>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'A processar...' : (isLogin ? 'Iniciar Sessão' : 'Criar Conta')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button 
              type="button" 
              className="toggle-button"
              onClick={toggleMode}
            >
              {isLogin ? 'Criar conta' : 'Iniciar sessão'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
