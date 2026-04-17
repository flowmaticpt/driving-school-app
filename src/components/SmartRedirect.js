import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SmartRedirect = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  useEffect(() => {
    console.log('🔄 SmartRedirect: Dados do utilizador:', userData);
    
    if (!userData) {
      console.log('⏳ SmartRedirect: Ainda não há dados do utilizador');
      return;
    }

    console.log('🎯 SmartRedirect: Redirecionando baseado no role:', userData.role);

    switch (userData.role) {
      case 'admin':
        // Admin vai para a primeira escola atribuída
        if (userData.escolasAtribuidas && userData.escolasAtribuidas.length > 0) {
          const firstSchoolId = userData.escolasAtribuidas[0];
          console.log('🏫 SmartRedirect: Admin redirecionado para escola:', firstSchoolId);
          navigate(`/escola/${firstSchoolId}`, { replace: true });
        } else {
          // Se não tem escolas atribuídas, vai para página sem acesso
          console.log('🚫 SmartRedirect: Admin sem escolas atribuídas, redirecionando para /sem-acesso');
          navigate('/sem-acesso', { replace: true });
        }
        break;
      
      case 'group_owner':
        // Group owner vai para a visão geral (pode ver escolas dos grupos)
        console.log('👥 SmartRedirect: Group owner redirecionado para /visao-geral');
        navigate('/visao-geral', { replace: true });
        break;
      
      case 'dono':
        // Dono vai para a página inicial (tem acesso a tudo)
        console.log('👑 SmartRedirect: Dono redirecionado para página inicial');
        navigate('/', { replace: true });
        break;
      
      default:
        // Outros roles vão para página inicial
        console.log('❓ SmartRedirect: Role desconhecido, redirecionando para página inicial');
        navigate('/', { replace: true });
    }
  }, [userData, navigate]);

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Redirecionando...</p>
    </div>
  );
};

export default SmartRedirect;
