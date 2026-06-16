import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc, getDoc, collection, query, where, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './ConfirmarCancelamentoModal.css';

const ConfirmarCancelamentoModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  movimento, 
  escolaId,
  onDespesasUpdate = null // Callback para atualizar despesas
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Função para calcular dívida total
  const calcularTotalDivida = (servicosAtivos, materiaisComprados, pagamentos) => {
    const totalServicos = servicosAtivos.reduce((total, servico) => {
      return total + (servico.servicoPrice * servico.quantity);
    }, 0);

    const totalMateriais = materiaisComprados.reduce((total, material) => {
      return total + (material.materialPrice * material.quantity);
    }, 0);

    const totalPagamentos = pagamentos.reduce((total, pagamento) => {
      if (pagamento.type === 'pronto') {
        return total + pagamento.value;
      }
      if (pagamento.type === 'prestacao') {
        return pagamento.isPago ? total + pagamento.value : total;
      }
      return total + pagamento.value;
    }, 0);

    return (totalServicos + totalMateriais) - totalPagamentos;
  };

  const handleCancelar = async () => {
    if (!movimento) return;

    setIsLoading(true);
    setError('');

    try {
      // Reverter operações baseadas no tipo de movimento
      await reverterOperacao(movimento);

      // Eliminar movimento da base de dados
      const movimentoRef = doc(db, 'schools', escolaId, 'movements', movimento.id);
      await deleteDoc(movimentoRef);

      // Atualizar despesas se necessário
      if (onDespesasUpdate) {
        await onDespesasUpdate();
      }

      onSuccess();
      onClose();
      
    } catch (err) {
      console.error('Erro ao cancelar movimento:', err);
      setError('Erro ao cancelar movimento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const reverterOperacao = async (movimento) => {
    try {
      // Eliminar despesas relacionadas primeiro
      await eliminarDespesasRelacionadas(movimento);

      // Reverter baseado no tipo de operação
      if (movimento.tipoOperacao === 'criacao' && movimento.materialId) {
        // Reverter criação de material - eliminar material
        const materialRef = doc(db, 'schools', escolaId, 'materiais', movimento.materialId);
        await deleteDoc(materialRef);
      } 
      else if (movimento.tipoOperacao === 'reabastecimento' && movimento.materialId) {
        // Reverter reabastecimento - remover último reabastecimento
        const materialRef = doc(db, 'schools', escolaId, 'materiais', movimento.materialId);
        const materialDoc = await getDoc(materialRef);
        
        if (materialDoc.exists()) {
          const materialData = materialDoc.data();
          const reabastecimentos = materialData.reabastecimentos || [];
          
          // Remover o último reabastecimento (que corresponde a este movimento)
          const reabastecimentosAtualizados = reabastecimentos.slice(0, -1);
          
          await updateDoc(materialRef, {
            reabastecimentos: reabastecimentosAtualizados,
            updatedAt: serverTimestamp()
          });
        }
      }
      else if (movimento.tipoOperacao === 'despesa' && movimento.despesaId) {
        // Reverter despesa - eliminar despesa (já eliminada acima)
        // Não precisa fazer nada aqui
      }
      else if (movimento.type === 'servico' && movimento.alunoId) {
        // Reverter compra de serviço - remover do aluno
        const alunoRef = doc(db, 'schools', escolaId, 'students', movimento.alunoId);
        const alunoDoc = await getDoc(alunoRef);
        
        if (alunoDoc.exists()) {
          const alunoData = alunoDoc.data();
          const servicosAtivos = alunoData.servicosAtivos || [];
          
          // Remover o serviço correspondente
          const servicosAtualizados = servicosAtivos.filter(servico => 
            servico.servicoId !== movimento.servicoId || 
            servico.quantity !== movimento.quantity
          );
          
          // Recalcular dívida total após remover serviço
          const novaDividaTotal = calcularTotalDivida(
            servicosAtualizados,
            alunoData.materiaisComprados || [],
            alunoData.pagamentos || []
          );

          await updateDoc(alunoRef, {
            servicosAtivos: servicosAtualizados,
            totalDivida: novaDividaTotal,
            updatedAt: serverTimestamp()
          });
        }
      }
      else if (movimento.type === 'material' && movimento.alunoId) {
        // Reverter compra de material - devolver ao inventário e remover do aluno
        const alunoRef = doc(db, 'schools', escolaId, 'students', movimento.alunoId);
        const alunoDoc = await getDoc(alunoRef);
        
        if (alunoDoc.exists()) {
          const alunoData = alunoDoc.data();
          const materiaisComprados = alunoData.materiaisComprados || [];
          
          // Remover o material do aluno
          const materiaisAtualizados = materiaisComprados.filter(material => 
            material.materialId !== movimento.materialId || 
            material.quantity !== movimento.quantity
          );
          
          // Recalcular dívida total após remover material
          const novaDividaTotal = calcularTotalDivida(
            alunoData.servicosAtivos || [],
            materiaisAtualizados,
            alunoData.pagamentos || []
          );

          await updateDoc(alunoRef, {
            materiaisComprados: materiaisAtualizados,
            totalDivida: novaDividaTotal,
            updatedAt: serverTimestamp()
          });
        }
        
        // Devolver quantidade ao inventário
        if (movimento.materialId) {
          const materialRef = doc(db, 'schools', escolaId, 'materials', movimento.materialId);
          const materialDoc = await getDoc(materialRef);
          
          if (materialDoc.exists()) {
            const materialData = materialDoc.data();
            const reabastecimentos = materialData.reabastecimentos || [];
            
            // Adicionar entrada de devolução
            const devolucao = {
              quantity: movimento.quantity,
              unitPrice: movimento.value / movimento.quantity,
              totalPrice: movimento.value,
              date: Timestamp.now(),
              type: 'devolucao'
            };
            
            await updateDoc(materialRef, {
              reabastecimentos: [...reabastecimentos, devolucao],
              updatedAt: serverTimestamp()
            });
          }
        }
      }
      else if (movimento.type === 'pagamento' && movimento.alunoId) {
        // Reverter pagamento - remover do aluno usando referência direta
        const alunoRef = doc(db, 'schools', escolaId, 'students', movimento.alunoId);
        const alunoDoc = await getDoc(alunoRef);
        
        if (alunoDoc.exists()) {
          const alunoData = alunoDoc.data();
          const pagamentos = alunoData.pagamentos || [];
          
          // Remover o pagamento que tem o movimentoId correspondente
          const pagamentosAtualizados = pagamentos.filter(pagamento => 
            pagamento.movimentoId !== movimento.id
          );
          
          // Recalcular dívida total após remover pagamento
          const novaDividaTotal = calcularTotalDivida(
            alunoData.servicosAtivos || [],
            alunoData.materiaisComprados || [],
            pagamentosAtualizados
          );
          
          await updateDoc(alunoRef, {
            pagamentos: pagamentosAtualizados,
            totalDivida: novaDividaTotal,
            updatedAt: serverTimestamp()
          });
        }
      }
      
    } catch (err) {
      console.error('Erro ao reverter operação:', err);
      throw err;
    }
  };

  const eliminarDespesasRelacionadas = async (movimento) => {
    try {
      // Se o movimento tem despesaId, eliminar diretamente
      if (movimento.despesaId) {
        const despesaRef = doc(db, 'schools', escolaId, 'despesas', movimento.despesaId);
        await deleteDoc(despesaRef);
        return;
      }

      // Procurar despesas que tenham este movimentoId
      const despesasRef = collection(db, 'schools', escolaId, 'despesas');
      const q = query(despesasRef, where('movimentoId', '==', movimento.id));
      const querySnapshot = await getDocs(q);
      
      // Eliminar todas as despesas encontradas
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
    } catch (err) {
      console.error('Erro ao eliminar despesas relacionadas:', err);
      // Não falhar a operação principal por causa das despesas
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !movimento) return null;

  const getTipoOperacaoLabel = (tipoOperacao) => {
    const tipos = {
      'criacao': 'Criação de Material',
      'reabastecimento': 'Reabastecimento de Material',
      'despesa': 'Despesa',
      'compra': 'Compra de Aluno'
    };
    return tipos[tipoOperacao] || tipoOperacao;
  };

  const formatPrice = (price) => {
    if (!price) return '0,00 €';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚠️ Cancelar Movimento</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="warning-message">
            <p><strong>Atenção!</strong> Esta ação irá cancelar o movimento e reverter todas as operações relacionadas:</p>
          </div>

          <div className="movimento-details">
            <div className="detail-row">
              <span className="label">Descrição:</span>
              <span className="value">{movimento.description}</span>
            </div>
            <div className="detail-row">
              <span className="label">Valor:</span>
              <span className="value">{formatPrice(movimento.value)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Tipo de Operação:</span>
              <span className="value">{getTipoOperacaoLabel(movimento.typeOperacao)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Método de Pagamento:</span>
              <span className="value">{movimento.paymentMethod}</span>
            </div>
            {movimento.alunoName && (
              <div className="detail-row">
                <span className="label">Aluno:</span>
                <span className="value">{movimento.alunoName}</span>
              </div>
            )}
          </div>

          <div className="reversal-info">
            <h4>Operações que serão revertidas:</h4>
            <ul>
              {movimento.tipoOperacao === 'criacao' && (
                <li>❌ Eliminar material criado</li>
              )}
              {movimento.tipoOperacao === 'reabastecimento' && (
                <li>❌ Remover reabastecimento do inventário</li>
              )}
              {movimento.tipoOperacao === 'despesa' && (
                <li>❌ Eliminar despesa registada</li>
              )}
              {movimento.type === 'servico' && (
                <li>❌ Remover serviço do aluno</li>
              )}
              {movimento.type === 'material' && movimento.alunoId && (
                <>
                  <li>❌ Devolver material ao inventário</li>
                  <li>❌ Remover material do aluno</li>
                </>
              )}
            </ul>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={handleClose}
            disabled={isLoading}
          >
            Não Cancelar
          </button>
          <button
            type="button"
            className="confirm-button"
            onClick={handleCancelar}
            disabled={isLoading}
          >
            {isLoading ? 'A cancelar...' : 'Sim, Cancelar Movimento'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarCancelamentoModal;
