import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './PaymentModal.css';

const PaymentModal = ({ isOpen, onClose, onSuccess, aluno, escolaId, servicosAtivos, materiaisComprados }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'dinheiro',
    paymentType: 'pronto', // 'pronto' ou 'prestacao'
    dataMaximaPagamento: '', // Data limite para prestações
    observations: ''
  });
  const [naoAfetarFinanceiro, setNaoAfetarFinanceiro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calcular total em dívida
  const calcularTotalEmDivida = () => {
    if (!aluno) return 0;
    
    const totalServicos = servicosAtivos.reduce((total, servico) => {
      return total + (servico.preco * servico.quantidade);
    }, 0);
    
    const totalMateriais = materiaisComprados.reduce((total, material) => {
      return total + (material.preco * material.quantidade);
    }, 0);
    
    const totalPagamentos = (aluno.pagamentos || []).reduce((total, pagamento) => {
      return total + pagamento.valor;
    }, 0);
    
    return (totalServicos + totalMateriais) - totalPagamentos;
  };

  const totalDivida = calcularTotalEmDivida();

  const registrarMovimento = async (tipo, descricao, valor, metodoPagamento, observacoes = '') => {
    try {
      const movementsRef = collection(db, 'schools', escolaId, 'movements');
      const movimento = {
        type: 'pagamento',
        description: descricao,
        value: valor, // Valor positivo para pagamentos
        quantity: 1,
        paymentMethod: metodoPagamento,
        date: new Date(), // Sempre usar data/hora atual para pagamentos efetivos
        typeOperacao: tipo,
        alunoId: aluno.id,
        alunoName: aluno.name,
        observations: observacoes,
        naoAfetarFinanceiro: naoAfetarFinanceiro, // Usar o estado do checkbox
        createdAt: new Date()
      };

      const movimentoRef = await addDoc(movementsRef, movimento);
      return movimentoRef.id; // Retornar ID do movimento
    } catch (err) {
      console.error('Erro ao registrar movimento:', err);
      // Não falhar a operação principal por causa do movimento
      return null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: totalDivida > 0 ? totalDivida.toString() : '',
        paymentMethod: 'dinheiro',
        paymentType: 'pronto',
        dataMaximaPagamento: '',
        observations: ''
      });
      setError('');
      setSuccess('');
    }
  }, [isOpen, totalDivida]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verificar se há dívida
    if (totalDivida <= 0) {
      setError('Não é possível criar pagamentos quando não há dívida.');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Por favor, insira um valor válido para o pagamento.');
      return;
    }
    
    const valorPagamento = parseFloat(formData.amount);
    if (valorPagamento > totalDivida) {
      setError(`O valor do pagamento (${valorPagamento.toFixed(2)}€) não pode exceder a dívida total (${totalDivida.toFixed(2)}€).`);
      return;
    }
    
    // Validar data limite para prestações
    if (formData.paymentType === 'prestacao' && !formData.dataMaximaPagamento) {
      setError('Para pagamentos por prestação, é obrigatório definir uma data limite de pagamento.');
      return;
    }
    
    // Validar se a data limite não é no passado
    if (formData.paymentType === 'prestacao' && formData.dataMaximaPagamento) {
      const dataLimite = new Date(formData.dataMaximaPagamento);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zerar horas para comparar apenas a data
      
      if (dataLimite < hoje) {
        setError('A data limite de pagamento não pode ser no passado.');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      const valorPagamento = parseFloat(formData.amount);
      
      // Registrar movimento para pagamentos a pronto
      let movimentoId = null;
      if (formData.paymentType === 'pronto') {
        const descricao = `Pagamento a pronto - ${aluno.name}`;
        movimentoId = await registrarMovimento(
          'pagamento',
          descricao,
          valorPagamento,
          formData.paymentMethod,
          formData.observations || ''
        );
      }
      
      // Adicionar pagamento à coleção de pagamentos do aluno
      const pagamentoData = {
        value: valorPagamento,
        valorPrestacao: valorPagamento, // Para compatibilidade
        method: formData.paymentType === 'pronto' ? formData.paymentMethod : null,
        metodo: formData.paymentType === 'pronto' ? formData.paymentMethod : null, // Para compatibilidade
        type: formData.paymentType,
        data: serverTimestamp(),
        date: new Date(), // Para compatibilidade
        dataMaximaPagamento: formData.paymentType === 'prestacao' ? new Date(formData.dataMaximaPagamento) : null,
        observations: formData.observations || '',
        observacoes: formData.observations || '', // Para compatibilidade
        isPago: formData.paymentType === 'pronto', // Se for pronto, já está pago
        movimentoId: movimentoId // Ligação ao movimento
      };

      await addDoc(collection(db, 'schools', escolaId, 'students', aluno.id, 'pagamentos'), pagamentoData);

      // Atualizar o documento do aluno com o novo pagamento
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      const pagamentosAtuais = aluno.pagamentos || [];
      const novoPagamento = {
        value: valorPagamento,
        valorPrestacao: valorPagamento, // Para compatibilidade
        method: formData.paymentType === 'pronto' ? formData.paymentMethod : null,
        metodo: formData.paymentType === 'pronto' ? formData.paymentMethod : null, // Para compatibilidade
        type: formData.paymentType,
        data: new Date(),
        date: new Date(), // Para compatibilidade
        dataMaximaPagamento: formData.paymentType === 'prestacao' ? new Date(formData.dataMaximaPagamento) : null,
        observations: formData.observations || '',
        observacoes: formData.observations || '', // Para compatibilidade
        isPago: formData.paymentType === 'pronto', // Se for pronto, já está pago
        movimentoId: movimentoId // Ligação ao movimento
      };
      
      await updateDoc(alunoRef, {
        pagamentos: [...pagamentosAtuais, novoPagamento]
      });

      setSuccess('Pagamento registado com sucesso!');
      
      // Aguardar um pouco para mostrar a mensagem de sucesso
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      setError('Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        amount: '',
        paymentMethod: 'dinheiro',
        observations: ''
      });
      setNaoAfetarFinanceiro(false);
      setError('');
      setSuccess('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="payment-modal-overlay" onClick={handleClose}>
      <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="payment-modal-header">
          <h2>💳 Novo Pagamento</h2>
          <button 
            className="payment-modal-close" 
            onClick={handleClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="payment-modal-body">
          {/* Informações do Aluno */}
          <div className="payment-student-info">
            <div className="payment-student-name">{aluno?.name}</div>
            <div className="payment-student-number">#{aluno?.studentNumber}</div>
          </div>

          {/* Resumo de Dívida */}
          {totalDivida > 0 && (
            <div className="payment-debt-summary">
              <div className="payment-debt-title">💰 Total em Dívida</div>
              <div className="payment-debt-amount">{totalDivida.toFixed(2)}€</div>
            </div>
          )}

          {/* Mensagens */}
          {error && <div className="payment-error">{error}</div>}
          {success && <div className="payment-success">{success}</div>}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="payment-form">
            <div className="payment-form-group">
              <label className="payment-form-label" htmlFor="amount">
                💰 Valor do Pagamento (€)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                onWheel={(e) => e.target.blur()}
                className="payment-form-input"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                disabled={isLoading}
              />
            </div>

            <div className="payment-form-group">
              <label className="payment-form-label" htmlFor="paymentType">
                💰 Tipo de Pagamento
              </label>
              <select
                id="paymentType"
                name="paymentType"
                value={formData.paymentType}
                onChange={handleInputChange}
                className="payment-form-select"
                disabled={isLoading}
              >
                <option value="pronto">💵 Pagamento a Pronto</option>
                <option value="prestacao">📅 Pagamento por Prestação</option>
              </select>
            </div>

            {/* Método de pagamento - só aparece para pagamentos a pronto */}
            {formData.paymentType === 'pronto' && (
              <div className="payment-form-group">
                <label className="payment-form-label" htmlFor="paymentMethod">
                  💳 Método de Pagamento
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="payment-form-select"
                  disabled={isLoading}
                >
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="multibanco">🏧 Multibanco</option>
                  <option value="transferencia">🏦 Transferência</option>
                </select>
              </div>
            )}

            {/* Campo de data limite - só aparece para prestações */}
            {formData.paymentType === 'prestacao' && (
              <>
                <div className="payment-form-group">
                  <label className="payment-form-label" htmlFor="dataMaximaPagamento">
                    📅 Data Limite de Pagamento
                  </label>
                  <input
                    type="date"
                    id="dataMaximaPagamento"
                    name="dataMaximaPagamento"
                    value={formData.dataMaximaPagamento}
                    onChange={handleInputChange}
                    className="payment-form-input"
                    required
                    disabled={isLoading}
                    min={new Date().toISOString().split('T')[0]} // Data mínima é hoje
                  />
                </div>
                
                <div className="payment-info-message">
                  <div className="payment-info-icon">ℹ️</div>
                  <div className="payment-info-text">
                    O método de pagamento será definido quando a prestação for efetivamente paga.
                  </div>
                </div>
              </>
            )}

            <div className="payment-form-group">
              <label className="payment-form-label" htmlFor="observations">
                📝 Observações (Opcional)
              </label>
              <textarea
                id="observations"
                name="observations"
                value={formData.observations}
                onChange={handleInputChange}
                className="payment-form-input"
                placeholder="Adicione observações sobre o pagamento..."
                rows="3"
                disabled={isLoading}
              />
            </div>

            {/* Checkbox para não afetar visão financeira */}
            <div className="payment-form-group">
              <label className="payment-checkbox-label">
                <input
                  type="checkbox"
                  checked={naoAfetarFinanceiro}
                  onChange={(e) => setNaoAfetarFinanceiro(e.target.checked)}
                  disabled={isLoading}
                  className="payment-checkbox"
                />
                <span className="payment-checkbox-text">
                  📚 Pagamento Histórico
                </span>
              </label>
              <small className="payment-checkbox-help">
                Se marcado, este pagamento será registado apenas como histórico e não afetará os cálculos financeiros
              </small>
            </div>

            {/* Botões de Ação */}
            <div className="payment-modal-actions">
              <button
                type="button"
                className="payment-modal-button secondary"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="payment-modal-button primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="payment-loading">
                    <div className="payment-spinner"></div>
                    A processar...
                  </div>
                ) : (
                  <>
                    💳 Registrar Pagamento
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentModal;
