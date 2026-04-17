import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Serviço para migração de campos de utilizadores
 */

/**
 * Migra todos os utilizadores da coleção 'users' de 'isActive' para 'active'
 * Define o campo 'active' como true para todos os utilizadores
 */
export const migrateUsersIsActiveToActive = async () => {
  try {
    console.log('🔄 Iniciando migração de isActive para active...');
    
    // Buscar todos os utilizadores
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    if (usersSnapshot.empty) {
      console.log('ℹ️ Nenhum utilizador encontrado para migrar');
      return { success: true, usersAtualizados: 0, message: 'Nenhum utilizador encontrado' };
    }
    
    const batch = writeBatch(db);
    let usersAtualizados = 0;
    let usersComIsActive = 0;
    let usersComActive = 0;
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const updates = {};
      let needsUpdate = false;
      
      // Verificar se tem campo isActive
      if (userData.hasOwnProperty('isActive')) {
        usersComIsActive++;
        // Remover isActive e adicionar active como true
        updates.isActive = null; // Para remover o campo
        updates.active = true;
        needsUpdate = true;
      }
      
      // Se não tem active, adicionar como true
      if (!userData.hasOwnProperty('active')) {
        updates.active = true;
        needsUpdate = true;
      } else {
        usersComActive++;
      }
      
      if (needsUpdate) {
        const userRef = doc(db, 'users', userDoc.id);
        batch.update(userRef, {
          ...updates,
          updatedAt: new Date()
        });
        usersAtualizados++;
      }
    });
    
    // Executar todas as atualizações em batch
    if (usersAtualizados > 0) {
      await batch.commit();
      console.log(`✅ Migração concluída: ${usersAtualizados} utilizadores atualizados`);
    } else {
      console.log('ℹ️ Nenhum utilizador precisou de atualização');
    }
    
    return {
      success: true,
      usersAtualizados,
      usersComIsActive,
      usersComActive,
      totalUsers: usersSnapshot.size,
      message: `Migração concluída: ${usersAtualizados} utilizadores atualizados`
    };
    
  } catch (error) {
    console.error('❌ Erro na migração de utilizadores:', error);
    throw error;
  }
};

/**
 * Verifica o estado atual dos campos de utilizadores
 */
export const checkUsersFieldStatus = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let usersComIsActive = 0;
    let usersComActive = 0;
    let usersSemActive = 0;
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      
      if (userData.hasOwnProperty('isActive')) {
        usersComIsActive++;
      }
      
      if (userData.hasOwnProperty('active')) {
        usersComActive++;
      } else {
        usersSemActive++;
      }
    });
    
    return {
      totalUsers: usersSnapshot.size,
      usersComIsActive,
      usersComActive,
      usersSemActive,
      needsMigration: usersComIsActive > 0 || usersSemActive > 0
    };
    
  } catch (error) {
    console.error('❌ Erro ao verificar estado dos utilizadores:', error);
    throw error;
  }
};







