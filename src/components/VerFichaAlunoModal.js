import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, updateDoc, collection, query, orderBy, getDocs, addDoc, getDoc, where, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import PagamentoModal from './PagamentoModal';
import GerarContratoModal from './GerarContratoModal';
import { formatPrice, formatDate } from '../utils/formatters';
import './VerFichaAlunoModal.css';

const VerFichaAlunoModal = ({ isOpen, onClose, aluno, escolaId, onSuccess, onAlunoUpdate, readOnly = false, userRole }) => {
  const { userData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    nif: '',
    cc: '',
    enrollmentDate: '',
    enrollmentNumber: '',
    licenseIssueDate: '',
    licenseExpiryDate: '',
    theoreticalExamDate: '',
    theoreticalExamResult: '',
    practicalExamDate: '',
    practicalExamResult: '',
    observations: ''
  });
  const [servicos, setServicos] = useState([]);
  const [servicosAtivos, setServicosAtivos] = useState([]);
  const [showAddServico, setShowAddServico] = useState(false);
  const [selectedServico, setSelectedServico] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [materiais, setMateriais] = useState([]);
  const [materiaisComprados, setMateriaisComprados] = useState([]);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantidadeMaterial, setQuantidadeMaterial] = useState(1);
  const [lastMaterialOperation, setLastMaterialOperation] = useState(null); // Track last operation for rollback
  const [showRemoveServico, setShowRemoveServico] = useState(false);
  const [showRemoveMaterial, setShowRemoveMaterial] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [quantidadeToRemove, setQuantidadeToRemove] = useState(1);
  const [showPagamento, setShowPagamento] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [filtroAulas, setFiltroAulas] = useState('todas'); // 'todas', 'teorica', 'pratica'
  const [showCancelarAula, setShowCancelarAula] = useState(false);
  const [aulaParaCancelar, setAulaParaCancelar] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'servicos', 'materiais', 'pagamentos', 'aulas'
  // Cache para evitar leituras desnecessárias
  const [servicosCache, setServicosCache] = useState(null);
  const [materiaisCache, setMateriaisCache] = useState(null);
  const [cacheEscolaId, setCacheEscolaId] = useState(null);
  // Estado local para pagamentos - CRÍTICO para atualização imediata
  const [pagamentosLocal, setPagamentosLocal] = useState(null);
  const [showGerarContrato, setShowGerarContrato] = useState(false);

  // Função para buscar aulas do aluno - com fallback para query directa
  const fetchAulasAluno = async () => {
    try {
      if (!aluno?.id || !escolaId) return;

      const aulasMap = new Map();

      // 1. Buscar pelos IDs no documento do aluno (via rápida)
      const aulasIds = aluno.aulas || [];
      if (aulasIds.length > 0) {
        const aulasPromises = aulasIds.map(async (aulaId) => {
          try {
            const aulaRef = doc(db, 'aulas', aulaId);
            const aulaSnap = await getDoc(aulaRef);
            if (aulaSnap.exists()) {
              return { id: aulaSnap.id, ...aulaSnap.data() };
            }
            return null;
          } catch (error) {
            return null;
          }
        });

        const results = await Promise.all(aulasPromises);
        results.forEach(aula => {
          if (aula && aula.alunos && aula.alunos.some(a => a.id === aluno.id)) {
            aulasMap.set(aula.id, aula);
          }
        });
      }

      // 2. Fallback: query à coleção de aulas por escolaId e filtrar pelo aluno
      // Isto garante que aulas que não estejam no array do aluno também aparecem
      try {
        const aulasRef = collection(db, 'aulas');
        const q = query(aulasRef, where('escolaId', '==', escolaId));
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
          if (aulasMap.has(docSnap.id)) return; // Já temos esta
          const aulaData = { id: docSnap.id, ...docSnap.data() };
          if (aulaData.alunos && aulaData.alunos.some(a => a.id === aluno.id)) {
            aulasMap.set(aulaData.id, aulaData);
          }
        });
      } catch (err) {
        console.error('Erro no fallback de aulas:', err);
      }

      const aulasData = Array.from(aulasMap.values());

      // Ordenar por data (mais recentes primeiro)
      aulasData.sort((a, b) => {
        const fullA = (a.data || '') + 'T' + (a.hora || '');
        const fullB = (b.data || '') + 'T' + (b.hora || '');
        return fullB.localeCompare(fullA);
      });

      setAulas(aulasData);
    } catch (error) {
      console.error('Erro ao buscar aulas do aluno:', error);
    }
  };

  // Função para remover aluno da aula (ou cancelar se for o último)
  const handleCancelarAula = async () => {
    if (!aulaParaCancelar || !aluno) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const aulaRef = doc(db, 'aulas', aulaParaCancelar.id);
      const aulaDoc = await getDoc(aulaRef);
      
      if (!aulaDoc.exists()) {
        setError('Aula não encontrada.');
        return;
      }
      
      const aulaData = aulaDoc.data();
      const alunosNaAula = aulaData.alunos || [];
      const isAulaRealizada = aulaParaCancelar.status === 'realizada';
      
      // Verificar se há mais de um aluno na aula
      if (alunosNaAula.length > 1) {
        // Remover apenas este aluno da lista de alunos da aula
        const alunosAtualizados = alunosNaAula.filter(
          alunoAula => alunoAula.id !== aluno.id
        );
        
        await updateDoc(aulaRef, {
          alunos: alunosAtualizados,
          updatedAt: Timestamp.now()
        });
        
        // Remover referência da aula do aluno
        const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
        await updateDoc(alunoRef, {
          aulas: arrayRemove(aulaParaCancelar.id),
          updatedAt: Timestamp.now()
        });
        
        // Remover referência da aula do instrutor (se existir)
        if (aulaData.instrutorId) {
          try {
            const instrutorRef = doc(db, 'utilizadores', aulaData.instrutorId);
            await updateDoc(instrutorRef, {
              aulas: arrayRemove(aulaParaCancelar.id),
              updatedAt: Timestamp.now()
            });
          } catch (error) {
            console.error('Erro ao remover aula do instrutor:', error);
            // Não falha a operação se não conseguir atualizar o instrutor
          }
        }
        
        const mensagem = isAulaRealizada 
          ? 'Participação do aluno removida da aula realizada com sucesso! A aula continua registada para os outros alunos.'
          : 'Aluno removido da aula com sucesso! A aula continua agendada para os outros alunos.';
        alert(mensagem);
      } else {
        // Se for o último aluno, remover a aula completamente
        // Para aulas realizadas, apenas remover referências (não mudar status)
        if (!isAulaRealizada) {
          await updateDoc(aulaRef, {
            status: 'cancelada',
            updatedAt: Timestamp.now()
          });
        }
        
        // Remover referência da aula do aluno
        const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
        await updateDoc(alunoRef, {
          aulas: arrayRemove(aulaParaCancelar.id),
          updatedAt: Timestamp.now()
        });
        
        // Remover referência da aula do instrutor (se existir)
        if (aulaData.instrutorId) {
          try {
            const instrutorRef = doc(db, 'utilizadores', aulaData.instrutorId);
            await updateDoc(instrutorRef, {
              aulas: arrayRemove(aulaParaCancelar.id),
              updatedAt: Timestamp.now()
            });
          } catch (error) {
            console.error('Erro ao remover aula do instrutor:', error);
            // Não falha a operação se não conseguir atualizar o instrutor
          }
        }
        
        // Se for o último aluno e a aula não for realizada, pode remover completamente
        if (!isAulaRealizada) {
          // Opcional: remover a aula completamente se não houver mais alunos
          // Por agora, apenas marcamos como cancelada
        }
        
        const mensagem = isAulaRealizada
          ? 'Participação do aluno removida da aula realizada com sucesso! (Era o último aluno na aula)'
          : 'Aula cancelada com sucesso! (Era o último aluno na aula)';
        alert(mensagem);
      }
      
      // Atualizar a lista de aulas
      await fetchAulasAluno();
      
      setShowCancelarAula(false);
      setAulaParaCancelar(null);
    } catch (error) {
      console.error('Erro ao cancelar/remover aluno da aula:', error);
      setError('Erro ao processar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Inicializar dados quando o aluno muda (por ID)
  useEffect(() => {
    if (aluno?.id) {
      setFormData({
        name: aluno.name || '',
        email: aluno.email || '',
        address: aluno.address || '',
        phone: aluno.phone || '',
        nif: aluno.nif || '',
        cc: aluno.cc || '',
        enrollmentDate: aluno.enrollmentDate || '',
        enrollmentNumber: aluno.enrollmentNumber || '',
        licenseIssueDate: aluno.licenseIssueDate || '',
        licenseExpiryDate: aluno.licenseExpiryDate || '',
        theoreticalExamDate: aluno.theoreticalExamDate || '',
        theoreticalExamResult: aluno.theoreticalExamResult || '',
        practicalExamDate: aluno.practicalExamDate || '',
        practicalExamResult: aluno.practicalExamResult || '',
        observations: aluno.observations || ''
      });
      setServicosAtivos(aluno.services || aluno.servicosAtivos || []);
      setMateriaisComprados(aluno.materials || aluno.materiaisComprados || []);
      // CRÍTICO: Atualizar pagamentos locais quando aluno muda
      setPagamentosLocal(aluno.pagamentos || null);
    }
  }, [aluno?.id]); // Apenas quando o ID do aluno muda

  // OTIMIZADO: Atualizar quando aluno ou pagamentos mudam
  // Adicionar pagamentos como dependência para atualizar quando pagamento é adicionado
  useEffect(() => {
    if (aluno) {
      setFormData(prev => ({
        ...prev,
        name: aluno.name || prev.name,
        email: aluno.email || prev.email,
        address: aluno.address || prev.address,
        phone: aluno.phone || prev.phone,
        nif: aluno.nif || prev.nif,
        cc: aluno.cc || prev.cc,
        enrollmentDate: aluno.enrollmentDate || prev.enrollmentDate,
        enrollmentNumber: aluno.enrollmentNumber || prev.enrollmentNumber,
        licenseIssueDate: aluno.licenseIssueDate || prev.licenseIssueDate,
        licenseExpiryDate: aluno.licenseExpiryDate || prev.licenseExpiryDate,
        theoreticalExamDate: aluno.theoreticalExamDate !== undefined ? (aluno.theoreticalExamDate || '') : prev.theoreticalExamDate,
        theoreticalExamResult: aluno.theoreticalExamResult !== undefined ? (aluno.theoreticalExamResult || '') : prev.theoreticalExamResult,
        practicalExamDate: aluno.practicalExamDate !== undefined ? (aluno.practicalExamDate || '') : prev.practicalExamDate,
        practicalExamResult: aluno.practicalExamResult !== undefined ? (aluno.practicalExamResult || '') : prev.practicalExamResult,
        observations: aluno.observations !== undefined ? aluno.observations : prev.observations
      }));
      // Só atualizar se realmente mudou (evitar re-renders)
      if (JSON.stringify(aluno.services || aluno.servicosAtivos || []) !== JSON.stringify(servicosAtivos)) {
        setServicosAtivos(aluno.services || aluno.servicosAtivos || []);
      }
      if (JSON.stringify(aluno.materials || aluno.materiaisComprados || []) !== JSON.stringify(materiaisComprados)) {
        setMateriaisComprados(aluno.materials || aluno.materiaisComprados || []);
      }
      // CRÍTICO: Atualizar pagamentos locais quando aluno.pagamentos muda
      if (aluno.pagamentos && JSON.stringify(aluno.pagamentos) !== JSON.stringify(pagamentosLocal)) {
        setPagamentosLocal(aluno.pagamentos);
      }
    }
  }, [aluno?.name, aluno?.email, aluno?.address, aluno?.phone, aluno?.nif, aluno?.cc, aluno?.enrollmentDate, aluno?.enrollmentNumber, aluno?.licenseIssueDate, aluno?.licenseExpiryDate, aluno?.theoreticalExamDate, aluno?.theoreticalExamResult, aluno?.practicalExamDate, aluno?.practicalExamResult, aluno?.observations, aluno?.pagamentos, aluno?.services, aluno?.servicosAtivos, aluno?.materials, aluno?.materiaisComprados]);

  // Efeito para buscar aulas quando o modal abrir
  useEffect(() => {
    if (isOpen && aluno?.id) {
      fetchAulasAluno();
    }
  }, [isOpen, aluno?.id]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);


  useEffect(() => {
    if (escolaId && escolaId !== cacheEscolaId) {
      // Só buscar se mudou a escola ou ainda não temos cache
      fetchServicos();
      fetchMateriais();
      setCacheEscolaId(escolaId);
    } else if (escolaId === cacheEscolaId && servicosCache && materiaisCache) {
      // Usar cache se já temos os dados
      setServicos(servicosCache);
      setMateriais(materiaisCache);
    }
  }, [escolaId, cacheEscolaId, servicosCache, materiaisCache]);

  const fetchServicos = async () => {
    try {
      const servicosRef = collection(db, 'schools', escolaId, 'services');
      const q = query(servicosRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const servicosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setServicos(servicosData);
      setServicosCache(servicosData); // Guardar em cache
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
    }
  };

  const fetchMateriais = async () => {
    try {
      const materiaisRef = collection(db, 'schools', escolaId, 'materials');
      const q = query(materiaisRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const materiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMateriais(materiaisData);
      setMateriaisCache(materiaisData); // Guardar em cache
    } catch (err) {
      console.error('Erro ao buscar materiais:', err);
    }
  };

  const registrarMovimento = async (tipo, descricao, valor, tipoOperacao, quantidade = 1) => {
    try {
      const movementsRef = collection(db, 'schools', escolaId, 'movements');
      const movimento = {
        tipo: tipo, // 'servico' ou 'material'
        descricao: descricao,
        valor: valor, // Valor positivo para dívidas
        quantidade: quantidade,
        tipoOperacao: tipoOperacao,
        data: Timestamp.now(),
        alunoId: aluno.id,
        alunoName: aluno.name,
        createdBy: userData?.name || 'Desconhecido',
        createdByUserId: userData?.id || null,
        createdAt: Timestamp.now()
      };

      await addDoc(movementsRef, movimento);
    } catch (err) {
      console.error('Erro ao registrar movimento:', err);
      // Não falhar a operação principal por causa do movimento
    }
  };

  const handleOpenPagamento = () => {
    setShowPagamento(true);
  };

  const handlePayInstallment = (pagamento) => {
    // Marcar que é um pagamento de prestação específica
    setSelectedInstallment(pagamento);
    setShowPagamento(true);
  };

  const refreshAlunoData = async () => {
    try {
      if (!aluno?.id || !escolaId) return;
      
      console.log('🔄 Recarregando dados do aluno:', aluno.id);
      
      // Buscar dados atualizados do aluno do Firebase
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      const alunoSnapshot = await getDoc(alunoRef);
      
      if (alunoSnapshot.exists()) {
        const dadosAtualizados = { id: alunoSnapshot.id, ...alunoSnapshot.data() };
        console.log('✅ Dados do aluno atualizados:', dadosAtualizados);
        console.log('📊 Pagamentos atualizados:', dadosAtualizados.pagamentos?.length || 0);
        
        // Atualizar estados locais
        setServicosAtivos(dadosAtualizados.services || dadosAtualizados.servicosAtivos || []);
        setMateriaisComprados(dadosAtualizados.materials || dadosAtualizados.materiaisComprados || []);
        // Só atualizar pagamentos do Firebase se tiver dados mais recentes (mais pagamentos)
        // para não sobrescrever updates optimistas com dados antigos
        const fetchedPagamentos = dadosAtualizados.pagamentos || [];
        setPagamentosLocal(prev => {
          const prevCount = prev ? prev.length : 0;
          if (fetchedPagamentos.length >= prevCount) {
            return fetchedPagamentos.length > 0 ? fetchedPagamentos : null;
          }
          return prev; // Manter dados locais se tiverem mais pagamentos (update optimista)
        });
        
        // Atualizar formData se necessário
        setFormData(prev => ({
          ...prev,
          name: dadosAtualizados.name || prev.name,
          email: dadosAtualizados.email || prev.email,
          address: dadosAtualizados.address || prev.address,
          phone: dadosAtualizados.phone || prev.phone,
          nif: dadosAtualizados.nif || prev.nif,
          cc: dadosAtualizados.cc || prev.cc,
          enrollmentDate: dadosAtualizados.enrollmentDate || prev.enrollmentDate,
          enrollmentNumber: dadosAtualizados.enrollmentNumber || prev.enrollmentNumber,
          licenseIssueDate: dadosAtualizados.licenseIssueDate || prev.licenseIssueDate,
          licenseExpiryDate: dadosAtualizados.licenseExpiryDate || prev.licenseExpiryDate,
          theoreticalExamDate: dadosAtualizados.theoreticalExamDate !== undefined ? (dadosAtualizados.theoreticalExamDate || '') : prev.theoreticalExamDate,
          theoreticalExamResult: dadosAtualizados.theoreticalExamResult !== undefined ? (dadosAtualizados.theoreticalExamResult || '') : prev.theoreticalExamResult,
          practicalExamDate: dadosAtualizados.practicalExamDate !== undefined ? (dadosAtualizados.practicalExamDate || '') : prev.practicalExamDate,
          practicalExamResult: dadosAtualizados.practicalExamResult !== undefined ? (dadosAtualizados.practicalExamResult || '') : prev.practicalExamResult,
          observations: dadosAtualizados.observations !== undefined ? dadosAtualizados.observations : prev.observations
        }));
        
        // Atualizar o objeto aluno através da callback do componente pai
        // Isso é crítico para atualizar o prop aluno no componente pai
        if (onAlunoUpdate) {
          onAlunoUpdate(dadosAtualizados);
        }
        
        // Retornar os dados atualizados para uso imediato
        return dadosAtualizados;
      } else {
        console.error('❌ Aluno não encontrado no Firebase');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar dados do aluno:', error);
      return null;
    }
  };

  const handleClosePagamento = () => {
    setShowPagamento(false);
    setSelectedInstallment(null);
  };

  const handlePagamentoSuccess = async (pagamentosFinais) => {
    // Fechar modal de pagamento
    setShowPagamento(false);
    setSelectedInstallment(null);

    // CRÍTICO: Se recebemos os pagamentos atualizados diretamente do PagamentoModal,
    // atualizar a UI imediatamente sem esperar pelo Firebase
    if (pagamentosFinais && Array.isArray(pagamentosFinais)) {
      console.log('✅ Pagamentos atualizados na UI (direto):', pagamentosFinais.length);
      setPagamentosLocal(pagamentosFinais);

      // Atualizar o objeto aluno no componente pai para manter tudo sincronizado
      if (onAlunoUpdate) {
        onAlunoUpdate({ ...aluno, pagamentos: pagamentosFinais });
      }
    }

    // Recarregar dados do Firebase em background com delay para garantir que o Firestore propagou
    setTimeout(() => refreshAlunoData(), 2000);

    // Notificar o componente pai
    if (onSuccess) {
      onSuccess();
    }
  };

  // Usar pagamentos locais se disponível, senão usar do aluno
  const pagamentosAtuais = pagamentosLocal !== null ? pagamentosLocal : (aluno?.pagamentos || []);

  // Memoizar cálculos pesados para evitar recálculos desnecessários
  const totalServicos = useMemo(() => {
    return servicosAtivos.reduce((total, servico) => {
      return total + (servico.servicoPrice * servico.quantity);
    }, 0);
  }, [servicosAtivos]);

  const totalMateriais = useMemo(() => {
    return materiaisComprados.reduce((total, material) => {
      return total + (material.materialPrice * material.quantity);
    }, 0);
  }, [materiaisComprados]);

  const totalPagamentos = useMemo(() => {
    return pagamentosAtuais.reduce((total, pagamento) => {
      const tipo = pagamento.tipo || pagamento.type;
      
      // Pagamentos do tipo "pagamento" não têm "isPago", apenas "valor"
      if (tipo === 'pagamento' && pagamento.valor) {
        return total + parseFloat(pagamento.valor);
      }
      
      // Pagamentos do tipo "pronto" usam "value" e são contados automaticamente como pagos
      if (tipo === 'pronto' && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }
      
      // Outros tipos: "value" só conta se "isPago" é true
      if (pagamento.isPago === true && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }
      
      return total;
    }, 0);
  }, [pagamentosAtuais]);

  const totalEmDivida = useMemo(() => {
    return (totalServicos + totalMateriais) - totalPagamentos;
  }, [totalServicos, totalMateriais, totalPagamentos]);

  const prestacoesPorPagar = useMemo(() => {
    if (!pagamentosAtuais || !pagamentosAtuais.length) return 0;
    
    return pagamentosAtuais.reduce((total, pagamento) => {
      if (pagamento.type === 'prestacao' && !pagamento.isPago) {
        return total + (pagamento.valorPrestacao || pagamento.value || 0);
      }
      return total;
    }, 0);
  }, [pagamentosAtuais]);

  const prestacoesEmAtraso = useMemo(() => {
    if (!pagamentosAtuais || !pagamentosAtuais.length) return 0;
    
    const hoje = new Date();
    return pagamentosAtuais.reduce((total, pagamento) => {
      if (pagamento.type === 'prestacao' && !pagamento.isPago) {
        const dataVencimento = new Date(pagamento.dataVencimento || pagamento.date);
        if (dataVencimento < hoje) {
          return total + (pagamento.valorPrestacao || pagamento.value || 0);
        }
      }
      return total;
    }, 0);
  }, [pagamentosAtuais]);

  if (!isOpen || !aluno) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSetInactive = async () => {
    if (!window.confirm(`Tem certeza que deseja marcar o aluno ${aluno.name} como inativo? Ele será movido para "Alunos Antigos".`)) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      await updateDoc(alunoRef, {
        active: false,
        updatedAt: Timestamp.now()
      });

      alert('Aluno marcado como inativo com sucesso!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao marcar aluno como inativo:', err);
      setError('Erro ao marcar aluno como inativo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (readOnly) return; // Don't allow editing in read-only mode
    setIsEditing(true);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    // Reset form data to original values
    if (aluno) {
      setFormData({
        name: aluno.name || '',
        email: aluno.email || '',
        address: aluno.address || '',
        phone: aluno.phone || '',
        nif: aluno.nif || '',
        cc: aluno.cc || '',
        enrollmentDate: aluno.enrollmentDate || '',
        enrollmentNumber: aluno.enrollmentNumber || '',
        licenseIssueDate: aluno.licenseIssueDate || '',
        licenseExpiryDate: aluno.licenseExpiryDate || '',
        theoreticalExamDate: aluno.theoreticalExamDate || '',
        theoreticalExamResult: aluno.theoreticalExamResult || '',
        practicalExamDate: aluno.practicalExamDate || '',
        practicalExamResult: aluno.practicalExamResult || '',
        observations: aluno.observations || ''
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('O nome do aluno é obrigatório.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      await updateDoc(alunoRef, {
        name: formData.name.trim(),
        email: formData.email.trim() || '',
        address: formData.address.trim() || '',
        phone: formData.phone.trim() || '',
        nif: formData.nif.trim() || '',
        cc: formData.cc.trim() || '',
        enrollmentDate: formData.enrollmentDate || null,
        enrollmentNumber: formData.enrollmentNumber.trim() || '',
        licenseIssueDate: formData.licenseIssueDate || null,
        licenseExpiryDate: formData.licenseExpiryDate || null,
        theoreticalExamDate: formData.theoreticalExamDate || null,
        theoreticalExamResult: formData.theoreticalExamResult || null,
        practicalExamDate: formData.practicalExamDate || null,
        practicalExamResult: formData.practicalExamResult || null,
        observations: formData.observations.trim(),
        servicosAtivos: servicosAtivos,
        materiaisComprados: materiaisComprados,
        updatedAt: Timestamp.now()
      });

      setIsEditing(false);
      
      // Recarregar dados do aluno após salvar
      await refreshAlunoData();
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao atualizar aluno:', err);
      setError('Erro ao atualizar aluno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleAddServico = async () => {
    if (!selectedServico) return;

    const servico = servicos.find(s => s.id === selectedServico);
    if (!servico) return;

    const novosServicosAtivos = [...servicosAtivos];
    // Verificar se já existe este serviço
    const servicoExistente = novosServicosAtivos.find(s => s.servicoId === servico.id);
    
    if (servicoExistente) {
      // Se já existe, adicionar à quantidade existente
      novosServicosAtivos.forEach(s => {
        if (s.servicoId === servico.id) {
          s.quantity += quantidade;
          s.total = s.servicoPrice * s.quantity;
        }
      });
    } else {
      // Se não existe, criar nova entrada
      const novoServico = {
        servicoId: servico.id,
        servicoName: servico.name,
        servicoPrice: servico.price,
        quantity: quantidade,
        dateServico: Timestamp.now(),
        total: servico.price * quantidade,
        name: aluno.name
      };
      novosServicosAtivos.push(novoServico);
    }

    // Atualizar estado local
    setServicosAtivos(novosServicosAtivos);

      // Gravar automaticamente
      try {
        const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
        await updateDoc(alunoRef, {
          services: novosServicosAtivos,
          updatedAt: Timestamp.now()
        });

      // Registrar movimento de dívida
      const valorTotal = servico.price * quantidade;
      await registrarMovimento(
        'servico',
        `${servico.name} (${quantidade}x)`,
        valorTotal,
        'divida', // Tipo de movimento para dívida
        quantidade
      );

      // Recarregar dados completos do aluno do Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
      await refreshAlunoData();

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao adicionar serviço:', err);
      setError('Erro ao adicionar serviço. Tente novamente.');
      // Reverter mudanças locais em caso de erro
      setServicosAtivos(servicosAtivos);
    }

      setSelectedServico('');
      setQuantidade(1);
      setShowAddServico(false);
  };

  const handleRemoveServico = (index) => {
    setItemToRemove({ type: 'servico', index, item: servicosAtivos[index] });
    setQuantidadeToRemove(1);
    setShowRemoveServico(true);
  };

  const handleConfirmRemoveServico = async () => {
    if (!itemToRemove) return;

    const { index, item } = itemToRemove;
    const quantidadeRemover = Math.min(quantidadeToRemove, item.quantity);

    if (quantidadeRemover >= item.quantity) {
      // Remover completamente
      const novosServicosAtivos = servicosAtivos.filter((_, i) => i !== index);
      setServicosAtivos(novosServicosAtivos);

      try {
        const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
        await updateDoc(alunoRef, {
          services: novosServicosAtivos,
          updatedAt: Timestamp.now()
        });
        
        // Recarregar dados completos do aluno do Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
        await refreshAlunoData();

        if (onSuccess) onSuccess();
      } catch (err) {
        console.error('Erro ao remover serviço:', err);
        setError('Erro ao remover serviço. Tente novamente.');
        setServicosAtivos(servicosAtivos);
      }
    } else {
      // Reduzir quantidade
      const novosServicosAtivos = [...servicosAtivos];
      novosServicosAtivos[index].quantity -= quantidadeRemover;
      setServicosAtivos(novosServicosAtivos);

      try {
        const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
        await updateDoc(alunoRef, {
          services: novosServicosAtivos,
          updatedAt: Timestamp.now()
        });
        
        // Recarregar dados completos do aluno do Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
        await refreshAlunoData();

        if (onSuccess) onSuccess();
      } catch (err) {
        console.error('Erro ao remover serviço:', err);
        setError('Erro ao remover serviço. Tente novamente.');
        setServicosAtivos(servicosAtivos);
      }
    }

    setShowRemoveServico(false);
    setItemToRemove(null);
    setQuantidadeToRemove(1);
  };

  const handleAddMaterial = async () => {
    console.log('🔍 handleAddMaterial chamada');
    console.log('📦 selectedMaterial:', selectedMaterial);
    console.log('📦 quantidadeMaterial:', quantidadeMaterial);
    console.log('📦 materiais disponíveis:', materiais.length);
    
    if (!selectedMaterial) {
      console.log('❌ Nenhum material selecionado');
      setError('Por favor, selecione um material');
      return;
    }

    const material = materiais.find(m => m.id === selectedMaterial);
    if (!material) {
      console.log('❌ Material não encontrado');
      setError('Material não encontrado');
      return;
    }

    console.log('✅ Material encontrado:', material);

    // Verificar se há quantidade suficiente no inventário
    const quantidadeDisponivel = material.reabastecimentos?.reduce((total, reabastecimento) => 
      total + (reabastecimento.quantity || 0), 0
    ) || 0;

    if (quantidadeDisponivel < quantidadeMaterial) {
      setError(`Quantidade insuficiente no inventário. Disponível: ${quantidadeDisponivel}`);
      return;
    }

    try {
      // Atualizar inventário - remover a quantidade comprada
      const materialRef = doc(db, 'schools', escolaId, 'materials', material.id);
      // Obter preço atual do último reabastecimento
      let materialPrice = 0;
      if (material.reabastecimentos && material.reabastecimentos.length > 0) {
        const lastReabastecimento = material.reabastecimentos[material.reabastecimentos.length - 1];
        materialPrice = lastReabastecimento.unitPrice || 0;
      }
      if (!materialPrice) {
        materialPrice = material.unitPrice || material.price || 0;
      }
      const novoReabastecimento = {
        quantity: -quantidadeMaterial, // Quantidade negativa para retirar
        unitPrice: materialPrice,
        totalPrice: -(materialPrice * quantidadeMaterial),
          date: Timestamp.now(),
          type: 'venda'
      };

      const reabastecimentosAtualizados = [
        ...(material.reabastecimentos || []),
        novoReabastecimento
      ];

      await updateDoc(materialRef, {
        reabastecimentos: reabastecimentosAtualizados,
        updatedAt: Timestamp.now()
      });

      // Adicionar ao aluno
      const novosMateriaisComprados = [...materiaisComprados];
      const materialExistente = novosMateriaisComprados.find(m => m.materialId === material.id);
      
      if (materialExistente) {
        // Se já existe, adicionar à quantidade existente
        novosMateriaisComprados.forEach(m => {
          if (m.materialId === material.id) {
            m.quantity += quantidadeMaterial;
            m.total = m.quantity * materialPrice;
          }
        });
      } else {
        // Se não existe, criar nova entrada
        const novoMaterial = {
          materialId: material.id,
          materialName: material.name,
          materialPrice: materialPrice,
          quantity: quantidadeMaterial,
          dateCompra: Timestamp.now(),
          total: materialPrice * quantidadeMaterial,
          name: aluno.name
        };
        novosMateriaisComprados.push(novoMaterial);
      }

      // Atualizar estado local
      setMateriaisComprados(novosMateriaisComprados);

      // Gravar automaticamente
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      await updateDoc(alunoRef, {
        materials: novosMateriaisComprados,
        updatedAt: Timestamp.now()
      });

      // Registrar movimento de dívida
      const valorTotal = materialPrice * quantidadeMaterial;
      await registrarMovimento(
        'material',
        `${material.name} (${quantidadeMaterial}x)`,
        valorTotal,
        'divida', // Tipo de movimento para dívida
        quantidadeMaterial
      );

      // Recarregar materiais para atualizar quantidades
      await fetchMateriais();

      // Recarregar dados completos do aluno do Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
      await refreshAlunoData();

      // Store operation details for potential rollback
      setLastMaterialOperation({
        materialId: material.id,
        materialName: material.name,
        quantity: quantidadeMaterial,
        materialPrice: materialPrice,
        reabastecimentosBefore: material.reabastecimentos || [],
        materiaisCompradosBefore: [...materiaisComprados],
        timestamp: Date.now()
      });

      if (onSuccess) onSuccess();

      setSelectedMaterial('');
      setQuantidadeMaterial(1);
      setShowAddMaterial(false);
      setError('');

    } catch (err) {
      console.error('Erro ao adicionar material:', err);
      setError('Erro ao adicionar material. Tente novamente.');
    }
  };

  // Rollback function to undo last material addition
  const rollbackLastMaterialOperation = async () => {
    if (!lastMaterialOperation) return;

    try {
      setIsLoading(true);
      const { materialId, quantity, materialPrice, reabastecimentosBefore, materiaisCompradosBefore } = lastMaterialOperation;

      // Restore inventory stock - restore to exact state before operation
      const materialRef = doc(db, 'schools', escolaId, 'materials', materialId);
      await updateDoc(materialRef, {
        reabastecimentos: reabastecimentosBefore,
        updatedAt: Timestamp.now()
      });

      // Restore student's materials list
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      await updateDoc(alunoRef, {
        materiaisComprados: materiaisCompradosBefore,
        updatedAt: Timestamp.now()
      });

      // Update local state
      setMateriaisComprados(materiaisCompradosBefore);

      // Reload materials
      await fetchMateriais();

      // Recarregar dados completos do aluno do Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
      await refreshAlunoData();

      // Clear the operation
      setLastMaterialOperation(null);
    } catch (error) {
      console.error('Erro ao reverter operação:', error);
      setError('Erro ao reverter operação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMaterial = (index) => {
    setItemToRemove({ type: 'material', index, item: materiaisComprados[index] });
    setQuantidadeToRemove(1);
    setShowRemoveMaterial(true);
  };

  const handleConfirmRemoveMaterial = async () => {
    if (!itemToRemove) return;

    const { index, item } = itemToRemove;
    const quantidadeRemover = Math.min(quantidadeToRemove, item.quantity);

    try {
      // Devolver ao inventário
      const materialRef = doc(db, 'schools', escolaId, 'materials', item.materialId);
      const material = materiais.find(m => m.id === item.materialId);
      
      if (material) {
        const novoReabastecimento = {
          quantity: quantidadeRemover, // Quantidade positiva para devolver
          unitPrice: item.materialPrice,
          totalPrice: quantidadeRemover * item.materialPrice,
          date: Timestamp.now(),
          type: 'devolucao'
        };

        const reabastecimentosAtualizados = [
          ...(material.reabastecimentos || []),
          novoReabastecimento
        ];

        await updateDoc(materialRef, {
          reabastecimentos: reabastecimentosAtualizados,
          updatedAt: Timestamp.now()
        });

        // Recarregar materiais para atualizar quantidades
        await fetchMateriais();
      }

      // Atualizar no aluno
      const novosMateriaisComprados = [...materiaisComprados];
      if (quantidadeRemover >= item.quantity) {
        // Remover completamente
        novosMateriaisComprados.splice(index, 1);
      } else {
        // Reduzir quantidade
        novosMateriaisComprados[index].quantity -= quantidadeRemover;
        novosMateriaisComprados[index].total = novosMateriaisComprados[index].quantity * item.materialPrice;
      }

      setMateriaisComprados(novosMateriaisComprados);

      // Gravar no aluno
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      await updateDoc(alunoRef, {
        materials: novosMateriaisComprados,
        updatedAt: Timestamp.now()
      });

      // Recarregar dados completos do aluno do Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
      await refreshAlunoData();

      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('Erro ao remover material:', err);
      setError('Erro ao remover material. Tente novamente.');
    }

    setShowRemoveMaterial(false);
    setItemToRemove(null);
    setQuantidadeToRemove(1);
  };



  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ver-ficha-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalhes do Aluno</h2>
          <div className="header-actions">
            {!isEditing ? (
              <>
                {!readOnly && (
                  <button className="edit-button" onClick={handleEdit} disabled={isLoading}>
                    Editar
                  </button>
                )}
                {!readOnly && (
                  <button className="edit-button" onClick={() => setShowGerarContrato(true)} disabled={isLoading}>
                    Gerar Contrato
                  </button>
                )}
                {!readOnly && aluno?.active !== false && (
                  <button className="inactive-button" onClick={handleSetInactive} disabled={isLoading}>
                    Marcar como Inativo
                  </button>
                )}
              </>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-button"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button 
                  className="cancel-button" 
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
              </div>
            )}
            <button className="close-button" onClick={onClose} disabled={isLoading}>
              ×
            </button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="aluno-header-info">
            <div className="aluno-name-section">
              {isEditing && !readOnly ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="edit-input aluno-name-input"
                  placeholder="Nome do aluno"
                  required
                  disabled={readOnly}
                />
              ) : (
                <h3>{aluno.name}</h3>
              )}
              {!isEditing && aluno.enrollmentNumber && (
                <span className="student-number">#{aluno.enrollmentNumber}</span>
              )}
            </div>
            <div className="aluno-status">
              <div className="status-indicator">
                <div className="status-icon"></div>
                <span>Ativo</span>
              </div>
            </div>
          </div>

          {/* Botões de Abas */}
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <span className="tab-icon">👤</span>
              <span className="tab-label">Informações</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'servicos' ? 'active' : ''}`}
              onClick={() => setActiveTab('servicos')}
            >
              <span className="tab-icon">🛠️</span>
              <span className="tab-label">Serviços</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'materiais' ? 'active' : ''}`}
              onClick={() => setActiveTab('materiais')}
            >
              <span className="tab-icon">📦</span>
              <span className="tab-label">Materiais</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'pagamentos' ? 'active' : ''}`}
              onClick={() => setActiveTab('pagamentos')}
            >
              <span className="tab-icon">💰</span>
              <span className="tab-label">Pagamentos</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'aulas' ? 'active' : ''}`}
              onClick={() => setActiveTab('aulas')}
            >
              <span className="tab-icon">📚</span>
              <span className="tab-label">Aulas</span>
            </button>
          </div>


          {error && <div className="error-message">{error}</div>}

          {/* Conteúdo da Aba de Informações */}
          {activeTab === 'info' && (
            <form className="edit-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="edit-input"
                    placeholder="Email do aluno"
                  />
                ) : (
                  <span className="info-value">{aluno.email || 'Não informado'}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Telefone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="edit-input"
                    placeholder="Número de telefone"
                  />
                ) : (
                  <span className="info-value">{aluno.phone || 'Não informado'}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Morada</label>
              {isEditing ? (
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Morada completa"
                />
              ) : (
                <span className="info-value">{aluno.address || 'Não informado'}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nif">NIF</label>
                {isEditing ? (
                  <input
                    type="text"
                    id="nif"
                    name="nif"
                    value={formData.nif}
                    onChange={handleInputChange}
                    className="edit-input"
                    placeholder="NIF"
                  />
                ) : (
                  <span className="info-value">{aluno.nif || 'Não informado'}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="cc">Cartão de Cidadão</label>
                {isEditing ? (
                  <input
                    type="text"
                    id="cc"
                    name="cc"
                    value={formData.cc}
                    onChange={handleInputChange}
                    className="edit-input"
                    placeholder="Número do CC"
                  />
                ) : (
                  <span className="info-value">{aluno.cc || 'Não informado'}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="enrollmentNumber">Número de Inscrição</label>
                {isEditing ? (
                  <input
                    type="text"
                    id="enrollmentNumber"
                    name="enrollmentNumber"
                    value={formData.enrollmentNumber}
                    onChange={handleInputChange}
                    className="edit-input"
                    placeholder="Número de inscrição"
                  />
                ) : (
                  <span className="info-value">{aluno.enrollmentNumber || 'Não informado'}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="enrollmentDate">Data de Inscrição</label>
                {isEditing ? (
                  <input
                    type="datetime-local"
                    id="enrollmentDate"
                    name="enrollmentDate"
                    value={formData.enrollmentDate}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="info-value">
                    {aluno.enrollmentDate ? 
                      new Date(aluno.enrollmentDate).toLocaleDateString('pt-PT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Não informado'
                    }
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="licenseIssueDate">Data da Emissão da Licença de Aprendizagem</label>
                {isEditing ? (
                  <input
                    type="date"
                    id="licenseIssueDate"
                    name="licenseIssueDate"
                    value={formData.licenseIssueDate}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="info-value">
                    {aluno.licenseIssueDate ?
                      new Date(aluno.licenseIssueDate).toLocaleDateString('pt-PT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Não informado'
                    }
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="licenseExpiryDate">Data Fim da Licença de Aprendizagem</label>
                {isEditing ? (
                  <input
                    type="date"
                    id="licenseExpiryDate"
                    name="licenseExpiryDate"
                    value={formData.licenseExpiryDate}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className={`info-value${aluno.licenseExpiryDate && new Date(aluno.licenseExpiryDate) < new Date() ? ' license-expired' : ''}`}>
                    {aluno.licenseExpiryDate ?
                      new Date(aluno.licenseExpiryDate).toLocaleDateString('pt-PT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Não informado'
                    }
                    {aluno.licenseExpiryDate && new Date(aluno.licenseExpiryDate) < new Date() && (
                      <span className="license-expired-badge">Expirada</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Exames */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="theoreticalExamResult">Exame Teórico</label>
                {isEditing ? (
                  <select
                    id="theoreticalExamResult"
                    name="theoreticalExamResult"
                    value={formData.theoreticalExamResult}
                    onChange={handleInputChange}
                    className="edit-input"
                  >
                    <option value="">Não realizado</option>
                    <option value="approved">Aprovado</option>
                    <option value="failed">Reprovado</option>
                  </select>
                ) : (
                  <span className={`info-value ${aluno.theoreticalExamResult === 'approved' ? 'exam-approved' : aluno.theoreticalExamResult === 'failed' ? 'exam-failed' : ''}`}>
                    {aluno.theoreticalExamResult === 'approved' ? 'Aprovado' : aluno.theoreticalExamResult === 'failed' ? 'Reprovado' : 'Não realizado'}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="theoreticalExamDate">Data do Exame Teórico</label>
                {isEditing ? (
                  <input
                    type="date"
                    id="theoreticalExamDate"
                    name="theoreticalExamDate"
                    value={formData.theoreticalExamDate}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="info-value">
                    {aluno.theoreticalExamDate ?
                      new Date(aluno.theoreticalExamDate).toLocaleDateString('pt-PT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Não informado'
                    }
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="practicalExamResult">Exame Prático</label>
                {isEditing ? (
                  <select
                    id="practicalExamResult"
                    name="practicalExamResult"
                    value={formData.practicalExamResult}
                    onChange={handleInputChange}
                    className="edit-input"
                  >
                    <option value="">Não realizado</option>
                    <option value="approved">Aprovado</option>
                    <option value="failed">Reprovado</option>
                  </select>
                ) : (
                  <span className={`info-value ${aluno.practicalExamResult === 'approved' ? 'exam-approved' : aluno.practicalExamResult === 'failed' ? 'exam-failed' : ''}`}>
                    {aluno.practicalExamResult === 'approved' ? 'Aprovado' : aluno.practicalExamResult === 'failed' ? 'Reprovado' : 'Não realizado'}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="practicalExamDate">Data do Exame Prático</label>
                {isEditing ? (
                  <input
                    type="date"
                    id="practicalExamDate"
                    name="practicalExamDate"
                    value={formData.practicalExamDate}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="info-value">
                    {aluno.practicalExamDate ?
                      new Date(aluno.practicalExamDate).toLocaleDateString('pt-PT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Não informado'
                    }
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="observations">Observações</label>
                {isEditing ? (
                  <textarea
                    id="observations"
                    name="observations"
                    value={formData.observations}
                    onChange={handleInputChange}
                    className="edit-input observations-textarea"
                    placeholder="Notas sobre o aluno..."
                    rows="4"
                  />
                ) : (
                  <span className="info-value observations-text">
                    {aluno.observations || 'Sem observações'}
                  </span>
                )}
              </div>
            </div>

            <div className="info-item">
              <label>Data de Criação:</label>
              <span className="info-value">{formatDate(aluno.createdAt)}</span>
            </div>
          </form>
          )}

          {/* Conteúdo da Aba de Serviços */}
          {activeTab === 'servicos' && (
          <div className="servicos-ativos-section">
            <div className="section-header">
              <h4>Serviços Ativos</h4>
              <button 
                className="add-servico-button"
                onClick={() => setShowAddServico(!showAddServico)}
                disabled={isLoading}
              >
                + Adicionar Serviço
              </button>
            </div>

            {showAddServico && (
              <div className="add-servico-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="servicoSelect">Serviço</label>
                    <select
                      id="servicoSelect"
                      value={selectedServico}
                      onChange={(e) => setSelectedServico(e.target.value)}
                      className="edit-input"
                    >
                      <option value="">Selecione um serviço</option>
                      {servicos.map(servico => (
                        <option key={servico.id} value={servico.id}>
                          {servico.name} - {formatPrice(servico.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="quantidade">Quantidade</label>
                    <input
                      type="number"
                      id="quantidade"
                      value={quantidade}
                      onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                      min="1"
                      className="edit-input"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setShowAddServico(false);
                      setSelectedServico('');
                      setQuantidade(1);
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="save-button"
                    onClick={handleAddServico}
                    disabled={!selectedServico}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            {servicosAtivos.length === 0 ? (
              <div className="empty-servicos">
                <p>Nenhum serviço ativo</p>
              </div>
            ) : (
              <div className="servicos-list">
                {servicosAtivos.map((servico, index) => (
                  <div key={index} className="servico-item">
                    <div className="servico-info">
                      <span className="servico-name">{servico.servicoName}</span>
                      <span className="servico-price">{formatPrice(servico.servicoPrice)}/un</span>
                      <span className="servico-quantidade">Qtd: {servico.quantity}</span>
                      <span className="servico-total">{formatPrice(servico.servicoPrice * servico.quantity)}</span>
                    </div>
                    {userRole === 'dono' && (
                    <button
                      className="remove-servico-button"
                      onClick={() => handleRemoveServico(index)}
                      disabled={isLoading}
                    >
                      ×
                    </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Conteúdo da Aba de Materiais */}
          {activeTab === 'materiais' && (
            <div className="materiais-comprados-section">
            <div className="section-header">
              <h4>Materiais Comprados</h4>
              <button 
                className="add-material-button"
                onClick={() => setShowAddMaterial(!showAddMaterial)}
                disabled={isLoading}
              >
                + Comprar Material
              </button>
            </div>

            {showAddMaterial && (
              <div className="add-material-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="materialSelect">Material</label>
                    <select
                      id="materialSelect"
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="edit-input"
                    >
                      <option value="">Selecione um material</option>
                      {materiais.map(material => {
                        // Obter preço atual do último reabastecimento
                        let currentPrice = 0;
                        if (material.reabastecimentos && material.reabastecimentos.length > 0) {
                          const lastReabastecimento = material.reabastecimentos[material.reabastecimentos.length - 1];
                          currentPrice = lastReabastecimento.unitPrice || 0;
                        }
                        if (!currentPrice) {
                          currentPrice = material.unitPrice || material.price || 0;
                        }
                        return (
                          <option key={material.id} value={material.id}>
                            {material.name} - {formatPrice(currentPrice)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="quantidadeMaterial">Quantidade</label>
                    <input
                      type="number"
                      id="quantidadeMaterial"
                      value={quantidadeMaterial}
                      onChange={(e) => setQuantidadeMaterial(parseInt(e.target.value) || 1)}
                      min="1"
                      className="edit-input"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  {lastMaterialOperation && (
                    <button 
                      className="rollback-button"
                      onClick={async () => {
                        await rollbackLastMaterialOperation();
                        setShowAddMaterial(false);
                        setSelectedMaterial('');
                        setQuantidadeMaterial(1);
                      }}
                      disabled={isLoading}
                      title="Reverter última adição de material"
                    >
                      ↶ Reverter Última Adição
                    </button>
                  )}
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setShowAddMaterial(false);
                      setSelectedMaterial('');
                      setQuantidadeMaterial(1);
                      // Clear last operation when canceling (user doesn't want to rollback)
                      setLastMaterialOperation(null);
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="save-button"
                    onClick={() => {
                      console.log('🔘 Botão Adicionar clicado');
                      console.log('🔘 isLoading:', isLoading);
                      console.log('🔘 selectedMaterial:', selectedMaterial);
                      handleAddMaterial();
                    }}
                    disabled={!selectedMaterial || isLoading}
                  >
                    {isLoading ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            )}

            {materiaisComprados.length === 0 ? (
              <div className="empty-materiais">
                <p>Nenhum material comprado</p>
              </div>
            ) : (
              <div className="materiais-list">
                {materiaisComprados.map((material, index) => (
                  <div key={index} className="material-item">
                    <div className="material-info">
                      <span className="material-name">{material.materialName}</span>
                      <span className="material-price">{formatPrice(material.materialPrice)}/un</span>
                      <span className="material-quantidade">Qtd: {material.quantity}</span>
                      <span className="material-total">{formatPrice(material.total)}</span>
                    </div>
                    {!readOnly && (
                      <button 
                        className="remove-material-button"
                        onClick={() => handleRemoveMaterial(index)}
                        disabled={isLoading}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Conteúdo da Aba de Pagamentos */}
          {activeTab === 'pagamentos' && (
            <div className="pagamentos-section">
              {/* Header com Botão de Ação */}
              <div className="pagamentos-header">
                <div className="header-content">
                  <h3>Pagamentos</h3>
                  <p>Gerir pagamentos e prestações do aluno</p>
              </div>
              <button 
                  className="btn-primary"
                onClick={handleOpenPagamento}
                  disabled={isLoading}
                >
                  <span className="btn-icon">+</span>
                  Novo Pagamento
              </button>
            </div>

              {/* Informações Financeiras */}
              <div className="financial-info-bar">
                <div className="info-item">
                  <span className="info-label">💰 Total em Dívida:</span>
                  <span className={`info-value ${totalEmDivida > 0 ? 'positivo' : 'negativo'}`}>
                    {formatPrice(totalEmDivida)}
                  </span>
                          </div>
                <div className="info-item">
                  <span className="info-label">📅 Prestações por Pagar:</span>
                  <span className="info-value pendente">
                    {formatPrice(prestacoesPorPagar)}
                  </span>
                          </div>
                <div className="info-item">
                  <span className="info-label">⚠️ Prestações em Atraso:</span>
                  <span className="info-value atraso">
                    {formatPrice(prestacoesEmAtraso)}
                  </span>
                </div>
              </div>

              {/* Lista de Pagamentos */}
              {pagamentosAtuais && pagamentosAtuais.length > 0 ? (
                <div className="pagamentos-grid">
                  {pagamentosAtuais.map((pagamento, index) => {
                    const tipo = pagamento.tipo || pagamento.type;
                    const isPagamento = tipo === 'pagamento';
                    const isPronto = tipo === 'pronto';
                    const isPrestacao = tipo === 'prestacao';
                    // Pagamentos do tipo "pagamento" e "pronto" são sempre considerados pagos
                    const isPago = isPagamento || isPronto || pagamento.isPago === true;
                    const valor = isPagamento ? (pagamento.valor || 0) : (pagamento.value || 0);
                    
                    return (
                    <div key={index} className="payment-card">
                      <div className="payment-main">
                        <div className="payment-info">
                          <div className="payment-type">
                            <div className={`type-indicator ${tipo}`}>
                              {isPagamento ? '💰' : tipo === 'pronto' ? '💰' : '📅'}
                            </div>
                            <div className="type-details">
                              <span className="type-name">
                                {isPagamento ? 'Pagamento' : tipo === 'pronto' ? 'Pagamento a Pronto' : 'Prestação'}
                              </span>
                              <span className="payment-date">
                                {formatDate(pagamento.date || pagamento.data)}
                              </span>
                              {isPrestacao && !isPago && pagamento.dataMaximaPagamento && (
                                <span className="due-date-info">
                                  Vence: {formatDate(pagamento.dataMaximaPagamento)}
                                </span>
                        )}
                      </div>
                          </div>
                          <div className="payment-amount">
                        {formatPrice(valor)}
                      </div>
                    </div>
                    
                        <div className="payment-meta">
                          {isPrestacao && !isPago ? (
                            <div className="installment-status">
                              <div className="installment-info">
                                <span className="installment-text">
                                  Prestação de {formatPrice(pagamento.valorPrestacao || pagamento.value)}
                        </span>
                                {pagamento.dataMaximaPagamento && (
                                  <span className="due-date">
                                    Vencimento: {formatDate(pagamento.dataMaximaPagamento)}
                                  </span>
                                )}
                      </div>
                              <button 
                                className="btn-pay-installment"
                                onClick={() => handlePayInstallment(pagamento)}
                                disabled={isLoading}
                              >
                                <span className="btn-icon">💳</span>
                                Pagar
                              </button>
                        </div>
                          ) : (
                            <>
                              {!isPagamento && (
                                <div className="payment-method">
                                  {/* Mostrar parcelas se existirem (pagamento com múltiplos métodos) */}
                                  {Array.isArray(pagamento.parcelas) && pagamento.parcelas.length > 1 ? (
                                    <div className="parcelas-display">
                                      {pagamento.parcelas.map((parcela, pIdx) => {
                                        const pMethod = parcela.method;
                                        const pIcon = pMethod === 'dinheiro' ? '💵' : pMethod === 'multibanco' ? '💳' : '🏦';
                                        const pName = pMethod === 'dinheiro' ? 'Dinheiro' : pMethod === 'multibanco' ? 'Multibanco' : 'Transferência';
                                        return (
                                          <span key={pIdx} className="parcela-badge">
                                            {pIcon} {formatPrice(parcela.value)} {pName}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    (() => {
                                      const met = pagamento.method || pagamento.metodo || pagamento.paymentMethod;
                                      const icon = met === 'dinheiro' ? '💵' : met === 'multibanco' ? '💳' : met === 'misto' ? '🔀' : '🏦';
                                      const label = met === 'dinheiro' ? 'Dinheiro' : met === 'multibanco' ? 'Multibanco' : met === 'misto' ? 'Misto' : met === 'mbway' ? 'MBWay' : 'Transferência';
                                      return (
                                        <>
                                          <span className="method-icon">{icon}</span>
                                          <span className="method-name">{label}</span>
                                        </>
                                      );
                                    })()
                                  )}
                        </div>
                              )}
                              
                              {isPrestacao && isPago && (
                                <div className="installment-status">
                                  <div className="installment-info">
                                    <span className="installment-text">
                                      Prestação de {formatPrice(pagamento.valorPrestacao || pagamento.value)}
                            </span>
                          </div>
                                  <div className="status-indicator paid">
                                    Pago
                                  </div>
                            </div>
                          )}
                              
                              {(isPagamento || isPronto) && (
                                <div className="status-indicator paid">
                                  Pago
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        {(pagamento.observations || pagamento.observacoes) && (
                          <div className="payment-notes">
                            <span className="notes-text">{pagamento.observations || pagamento.observacoes}</span>
                              </div>
                            )}
                            {pagamento.createdBy && (
                              <div className="payment-created-by">
                                <span className="created-by-text">Registado por: {pagamento.createdBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                    );
                  })}
                          </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">💳</div>
                  <h4>Nenhum pagamento registado</h4>
                  <p>Os pagamentos do aluno aparecerão aqui quando forem efetuados.</p>
                  <button 
                    className="btn-secondary"
                    onClick={handleOpenPagamento}
                    disabled={isLoading}
                  >
                    <span className="btn-icon">+</span>
                    Criar Primeiro Pagamento
                  </button>
                            </div>
                          )}
            </div>
          )}
                      
          {/* Conteúdo da Aba de Aulas */}
          {activeTab === 'aulas' && (
          <div className="aulas-section">
            <div className="section-header">
              <h4>📚 Aulas</h4>
                          </div>
                          
            <div className="aulas-content">
              {aulas.length === 0 ? (
                <div className="empty-aulas">
                  <div className="empty-icon">📚</div>
                  <h3>Nenhuma aula registada</h3>
                  <p>As aulas do aluno aparecerão aqui quando forem adicionadas.</p>
                            </div>
              ) : (
                <div className="aulas-container">
                  {/* Estatísticas das Aulas */}
                  <div className="aulas-stats">
                    <div className="stat-card teorica">
                      <div className="stat-icon">📚</div>
                      <div className="stat-info">
                        <div className="stat-label">Teóricas</div>
                        <div className="stat-value">{aulas.filter(a => a.tipo === 'teorica').length}</div>
                      </div>
                    </div>
                    <div className="stat-card pratica">
                      <div className="stat-icon">🚗</div>
                      <div className="stat-info">
                        <div className="stat-label">Práticas</div>
                        <div className="stat-value">{aulas.filter(a => a.tipo === 'pratica').length}</div>
                      </div>
                    </div>
                    <div className="stat-card total">
                      <div className="stat-icon">📊</div>
                      <div className="stat-info">
                        <div className="stat-label">Total</div>
                        <div className="stat-value">{aulas.length}</div>
                      </div>
                    </div>
                    <div className="stat-card horas">
                      <div className="stat-icon">⏱️</div>
                      <div className="stat-info">
                        <div className="stat-label">Horas</div>
                        <div className="stat-value">{aulas.reduce((sum, a) => sum + (parseFloat(a.horas) || 0), 0)}h</div>
                      </div>
                    </div>
                  </div>
                    
                  {/* Filtros de Aulas */}
                  <div className="aulas-filters">
                    <div className="filter-buttons">
                            <button 
                        className={`filter-btn ${filtroAulas === 'todas' ? 'active' : ''}`}
                        onClick={() => setFiltroAulas('todas')}
                      >
                        📊 Todas ({aulas.length})
                            </button>
                            <button 
                        className={`filter-btn teorica ${filtroAulas === 'teorica' ? 'active' : ''}`}
                        onClick={() => setFiltroAulas('teorica')}
                      >
                        📚 Teóricas ({aulas.filter(aula => aula.tipo === 'teorica').length})
                            </button>
                            <button 
                        className={`filter-btn pratica ${filtroAulas === 'pratica' ? 'active' : ''}`}
                        onClick={() => setFiltroAulas('pratica')}
                      >
                        🚗 Práticas ({aulas.filter(aula => aula.tipo === 'pratica').length})
                            </button>
                          </div>
                          </div>

                  {/* Lista de Aulas Filtrada */}
                  <div className="aulas-list">
                    {(() => {
                      let aulasFiltradas = aulas;
                      
                      if (filtroAulas === 'teorica') {
                        aulasFiltradas = aulas.filter(aula => aula.tipo === 'teorica');
                      } else if (filtroAulas === 'pratica') {
                        aulasFiltradas = aulas.filter(aula => aula.tipo === 'pratica');
                      }
                      
                      return aulasFiltradas.map((aula) => (
                        <div key={aula.id} className={`aula-card ${aula.tipo}`}>
                          <div className="aula-header">
                            <div className="aula-tipo">
                              <span className={`tipo-badge ${aula.tipo}`}>
                                {aula.tipo === 'teorica' ? '📚 Teórica' : '🚗 Prática'}
                              </span>
                            </div>
                            <div className="aula-status">
                              <span className={`status-badge ${aula.status}`}>
                                {aula.status === 'agendada' ? '📅 Agendada' : 
                                 aula.status === 'realizada' ? '✅ Realizada' : 
                                 aula.status === 'cancelada' ? '❌ Cancelada' : aula.status}
                              </span>
                            </div>
                            {(aula.status === 'agendada' || aula.status === 'realizada') && (
                              <button 
                                className="cancel-aula-btn"
                                onClick={() => {
                                  setAulaParaCancelar(aula);
                                  setShowCancelarAula(true);
                                }}
                                title={aula.status === 'agendada' ? 'Cancelar aula' : 'Remover participação na aula'}
                              >
                                {aula.status === 'agendada' ? '❌' : '🗑️'}
                              </button>
                            )}
                          </div>
                          
                          <div className="aula-info">
                            <div className="aula-data-hora">
                              <span className="info-label">📅 Data:</span>
                              <span className="info-value">{new Date(aula.data).toLocaleDateString('pt-PT')}</span>
                            </div>
                            <div className="aula-data-hora">
                              <span className="info-label">🕐 Hora:</span>
                              <span className="info-value">{aula.hora}</span>
                            </div>
                            <div className="aula-horas">
                              <span className="info-label">⏱️ Duração:</span>
                              <span className="info-value">{aula.horas}h</span>
                            </div>
                            {aula.veiculoId && (
                              <div className="aula-veiculo">
                                <span className="info-label">🚗 Veículo:</span>
                                <span className="info-value">{aula.veiculoId}</span>
                      </div>
                    )}
                            <div className="aula-instrutor">
                              <span className="info-label">👨‍🏫 Instrutor:</span>
                              <span className="info-value">{aula.instrutorNome}</span>
                  </div>
              </div>
                          
                          {aula.observacoes && (
                            <div className="aula-observacoes">
                              <span className="info-label">📝 Observações:</span>
                              <span className="info-value">{aula.observacoes}</span>
              </div>
            )}
                        </div>
                      ));
                    })()}
                  </div>
          </div>
          )}
            </div>
          </div>
          )}
        </div>

        {/* Modal de Confirmação - Cancelar Aula */}
        {showCancelarAula && aulaParaCancelar && (
          <div className="modal-overlay" onClick={() => setShowCancelarAula(false)}>
            <div className="modal-content confirm-remove-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {aulaParaCancelar.status === 'realizada' 
                    ? (aulaParaCancelar.alunos && aulaParaCancelar.alunos.length > 1 
                        ? 'Remover Participação na Aula Realizada' 
                        : 'Remover Participação na Aula Realizada')
                    : (aulaParaCancelar.alunos && aulaParaCancelar.alunos.length > 1 
                        ? 'Remover Aluno da Aula' 
                        : 'Cancelar Aula')
                  }
                </h3>
                <button className="close-button" onClick={() => setShowCancelarAula(false)}>×</button>
              </div>
              <div className="modal-body">
                {aulaParaCancelar.status === 'realizada' ? (
                  <>
                    {aulaParaCancelar.alunos && aulaParaCancelar.alunos.length > 1 ? (
                      <>
                        <p>Tem certeza que deseja remover a participação deste aluno nesta aula realizada?</p>
                        <p className="warning-text">⚠️ Esta aula tem {aulaParaCancelar.alunos.length} alunos. Apenas este aluno será removido e a aula continuará registada para os outros alunos.</p>
                      </>
                    ) : (
                      <p>Tem certeza que deseja remover a participação deste aluno nesta aula realizada?</p>
                    )}
                  </>
                ) : (
                  <>
                    {aulaParaCancelar.alunos && aulaParaCancelar.alunos.length > 1 ? (
                      <>
                        <p>Tem certeza que deseja remover este aluno desta aula?</p>
                        <p className="warning-text">⚠️ Esta aula tem {aulaParaCancelar.alunos.length} alunos. Apenas este aluno será removido e a aula continuará agendada para os outros alunos.</p>
                      </>
                    ) : (
                      <p>Tem certeza que deseja cancelar esta aula?</p>
                    )}
                  </>
                )}
                <div className="aula-info-cancelar">
                  <p><strong>Tipo:</strong> {aulaParaCancelar.tipo === 'teorica' ? '📚 Teórica' : '🚗 Prática'}</p>
                  <p><strong>Data:</strong> {aulaParaCancelar.data ? (aulaParaCancelar.data.toDate ? aulaParaCancelar.data.toDate().toLocaleDateString('pt-PT') : new Date(aulaParaCancelar.data).toLocaleDateString('pt-PT')) : 'N/A'}</p>
                  <p><strong>Hora:</strong> {aulaParaCancelar.hora || 'N/A'}</p>
                  <p><strong>Instrutor:</strong> {aulaParaCancelar.instrutorNome || 'N/A'}</p>
                  {aulaParaCancelar.alunos && aulaParaCancelar.alunos.length > 1 && (
                    <p><strong>Total de alunos:</strong> {aulaParaCancelar.alunos.length}</p>
                  )}
                </div>
                <div className="modal-actions">
                <button 
                    className="cancel-button" 
                    onClick={() => setShowCancelarAula(false)}
                  disabled={isLoading}
                >
                    Não
                </button>
                  <button 
                    className="confirm-button" 
                    onClick={handleCancelarAula}
                    disabled={isLoading}
                  >
                    {isLoading 
                      ? 'Processando...' 
                      : aulaParaCancelar.status === 'realizada'
                        ? (aulaParaCancelar.alunos && aulaParaCancelar.alunos.length > 1 
                            ? 'Sim, Remover Participação' 
                            : 'Sim, Remover Participação')
                        : (aulaParaCancelar.alunos && aulaParaCancelar.alunos.length > 1 
                            ? 'Sim, Remover Aluno' 
                            : 'Sim, Cancelar')
                    }
                  </button>
                </div>
              </div>
            </div>
        </div>
        )}

        {/* Modal de Confirmação - Remover Serviço */}
        {showRemoveServico && itemToRemove && (
          <div className="modal-overlay" onClick={() => setShowRemoveServico(false)}>
            <div className="modal-content confirm-remove-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Remover Serviço</h3>
                <button className="close-button" onClick={() => setShowRemoveServico(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Quantos <strong>{itemToRemove.item.servicoName}</strong> deseja remover?</p>
                <div className="quantity-input">
                  <label>Quantidade:</label>
                  <input
                    type="number"
                    value={quantidadeToRemove}
                    onChange={(e) => setQuantidadeToRemove(Math.max(1, Math.min(parseInt(e.target.value) || 1, itemToRemove.item.quantity)))}
                    min="1"
                    max={itemToRemove.item.quantity}
                  />
                  <span>de {itemToRemove.item.quantity} disponíveis</span>
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-button" onClick={() => setShowRemoveServico(false)}>
                  Cancelar
                </button>
                <button className="confirm-button" onClick={handleConfirmRemoveServico}>
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação - Remover Material */}
        {showRemoveMaterial && itemToRemove && (
          <div className="modal-overlay" onClick={() => setShowRemoveMaterial(false)}>
            <div className="modal-content confirm-remove-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Remover Material</h3>
                <button className="close-button" onClick={() => setShowRemoveMaterial(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Quantos <strong>{itemToRemove.item.materialName}</strong> deseja remover?</p>
                <div className="quantity-input">
                  <label>Quantidade:</label>
                  <input
                    type="number"
                    value={quantidadeToRemove}
                    onChange={(e) => setQuantidadeToRemove(Math.max(1, Math.min(parseInt(e.target.value) || 1, itemToRemove.item.quantity)))}
                    min="1"
                    max={itemToRemove.item.quantity}
                  />
                  <span>de {itemToRemove.item.quantity} disponíveis</span>
                </div>
                <p className="note">O material será devolvido ao inventário.</p>
              </div>
              <div className="modal-footer">
                <button className="cancel-button" onClick={() => setShowRemoveMaterial(false)}>
                  Cancelar
                </button>
                <button className="confirm-button" onClick={handleConfirmRemoveMaterial}>
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pagamento */}
        <PagamentoModal
          isOpen={showPagamento}
          onClose={handleClosePagamento}
          onSuccess={handlePagamentoSuccess}
          aluno={{ ...aluno, pagamentos: pagamentosAtuais }}
          escolaId={escolaId}
          servicosAtivos={servicosAtivos}
          materiaisComprados={materiaisComprados}
          selectedInstallment={selectedInstallment}
        />

        {/* Modal de Gerar Contrato */}
        <GerarContratoModal
          isOpen={showGerarContrato}
          onClose={() => setShowGerarContrato(false)}
          aluno={aluno}
          escolaId={escolaId}
          extras={{ totalServicos, totalDivida: totalEmDivida }}
        />

      </div>
    </div>
  );
};

export default VerFichaAlunoModal;
