import { collection, getDocs, updateDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Serviço para limpeza automática de referências quando itens são removidos
 */

/**
 * Remove uma escola de todos os groups que a referenciam
 * @param {string} escolaId - ID da escola a ser removida
 */
export const removeEscolaFromGroups = async (escolaId) => {
  try {
    // Buscar todos os groups que referenciam esta escola
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('schoolIds', 'array-contains', escolaId));
    const querySnapshot = await getDocs(q);
    
    const updatePromises = [];
    
    querySnapshot.forEach((grupoDoc) => {
      const grupoData = grupoDoc.data();
      const updatedSchoolIds = grupoData.schoolIds.filter(id => id !== escolaId);
      
      // Atualizar o grupo removendo a referência da escola
      const grupoRef = doc(db, 'groups', grupoDoc.id);
      updatePromises.push(
        updateDoc(grupoRef, {
          schoolIds: updatedSchoolIds,
          updatedAt: Timestamp.now()
        })
      );
    });
    
    await Promise.all(updatePromises);
    
    return { success: true, groupsAtualizados: updatePromises.length };
  } catch (error) {
    console.error('Erro ao remover escola dos groups:', error);
    throw error;
  }
};

/**
 * Remove um grupo de todas as schools que o referenciam
 * @param {string} grupoId - ID do grupo a ser removido
 */
export const removeGrupoFromEscolas = async (grupoId) => {
  try {
    // Buscar todas as schools que referenciam este grupo
    const schoolsRef = collection(db, 'schools');
    const q = query(schoolsRef, where('groupID', '==', grupoId));
    const querySnapshot = await getDocs(q);
    
    const updatePromises = [];
    
    querySnapshot.forEach((escolaDoc) => {
      // Atualizar a escola removendo a referência do grupo
      const escolaRef = doc(db, 'schools', escolaDoc.id);
      updatePromises.push(
        updateDoc(escolaRef, {
          groupID: '',
          updatedAt: Timestamp.now()
        })
      );
    });
    
    await Promise.all(updatePromises);
    
    return { success: true, schoolsAtualizadas: updatePromises.length };
  } catch (error) {
    console.error('Erro ao remover grupo das schools:', error);
    throw error;
  }
};

/**
 * Remove um admin de todas as schools e groups que o referenciam
 * @param {string} adminId - ID do admin a ser removido
 */
export const removeAdminFromAll = async (adminId) => {
  try {
    const updatePromises = [];
    
    // Remover de schools
    const schoolsRef = collection(db, 'schools');
    const schoolsSnapshot = await getDocs(schoolsRef);
    
    schoolsSnapshot.forEach((escolaDoc) => {
      const escolaData = escolaDoc.data();
      if (escolaData.admins && escolaData.admins.includes(adminId)) {
        const updatedAdmins = escolaData.admins.filter(id => id !== adminId);
        const escolaRef = doc(db, 'schools', escolaDoc.id);
        updatePromises.push(
          updateDoc(escolaRef, {
            admins: updatedAdmins,
            updatedAt: Timestamp.now()
          })
        );
      }
    });
    
    // Remover de groups
    const groupsRef = collection(db, 'groups');
    const groupsSnapshot = await getDocs(groupsRef);
    
    groupsSnapshot.forEach((grupoDoc) => {
      const grupoData = grupoDoc.data();
      if (grupoData.admins && grupoData.admins.includes(adminId)) {
        const updatedAdmins = grupoData.admins.filter(id => id !== adminId);
        const grupoRef = doc(db, 'groups', grupoDoc.id);
        updatePromises.push(
          updateDoc(grupoRef, {
            admins: updatedAdmins,
            updatedAt: Timestamp.now()
          })
        );
      }
    });
    
    await Promise.all(updatePromises);
    
    return { success: true, referenciasAtualizadas: updatePromises.length };
  } catch (error) {
    console.error('Erro ao remover admin das referências:', error);
    throw error;
  }
};

/**
 * Função genérica para limpeza de referências
 * @param {string} itemType - Tipo do item ('escola', 'grupo', 'admin')
 * @param {string} itemId - ID do item a ser removido
 */
export const cleanupReferences = async (itemType, itemId) => {
  try {
    switch (itemType) {
      case 'escola':
        return await removeEscolaFromGroups(itemId);
      case 'grupo':
        return await removeGrupoFromEscolas(itemId);
      case 'admin':
        return await removeAdminFromAll(itemId);
      default:
        throw new Error(`Tipo de item não suportado: ${itemType}`);
    }
  } catch (error) {
    console.error(`Erro na limpeza de referências para ${itemType}:`, error);
    throw error;
  }
};

/**
 * Verifica e limpa referências órfãs na base de dados
 * Útil para manutenção periódica
 */
export const cleanupOrphanedReferences = async () => {
  try {
    // Buscar todas as schools
    const schoolsRef = collection(db, 'schools');
    const schoolsSnapshot = await getDocs(schoolsRef);
    
    // Buscar todos os groups
    const groupsRef = collection(db, 'groups');
    const groupsSnapshot = await getDocs(groupsRef);
    
    const groupsIds = new Set(groupsSnapshot.docs.map(doc => doc.id));
    const updatePromises = [];
    
    // Verificar schools com groupID inválido
    schoolsSnapshot.forEach((escolaDoc) => {
      const escolaData = escolaDoc.data();
      if (escolaData.groupID && !groupsIds.has(escolaData.groupID)) {
        const escolaRef = doc(db, 'schools', escolaDoc.id);
        updatePromises.push(
          updateDoc(escolaRef, {
            groupID: '',
            updatedAt: Timestamp.now()
          })
        );
      }
    });
    
    // Verificar groups com schoolIds inválidos
    groupsSnapshot.forEach((grupoDoc) => {
      const grupoData = grupoDoc.data();
      if (grupoData.schoolIds && grupoData.schoolIds.length > 0) {
        const schoolsIds = new Set(schoolsSnapshot.docs.map(doc => doc.id));
        const validSchoolIds = grupoData.schoolIds.filter(id => schoolsIds.has(id));
        
        if (validSchoolIds.length !== grupoData.schoolIds.length) {
          const grupoRef = doc(db, 'groups', grupoDoc.id);
          updatePromises.push(
            updateDoc(grupoRef, {
              schoolIds: validSchoolIds,
              updatedAt: Timestamp.now()
            })
          );
        }
      }
    });
    
    await Promise.all(updatePromises);
    
    return { success: true, referenciasCorrigidas: updatePromises.length };
  } catch (error) {
    console.error('Erro na limpeza de referências órfãs:', error);
    throw error;
  }
};
