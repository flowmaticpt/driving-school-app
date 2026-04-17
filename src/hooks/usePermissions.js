import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { userData } = useAuth();

  const canAccessSchool = (schoolId) => {
    if (!userData) return false;
    
    switch (userData.role) {
      case 'dono':
        return true; // Dono pode aceder a todas as escolas
      case 'admin':
        return userData.escolasAtribuidas?.includes(schoolId) || false;
      case 'instrutor':
        return userData.escolasAtribuidas?.includes(schoolId) || false;
      case 'group_owner':
        return false; // Group owner não deve aceder a escolas diretamente
      default:
        return false;
    }
  };

  const canAccessGroup = (groupId) => {
    if (!userData) return false;
    
    switch (userData.role) {
      case 'dono':
        return true; // Dono pode aceder a todos os grupos
      case 'group_owner':
        return userData.gruposAtribuidos?.includes(groupId) || false;
      case 'admin':
        return false; // Admin não deve aceder a grupos diretamente
      default:
        return false;
    }
  };

  const canCreateGroup = () => {
    if (!userData) return false;
    return userData.role === 'dono'; // Apenas o dono pode criar grupos
  };

  const canCreateSchool = () => {
    if (!userData) return false;
    return userData.role === 'dono'; // Apenas o dono pode criar escolas
  };

  const canManageUsers = () => {
    if (!userData) return false;
    return userData.role === 'dono'; // Apenas o dono pode gerir users
  };

  const canApproveUsers = () => {
    if (!userData) return false;
    return userData.role === 'dono'; // Apenas o dono pode aprovar users
  };

  const getAccessibleSchools = (allSchools) => {
    if (!userData || !allSchools) {
      console.log('🔒 usePermissions: getAccessibleSchools - Sem dados:', { hasUserData: !!userData, hasAllSchools: !!allSchools });
      return [];
    }
    
    console.log('🔍 usePermissions: getAccessibleSchools - Dados:', {
      userRole: userData.role,
      totalSchools: allSchools.length,
      escolasAtribuidas: userData.escolasAtribuidas,
      gruposAtribuidos: userData.gruposAtribuidos
    });
    
    switch (userData.role) {
      case 'dono':
        console.log('👑 usePermissions: Dono - Retornando todas as escolas');
        return allSchools; // Dono vê todas as escolas
      case 'admin':
        const adminSchools = allSchools.filter(school => 
          userData.escolasAtribuidas?.includes(school.id)
        );
        console.log('👤 usePermissions: Admin - Escolas filtradas:', {
          total: allSchools.length,
          filtradas: adminSchools.length,
          escolasAtribuidas: userData.escolasAtribuidas,
          escolasFiltradas: adminSchools.map(s => ({ id: s.id, name: s.name }))
        });
        return adminSchools;
      case 'instrutor':
        const instrutorSchools = allSchools.filter(school => 
          userData.escolasAtribuidas?.includes(school.id)
        );
        console.log('👨‍🏫 usePermissions: Instrutor - Escolas filtradas:', {
          total: allSchools.length,
          filtradas: instrutorSchools.length,
          escolasAtribuidas: userData.escolasAtribuidas,
          escolasFiltradas: instrutorSchools.map(s => ({ id: s.id, name: s.name }))
        });
        return instrutorSchools;
      case 'group_owner':
        // Group owner vê escolas dos grupos atribuídos
        const groupOwnerSchools = allSchools.filter(school => 
          school.groupID && userData.gruposAtribuidos?.includes(school.groupID)
        );
        console.log('👥 usePermissions: Group Owner - Escolas filtradas:', {
          total: allSchools.length,
          filtradas: groupOwnerSchools.length,
          gruposAtribuidos: userData.gruposAtribuidos,
          escolasFiltradas: groupOwnerSchools.map(s => ({ id: s.id, name: s.name, groupID: s.groupID }))
        });
        return groupOwnerSchools;
      default:
        console.log('❓ usePermissions: Role desconhecido:', userData.role);
        return [];
    }
  };

  const getAccessibleGroups = (allGroups) => {
    if (!userData || !allGroups) return [];
    
    switch (userData.role) {
      case 'dono':
        return allGroups; // Dono vê todos os grupos
      case 'group_owner':
        return allGroups.filter(group => 
          userData.gruposAtribuidos?.includes(group.id)
        );
      case 'admin':
        return []; // Admin não deve ver grupos
      default:
        return [];
    }
  };

  return {
    canAccessSchool,
    canAccessGroup,
    canCreateGroup,
    canCreateSchool,
    canManageUsers,
    canApproveUsers,
    getAccessibleSchools,
    getAccessibleGroups,
    userRole: userData?.role,
    userData
  };
};
