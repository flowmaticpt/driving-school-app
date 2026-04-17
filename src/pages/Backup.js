import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import './Backup.css';

const Backup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [progressModal, setProgressModal] = useState({
    isOpen: false,
    title: '',
    currentStep: '',
    steps: [],
    isComplete: false
  });

  useEffect(() => {
    fetchBackups();
    checkAutoBackup();
  }, []);

  const fetchBackups = async () => {
    try {
      const backupsRef = collection(db, 'backups');
      const q = query(backupsRef, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      
      const backupsList = [];
      snapshot.forEach(doc => {
        const backupData = doc.data();
        // Converter createdAt se for Timestamp
        let createdAt = backupData.createdAt;
        if (createdAt && createdAt.toDate && typeof createdAt.toDate === 'function') {
          createdAt = createdAt.toDate();
        } else if (createdAt && createdAt.seconds) {
          createdAt = new Date(createdAt.seconds * 1000);
        }
        
        backupsList.push({ 
          id: doc.id, 
          ...backupData,
          createdAt: createdAt,
          // Adicionar informação sobre tamanho e chunks
          sizeInfo: backupData.chunked 
            ? `${(backupData.totalSize / 1024 / 1024).toFixed(2)} MB (${backupData.totalChunks} chunks)`
            : backupData.data 
              ? `${(new Blob([JSON.stringify(backupData)]).size / 1024 / 1024).toFixed(2)} MB`
              : 'N/A'
        });
      });
      
      setBackups(backupsList);
    } catch (error) {
      console.error('Erro ao buscar backups:', error);
      showMessage('error', 'Erro ao carregar lista de backups');
    }
  };

  const checkAutoBackup = async () => {
    try {
      const configRef = doc(db, 'system', 'autoBackupConfig');
      const configSnap = await getDoc(configRef);
      
      if (!configSnap.exists() || !configSnap.data().enabled) {
        return;
      }

      const config = configSnap.data();
      const lastBackupRef = doc(db, 'system', 'lastAutoBackup');
      const lastBackupSnap = await getDoc(lastBackupRef);
      
      let shouldBackup = false;
      if (!lastBackupSnap.exists()) {
        shouldBackup = true;
      } else {
        const lastBackupTime = lastBackupSnap.data().timestamp?.seconds * 1000 || 0;
        const now = Date.now();
        const intervalMs = getIntervalMs(config.interval);
        
        if (now - lastBackupTime >= intervalMs) {
          shouldBackup = true;
        }
      }

      if (shouldBackup) {
        await createBackup(true); // true = automatic backup
      }
    } catch (error) {
      console.error('Erro ao verificar backup automático:', error);
    }
  };

  const getIntervalMs = (interval) => {
    switch (interval) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 24 * 60 * 60 * 1000;
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const exportAllData = async () => {
    const allData = {
      users: [],
      schools: [],
      groups: [],
      backups: []
    };

    try {
      // Export Users
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      usersSnap.forEach(doc => {
        const userData = doc.data();
        // Convert Firestore Timestamps to ISO strings
        const processedData = processTimestamps(userData);
        allData.users.push({ id: doc.id, ...processedData });
      });

      // Export Schools
      const schoolsRef = collection(db, 'schools');
      const schoolsSnap = await getDocs(schoolsRef);
      
      for (const schoolDoc of schoolsSnap.docs) {
        const schoolData = processTimestamps(schoolDoc.data());
        const schoolId = schoolDoc.id;
        
        // Export students
        const studentsRef = collection(db, 'schools', schoolId, 'students');
        const studentsSnap = await getDocs(studentsRef);
        const students = [];
        studentsSnap.forEach(doc => {
          students.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });
        
        // Export services
        const servicesRef = collection(db, 'schools', schoolId, 'services');
        const servicesSnap = await getDocs(servicesRef);
        const services = [];
        servicesSnap.forEach(doc => {
          services.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export materials
        const materialsRef = collection(db, 'schools', schoolId, 'materials');
        const materialsSnap = await getDocs(materialsRef);
        const materials = [];
        materialsSnap.forEach(doc => {
          materials.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export movements
        const movementsRef = collection(db, 'schools', schoolId, 'movements');
        const movementsSnap = await getDocs(movementsRef);
        const movements = [];
        movementsSnap.forEach(doc => {
          movements.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export despesas
        const despesasRef = collection(db, 'schools', schoolId, 'despesas');
        const despesasSnap = await getDocs(despesasRef);
        const despesas = [];
        despesasSnap.forEach(doc => {
          despesas.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export funcionarios
        const funcionariosRef = collection(db, 'schools', schoolId, 'funcionarios');
        const funcionariosSnap = await getDocs(funcionariosRef);
        const funcionarios = [];
        funcionariosSnap.forEach(doc => {
          funcionarios.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export servicosPrestados
        const servicosPrestadosRef = collection(db, 'schools', schoolId, 'servicosPrestados');
        const servicosPrestadosSnap = await getDocs(servicosPrestadosRef);
        const servicosPrestados = [];
        servicosPrestadosSnap.forEach(doc => {
          servicosPrestados.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export materiaisPrestados
        const materiaisPrestadosRef = collection(db, 'schools', schoolId, 'materiaisPrestados');
        const materiaisPrestadosSnap = await getDocs(materiaisPrestadosRef);
        const materiaisPrestados = [];
        materiaisPrestadosSnap.forEach(doc => {
          materiaisPrestados.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        allData.schools.push({
          id: schoolId,
          ...schoolData,
          students,
          services,
          materials,
          movements,
          despesas,
          funcionarios,
          servicosPrestados,
          materiaisPrestados
        });
      }

      // Export Groups
      const groupsRef = collection(db, 'groups');
      const groupsSnap = await getDocs(groupsRef);
      groupsSnap.forEach(doc => {
        allData.groups.push({ id: doc.id, ...processTimestamps(doc.data()) });
      });

      return allData;
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  };

  const processTimestamps = (obj) => {
    const processed = { ...obj };
    for (const key in processed) {
      if (processed[key] && typeof processed[key] === 'object') {
        if (processed[key].toDate && typeof processed[key].toDate === 'function') {
          // Firestore Timestamp
          processed[key] = processed[key].toDate().toISOString();
        } else if (processed[key].seconds) {
          // Firestore Timestamp object
          processed[key] = new Date(processed[key].seconds * 1000).toISOString();
        } else if (Array.isArray(processed[key])) {
          processed[key] = processed[key].map(item => 
            typeof item === 'object' ? processTimestamps(item) : item
          );
        } else {
          processed[key] = processTimestamps(processed[key]);
        }
      }
    }
    return processed;
  };

  const updateProgress = (currentStep, steps = null) => {
    setProgressModal(prev => ({
      ...prev,
      currentStep,
      steps: steps || prev.steps
    }));
  };

  const createBackup = async (isAutomatic = false) => {
    setLoading(true);
    const steps = [
      'Exportando utilizadores...',
      'Exportando escolas...',
      'Exportando grupos...',
      'Exportando aulas...',
      'Exportando utilizadores (instrutores)...',
      'Exportando documentos...',
      'Processando dados...',
      'Guardando backup no sistema...',
      'Preparando download...',
      'Concluído!'
    ];
    
    setProgressModal({
      isOpen: true,
      title: isAutomatic ? 'Criando Backup Automático' : 'Criando Backup',
      currentStep: steps[0],
      steps,
      isComplete: false
    });

    try {
      // Step 1: Export users
      updateProgress(steps[0]);
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      const users = [];
      usersSnap.forEach(doc => {
        users.push({ id: doc.id, ...processTimestamps(doc.data()) });
      });

      // Step 2: Export schools with subcollections
      updateProgress(steps[1]);
      const schoolsRef = collection(db, 'schools');
      const schoolsSnap = await getDocs(schoolsRef);
      const schools = [];
      
      for (const schoolDoc of schoolsSnap.docs) {
        const schoolData = processTimestamps(schoolDoc.data());
        const schoolId = schoolDoc.id;
        
        // Export students
        const studentsRef = collection(db, 'schools', schoolId, 'students');
        const studentsSnap = await getDocs(studentsRef);
        const students = [];
        studentsSnap.forEach(doc => {
          students.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });
        
        // Export services
        const servicesRef = collection(db, 'schools', schoolId, 'services');
        const servicesSnap = await getDocs(servicesRef);
        const services = [];
        servicesSnap.forEach(doc => {
          services.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export materials
        const materialsRef = collection(db, 'schools', schoolId, 'materials');
        const materialsSnap = await getDocs(materialsRef);
        const materials = [];
        materialsSnap.forEach(doc => {
          materials.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export movements
        const movementsRef = collection(db, 'schools', schoolId, 'movements');
        const movementsSnap = await getDocs(movementsRef);
        const movements = [];
        movementsSnap.forEach(doc => {
          movements.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export despesas
        const despesasRef = collection(db, 'schools', schoolId, 'despesas');
        const despesasSnap = await getDocs(despesasRef);
        const despesas = [];
        despesasSnap.forEach(doc => {
          despesas.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export funcionarios
        const funcionariosRef = collection(db, 'schools', schoolId, 'funcionarios');
        const funcionariosSnap = await getDocs(funcionariosRef);
        const funcionarios = [];
        funcionariosSnap.forEach(doc => {
          funcionarios.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export servicosPrestados
        const servicosPrestadosRef = collection(db, 'schools', schoolId, 'servicosPrestados');
        const servicosPrestadosSnap = await getDocs(servicosPrestadosRef);
        const servicosPrestados = [];
        servicosPrestadosSnap.forEach(doc => {
          servicosPrestados.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        // Export materiaisPrestados
        const materiaisPrestadosRef = collection(db, 'schools', schoolId, 'materiaisPrestados');
        const materiaisPrestadosSnap = await getDocs(materiaisPrestadosRef);
        const materiaisPrestados = [];
        materiaisPrestadosSnap.forEach(doc => {
          materiaisPrestados.push({ id: doc.id, ...processTimestamps(doc.data()) });
        });

        schools.push({
          id: schoolId,
          ...schoolData,
          students,
          services,
          materials,
          movements,
          despesas,
          funcionarios,
          servicosPrestados,
          materiaisPrestados
        });
      }

      // Step 3: Export groups
      updateProgress(steps[2]);
      const groupsRef = collection(db, 'groups');
      const groupsSnap = await getDocs(groupsRef);
      const groups = [];
      groupsSnap.forEach(doc => {
        groups.push({ id: doc.id, ...processTimestamps(doc.data()) });
      });

      // Step 3.5: Export top-level collections
      updateProgress('Exportando aulas...');
      const aulasRef = collection(db, 'aulas');
      const aulasSnap = await getDocs(aulasRef);
      const aulas = [];
      aulasSnap.forEach(doc => {
        aulas.push({ id: doc.id, ...processTimestamps(doc.data()) });
      });

      updateProgress('Exportando utilizadores...');
      const utilizadoresRef = collection(db, 'utilizadores');
      const utilizadoresSnap = await getDocs(utilizadoresRef);
      const utilizadores = [];
      utilizadoresSnap.forEach(doc => {
        utilizadores.push({ id: doc.id, ...processTimestamps(doc.data()) });
      });

      updateProgress('Exportando documentos...');
      const documentosRef = collection(db, 'documentos');
      const documentosSnap = await getDocs(documentosRef);
      const documentos = [];
      documentosSnap.forEach(doc => {
        documentos.push({ id: doc.id, ...processTimestamps(doc.data()) });
      });

      // Step 4: Process data
      updateProgress(steps[3]);
      const data = { users, schools, groups, aulas, utilizadores, documentos };
      const createdAt = new Date();
      
      const backupData = {
        data,
        createdAt: createdAt.toISOString(),
        isAutomatic,
        version: '1.0'
      };

      // Step 5: Save backup to Firestore (dividido em chunks se necessário)
      updateProgress(steps[4]);
      const backupRef = doc(collection(db, 'backups'));
      const backupId = backupRef.id;
      
      // Converter para JSON para calcular tamanho
      const jsonString = JSON.stringify(backupData);
      const sizeInBytes = new Blob([jsonString]).size;
      const maxChunkSize = 900000; // 900KB por chunk (margem de segurança)
      
      if (sizeInBytes > maxChunkSize) {
        // Dividir em chunks
        const chunks = [];
        const chunkSize = maxChunkSize;
        let offset = 0;
        let chunkIndex = 0;
        
        while (offset < jsonString.length) {
          const chunk = jsonString.substring(offset, offset + chunkSize);
          chunks.push(chunk);
          offset += chunkSize;
          chunkIndex++;
        }
        
        // Guardar metadados do backup
        await setDoc(backupRef, {
          createdAt: createdAt,
          isAutomatic,
          version: '1.0',
          totalChunks: chunks.length,
          totalSize: sizeInBytes,
          chunked: true
        });
        
        // Guardar cada chunk como subcoleção
        const chunksRef = collection(db, 'backups', backupId, 'chunks');
        for (let i = 0; i < chunks.length; i++) {
          const chunkRef = doc(chunksRef);
          await setDoc(chunkRef, {
            index: i,
            data: chunks[i],
            createdAt: createdAt
          });
        }
      } else {
        // Guardar normalmente se couber num único documento
        await setDoc(backupRef, {
          ...backupData,
          createdAt: createdAt,
          chunked: false
        });
      }

      // Update last auto backup time if automatic
      if (isAutomatic) {
        const lastBackupRef = doc(db, 'system', 'lastAutoBackup');
        await setDoc(lastBackupRef, {
          timestamp: createdAt
        });
      }

      // Step 6: Download file (Base64 encoded)
      updateProgress(steps[8]);
      const jsonString = JSON.stringify(backupData, null, 2);
      // Encode to Base64 for simple encryption
      const base64Encoded = btoa(unescape(encodeURIComponent(jsonString)));
      const blob = new Blob([base64Encoded], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${createdAt.toISOString().replace(/:/g, '-')}.txt`; // Changed to .txt since it's encoded
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Step 7: Complete
      updateProgress(steps[9]);
      setProgressModal(prev => ({ ...prev, isComplete: true }));
      
      setTimeout(() => {
        setProgressModal({ isOpen: false, title: '', currentStep: '', steps: [], isComplete: false });
        showMessage('success', `Backup ${isAutomatic ? 'automático' : ''} criado com sucesso!`);
        fetchBackups();
      }, 1500);
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      setProgressModal({ isOpen: false, title: '', currentStep: '', steps: [], isComplete: false });
      showMessage('error', 'Erro ao criar backup. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let fileContent = e.target.result;
        
        // Try to decode from Base64 (simple encryption)
        try {
          // Check if it looks like Base64 (no special JSON characters at start)
          if (!fileContent.trim().startsWith('{')) {
            // Decode from Base64
            fileContent = decodeURIComponent(escape(atob(fileContent)));
          }
        } catch (decodeError) {
          // If Base64 decode fails, try parsing as plain JSON (backward compatibility)
          console.log('Tentando como JSON não codificado...');
        }
        
        const backupData = JSON.parse(fileContent);
        await restoreBackup(backupData);
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        showMessage('error', 'Erro ao ler arquivo de backup. Verifique se o arquivo é válido e está codificado em Base64.');
      }
    };
    reader.readAsText(file);
  };

  const restoreBackup = async (backupData, backupId = null) => {
    if (!window.confirm('Tem certeza que deseja restaurar este backup? Esta ação irá substituir todos os dados atuais. Esta operação não pode ser desfeita!')) {
      return;
    }

    setLoading(true);
    const steps = [
      'Processando backup...',
      'Restaurando utilizadores...',
      'Restaurando grupos...',
      'Restaurando escolas...',
      'Restaurando alunos...',
      'Restaurando instrutores...',
      'Restaurando serviços...',
      'Restaurando materiais...',
      'Restaurando aulas...',
      'Finalizando restauração...',
      'Concluído!'
    ];
    
    setProgressModal({
      isOpen: true,
      title: 'Restaurando Backup',
      currentStep: steps[0],
      steps,
      isComplete: false
    });

    try {
      const { data } = backupData;

      // Step 1: Process backup
      updateProgress(steps[0]);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 2: Restore Users
      updateProgress(steps[1]);
      for (const user of data.users || []) {
        const { id, ...userData } = user;
        const userRef = doc(db, 'users', id);
        await setDoc(userRef, restoreTimestamps(userData), { merge: true });
      }

      // Step 3: Restore Groups
      updateProgress(steps[2]);
      for (const group of data.groups || []) {
        const { id, ...groupData } = group;
        const groupRef = doc(db, 'groups', id);
        await setDoc(groupRef, restoreTimestamps(groupData), { merge: true });
      }

      // Step 4-9: Restore Schools with subcollections
      updateProgress(steps[3]);
      let currentSchool = 0;

      for (const school of data.schools || []) {
        const { 
          id, 
          students = [], 
          services = [], 
          materials = [], 
          movements = [],
          despesas = [],
          funcionarios = [],
          servicosPrestados = [],
          materiaisPrestados = [],
          ...schoolData 
        } = school;
        const schoolRef = doc(db, 'schools', id);
        await setDoc(schoolRef, restoreTimestamps(schoolData), { merge: true });

        // Step 5: Restore Students
        if (currentSchool === 0) updateProgress(steps[4]);
        for (const student of students) {
          const { id: studentId, ...studentData } = student;
          const studentRef = doc(db, 'schools', id, 'students', studentId);
          await setDoc(studentRef, restoreTimestamps(studentData), { merge: true });
        }

        // Step 6: Restore Services
        if (currentSchool === 0) updateProgress(steps[5]);
        for (const service of services) {
          const { id: serviceId, ...serviceData } = service;
          const serviceRef = doc(db, 'schools', id, 'services', serviceId);
          await setDoc(serviceRef, restoreTimestamps(serviceData), { merge: true });
        }

        // Step 7: Restore Materials
        if (currentSchool === 0) updateProgress(steps[6]);
        for (const material of materials) {
          const { id: materialId, ...materialData } = material;
          const materialRef = doc(db, 'schools', id, 'materials', materialId);
          await setDoc(materialRef, restoreTimestamps(materialData), { merge: true });
        }

        // Step 8: Restore Movements
        if (currentSchool === 0) updateProgress('Restaurando movimentos...');
        for (const movement of movements) {
          const { id: movementId, ...movementData } = movement;
          const movementRef = doc(db, 'schools', id, 'movements', movementId);
          await setDoc(movementRef, restoreTimestamps(movementData), { merge: true });
        }

        // Step 9: Restore Despesas
        if (currentSchool === 0) updateProgress('Restaurando despesas...');
        for (const despesa of despesas) {
          const { id: despesaId, ...despesaData } = despesa;
          const despesaRef = doc(db, 'schools', id, 'despesas', despesaId);
          await setDoc(despesaRef, restoreTimestamps(despesaData), { merge: true });
        }

        // Step 10: Restore Funcionarios
        if (currentSchool === 0) updateProgress('Restaurando funcionários...');
        for (const funcionario of funcionarios) {
          const { id: funcionarioId, ...funcionarioData } = funcionario;
          const funcionarioRef = doc(db, 'schools', id, 'funcionarios', funcionarioId);
          await setDoc(funcionarioRef, restoreTimestamps(funcionarioData), { merge: true });
        }

        // Step 11: Restore ServicosPrestados
        if (currentSchool === 0) updateProgress('Restaurando serviços prestados...');
        for (const servicoPrestado of servicosPrestados) {
          const { id: servicoPrestadoId, ...servicoPrestadoData } = servicoPrestado;
          const servicoPrestadoRef = doc(db, 'schools', id, 'servicosPrestados', servicoPrestadoId);
          await setDoc(servicoPrestadoRef, restoreTimestamps(servicoPrestadoData), { merge: true });
        }

        // Step 12: Restore MateriaisPrestados
        if (currentSchool === 0) updateProgress('Restaurando materiais prestados...');
        for (const materialPrestado of materiaisPrestados) {
          const { id: materialPrestadoId, ...materialPrestadoData } = materialPrestado;
          const materialPrestadoRef = doc(db, 'schools', id, 'materiaisPrestados', materialPrestadoId);
          await setDoc(materialPrestadoRef, restoreTimestamps(materialPrestadoData), { merge: true });
        }

        currentSchool++;
      }

      // Step 13: Restore top-level collections
      updateProgress('Restaurando aulas...');
      for (const aula of data.aulas || []) {
        const { id: aulaId, ...aulaData } = aula;
        const aulaRef = doc(db, 'aulas', aulaId);
        await setDoc(aulaRef, restoreTimestamps(aulaData), { merge: true });
      }

      updateProgress('Restaurando utilizadores (instrutores)...');
      for (const utilizador of data.utilizadores || []) {
        const { id: utilizadorId, ...utilizadorData } = utilizador;
        const utilizadorRef = doc(db, 'utilizadores', utilizadorId);
        await setDoc(utilizadorRef, restoreTimestamps(utilizadorData), { merge: true });
      }

      updateProgress('Restaurando documentos...');
      for (const documento of data.documentos || []) {
        const { id: documentoId, ...documentoData } = documento;
        const documentoRef = doc(db, 'documentos', documentoId);
        await setDoc(documentoRef, restoreTimestamps(documentoData), { merge: true });
      }

      // Step 14: Finalize
      updateProgress(steps[9]);
      
      // If restoring from Firestore backup, mark it as used
      if (backupId) {
        const backupRef = doc(db, 'backups', backupId);
        await setDoc(backupRef, { restoredAt: new Date() }, { merge: true });
      }

      // Step 11: Complete
      updateProgress(steps[10]);
      setProgressModal(prev => ({ ...prev, isComplete: true }));
      
      setTimeout(() => {
        showMessage('success', 'Backup restaurado com sucesso!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 1500);
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      setProgressModal({ isOpen: false, title: '', currentStep: '', steps: [], isComplete: false });
      showMessage('error', 'Erro ao restaurar backup. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const restoreTimestamps = (obj) => {
    const restored = { ...obj };
    for (const key in restored) {
      if (typeof restored[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(restored[key])) {
        // ISO string to Firestore Timestamp
        const timestamp = new Date(restored[key]);
        if (!isNaN(timestamp.getTime())) {
          restored[key] = timestamp;
        }
      } else if (Array.isArray(restored[key])) {
        restored[key] = restored[key].map(item => 
          typeof item === 'object' ? restoreTimestamps(item) : item
        );
      } else if (typeof restored[key] === 'object' && restored[key] !== null) {
        restored[key] = restoreTimestamps(restored[key]);
      }
    }
    return restored;
  };

  const convertFirestoreData = (data) => {
    const converted = { ...data };
    
    // Convert createdAt timestamp
    if (converted.createdAt) {
      if (converted.createdAt.toDate && typeof converted.createdAt.toDate === 'function') {
        converted.createdAt = converted.createdAt.toDate().toISOString();
      } else if (converted.createdAt.seconds) {
        converted.createdAt = new Date(converted.createdAt.seconds * 1000).toISOString();
      }
    }
    
    // Recursively process data object
    if (converted.data) {
      converted.data = processTimestamps(converted.data);
    }
    
    return converted;
  };

  const handleRestoreFromList = async (backupId) => {
    try {
      const backupRef = doc(db, 'backups', backupId);
      const backupSnap = await getDoc(backupRef);
      
      if (!backupSnap.exists()) {
        showMessage('error', 'Backup não encontrado');
        return;
      }

      const backupDoc = backupSnap.data();
      let backupData;

      // Verificar se o backup está dividido em chunks
      if (backupDoc.chunked && backupDoc.totalChunks) {
        // Reconstruir backup a partir dos chunks
        const chunksRef = collection(db, 'backups', backupId, 'chunks');
        const chunksSnap = await getDocs(chunksRef);
        
        const chunks = [];
        chunksSnap.forEach(doc => {
          chunks.push({ index: doc.data().index, data: doc.data().data });
        });
        
        // Ordenar chunks por índice
        chunks.sort((a, b) => a.index - b.index);
        
        // Juntar todos os chunks
        const jsonString = chunks.map(chunk => chunk.data).join('');
        backupData = JSON.parse(jsonString);
      } else {
        // Backup normal (não chunked)
        backupData = convertFirestoreData(backupDoc);
      }

      await restoreBackup(backupData, backupId);
    } catch (error) {
      console.error('Erro ao restaurar backup da lista:', error);
      showMessage('error', 'Erro ao restaurar backup');
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Tem certeza que deseja excluir este backup?')) {
      return;
    }

    try {
      // Verificar se o backup tem chunks
      const backupRef = doc(db, 'backups', backupId);
      const backupSnap = await getDoc(backupRef);
      
      if (backupSnap.exists() && backupSnap.data().chunked) {
        // Deletar todos os chunks primeiro
        const chunksRef = collection(db, 'backups', backupId, 'chunks');
        const chunksSnap = await getDocs(chunksRef);
        
        for (const chunkDoc of chunksSnap.docs) {
          await deleteDoc(doc(db, 'backups', backupId, 'chunks', chunkDoc.id));
        }
      }
      
      // Deletar o documento principal do backup
      await deleteDoc(backupRef);
      showMessage('success', 'Backup excluído com sucesso');
      fetchBackups();
    } catch (error) {
      console.error('Erro ao excluir backup:', error);
      showMessage('error', 'Erro ao excluir backup');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    let dateObj;
    if (date.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    return dateObj.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="backup-page">
      <button className="backup-back-button" onClick={() => navigate('/')}>
        ← Voltar
      </button>
      
      <div className="backup-header">
        <h1>💾 Backup e Restauração</h1>
        <p>Gerencie cópias de segurança do sistema</p>
      </div>

      {message.text && (
        <div className={`backup-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="backup-actions">
        <div className="backup-action-card">
          <h2>📥 Criar Backup</h2>
          <p>Cria uma cópia de segurança completa do sistema</p>
          <button 
            className="backup-btn-primary" 
            onClick={() => createBackup(false)}
            disabled={loading}
          >
            {loading ? '⏳ Criando...' : '💾 Criar Backup'}
          </button>
        </div>

        <div className="backup-action-card">
          <h2>📤 Restaurar Backup</h2>
          <p>Restaura dados a partir de um arquivo de backup</p>
          <label className="backup-upload-btn">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={loading}
              style={{ display: 'none' }}
            />
            📂 Escolher Arquivo
          </label>
        </div>
      </div>

      <div className="backup-section">
        <h2>📋 Histórico de Backups</h2>
        <div className="backups-list">
          {backups.length === 0 ? (
            <div className="backup-empty">Nenhum backup encontrado</div>
          ) : (
            backups.map(backup => (
              <div key={backup.id} className="backup-item">
                <div className="backup-item-info">
                  <div className="backup-item-header">
                    <span className="backup-item-date">
                      {formatDate(backup.createdAt)}
                    </span>
                    {backup.isAutomatic && (
                      <span className="backup-auto-badge">Automático</span>
                    )}
                  </div>
                  <div className="backup-item-actions">
                    <button
                      className="backup-btn-restore"
                      onClick={() => handleRestoreFromList(backup.id)}
                      disabled={loading}
                    >
                      🔄 Restaurar
                    </button>
                    <button
                      className="backup-btn-download"
                      onClick={async () => {
                        const convertedBackup = convertFirestoreData(backup);
                        const backupData = {
                          data: convertedBackup.data,
                          createdAt: convertedBackup.createdAt,
                          isAutomatic: convertedBackup.isAutomatic,
                          version: convertedBackup.version || '1.0'
                        };
                        // Encode to Base64 for simple encryption
                        const jsonString = JSON.stringify(backupData, null, 2);
                        const base64Encoded = btoa(unescape(encodeURIComponent(jsonString)));
                        const blob = new Blob([base64Encoded], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `backup-${formatDate(backup.createdAt).replace(/[\/\s:]/g, '-')}.txt`; // Changed to .txt since it's encoded
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      disabled={loading}
                    >
                      💾 Download
                    </button>
                    <button
                      className="backup-btn-delete"
                      onClick={() => handleDeleteBackup(backup.id)}
                      disabled={loading}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Progress Modal */}
      {progressModal.isOpen && (
        <div className="backup-progress-modal-overlay">
          <div className="backup-progress-modal">
            <h2>{progressModal.title}</h2>
            <div className="backup-progress-content">
              <div className="backup-progress-icon">
                {progressModal.isComplete ? '✅' : '⏳'}
              </div>
              <div className="backup-progress-text">
                {progressModal.currentStep}
              </div>
              <div className="backup-progress-steps">
                {progressModal.steps.map((step, index) => {
                  const currentIndex = progressModal.steps.indexOf(progressModal.currentStep);
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  
                  return (
                    <div 
                      key={index} 
                      className={`backup-progress-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                      <span className="backup-step-icon">
                        {isCompleted ? '✓' : isCurrent ? '⟳' : '○'}
                      </span>
                      <span className="backup-step-text">{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Backup;

