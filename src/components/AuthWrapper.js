import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthWrapper = ({ children }) => {
  const authContext = useAuth();
  
  // Se não há contexto de autenticação, não renderizar nada
  if (!authContext) {
    return null;
  }
  
  return children;
};

export default AuthWrapper;







