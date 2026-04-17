import React, { useState } from 'react';
import { doc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatPrice } from '../utils/formatters';
import './PagamentoModal.css';

const PagamentoModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  aluno, 
  escolaId,
  servicosAtivos = [],
  materiaisComprados = [],
  selectedInstallment = null
}) => {
  const [etapa, setEtapa] = useState(1); // 1: Escolher type, 2: Detalhes do pagamento
  const [typePagamento, setTipoPagamento] = useState(''); // 'pronto' ou 'prestacao'
  const [paymentMethod, setMetodoPagamento] = useState('dinheiro');
  const [valuePago, setValorPago] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [observations, setObservacoes] = useState('');
  const [naoAfetarFinanceiro, setNaoAfetarFinanceiro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Campos específicos para pagamento por prestação
  const [dataMaximaPagamento, setDataMaximaPagamento] = useState('');
  const [valorPrestacao, setValorPrestacao] = useState('');

  // Inicializar data do pagamento com data atual
  React.useEffect(() => {
    if (isOpen) {
      const hoje = new Date();
      const dataFormatada = hoje.toISOString().split('T')[0];
      setPaymentDate(dataFormatada);
      
      // Se há uma prestação selecionada, configurar automaticamente
      if (selectedInstallment) {
        setTipoPagamento('pronto'); // Pagamento a pronto para prestação existente
        setValorPago(selectedInstallment.value.toString());
        setEtapa(2); // Ir direto para a etapa de detalhes
      }
    }
  }, [isOpen, selectedInstallment]);

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
    return (aluno.pagamentos || []).reduce((total, pagamento) => {
      const tipo = pagamento.tipo || pagamento.type;
      
      // Pagamentos do tipo "pagamento" não têm "isPago", apenas "valor"
      if (tipo === 'pagamento' && pagamento.valor) {
        return total + parseFloat(pagamento.valor);
      }
      
      // Para pagamentos a pronto, sempre contar o valor (já estão pagos)
      if (tipo === 'pronto' && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }
      
      // Para prestações, só contar se estiverem pagas
      if (tipo === 'prestacao' && pagamento.isPago === true) {
        return total + parseFloat(pagamento.valorPrestacao || pagamento.value || 0);
      }
      
      // Outros tipos: só contar se isPago é true
      if (pagamento.isPago === true && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }
      
      return total;
    }, 0);
  }, [aluno.pagamentos]);

  const totalGeral = useMemo(() => {
    return (totalServicos + totalMateriais) - totalPagamentos;
  }, [totalServicos, totalMateriais, totalPagamentos]);

  // Funções wrapper para compatibilidade
  const calcularTotalServicos = () => totalServicos;
  const calcularTotalMateriais = () => totalMateriais;
  const calcularTotalGeral = () => totalGeral;

  // Função para calcular dívida com pagamentos específicos (usada para atualizações)
  const calcularTotalGeralComPagamentos = (pagamentos) => {
    const totalServicos = calcularTotalServicos();
    const totalMateriais = calcularTotalMateriais();

    const totalPagamentos = pagamentos.reduce((total, pagamento) => {
      const tipo = pagamento.tipo || pagamento.type;
      
      // Pagamentos do tipo "pagamento" não têm "isPago", apenas "valor"
      if (tipo === 'pagamento' && pagamento.valor) {
        return total + parseFloat(pagamento.valor);
      }
      
      if (tipo === 'pronto' && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }
      
      if (tipo === 'prestacao' && pagamento.isPago === true) {
        // Prestações só reduzem a dívida se estiverem pagas
        return total + parseFloat(pagamento.valorPrestacao || pagamento.value || 0);
      }
      
      // Outros tipos: só contar se isPago é true
      if (pagamento.isPago === true && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }
      
      return total;
    }, 0);

    return (totalServicos + totalMateriais) - totalPagamentos;
  };


  const handleEscolherTipo = (type) => {
    setTipoPagamento(type);
    setEtapa(2);
    setError('');
  };

  const handleVoltar = () => {
    setEtapa(1);
    setTipoPagamento('');
    setPaymentDate('');
    setError('');
    setDataMaximaPagamento('');
    setValorPrestacao('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Para pagamentos a pronto, validar valor a pagar
    if (typePagamento === 'pronto') {
      if (!valuePago || isNaN(parseFloat(valuePago)) || parseFloat(valuePago) <= 0) {
        setError('Por favor, insira um valor válido');
        return;
      }
    }

    // Para pagamentos a pronto, data do pagamento é obrigatória
    if (typePagamento === 'pronto' && !paymentDate) {
      setError('Por favor, selecione a data do pagamento');
      return;
    }

    // Validações específicas para pagamento por prestação
    if (typePagamento === 'prestacao') {
      if (!dataMaximaPagamento) {
        setError('Por favor, selecione a data máxima para pagamento');
        return;
      }
      if (!valorPrestacao || isNaN(parseFloat(valorPrestacao)) || parseFloat(valorPrestacao) <= 0) {
        setError('Por favor, insira um valor válido para a prestação');
        return;
      }
      
      const valorPrestacaoNum = parseFloat(valorPrestacao);
      if (valorPrestacaoNum > totalGeral) {
        setError('O valor da prestação não pode ser superior ao total em dívida');
        return;
      }
    }

    // Determinar o valor baseado no tipo de pagamento
    const value = typePagamento === 'prestacao' ? parseFloat(valorPrestacao) : parseFloat(valuePago);
    
    // Para pagamentos a pronto, validar se não excede a dívida
    if (typePagamento === 'pronto' && value > totalGeral) {
      setError('O valor pago não pode ser superior ao total em dívida');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      const pagamentosAtuais = aluno.pagamentos || [];
      let pagamentosFinais = [];

      if (selectedInstallment) {
        // Pagamento de prestação específica existente
        const movimentoId = await registrarMovimento(
          'pagamento',
          `Pagamento de prestação ${selectedInstallment.numeroPrestacao || 1} - ${aluno.name}`,
          value,
          paymentMethod,
          observations
        );

        // Atualizar a prestação específica para marcá-la como paga
        pagamentosFinais = pagamentosAtuais.map(pagamento => {
          if (pagamento === selectedInstallment) {
            return {
              ...pagamento,
              isPago: true,
              method: paymentMethod,
              metodo: paymentMethod,
              paymentMethod: paymentMethod,
              date: Timestamp.now(),
              data: Timestamp.now(),
              movimentoId: movimentoId,
              observations: observations.trim(),
              observacoes: observations.trim()
            };
          }
          return pagamento;
        });

        await updateDoc(alunoRef, {
          pagamentos: pagamentosFinais,
          updatedAt: Timestamp.now()
        });
      } else {
        // Criar novo pagamento (lógica original)
        const movimentoId = typePagamento === 'pronto' ? 
          await registrarMovimento(
            'pagamento',
            `Pagamento a pronto - ${aluno.name}`,
            value,
            paymentMethod,
            observations
          ) : 
          null; // Prestações não criam movimento até serem pagas

        const novoPagamento = {
          type: typePagamento,
          value: value,
          date: Timestamp.now(),
          data: Timestamp.now(),
          observations: observations.trim(),
          observacoes: observations.trim(),
          movimentoId: movimentoId, // Referência ao movimento
          createdAt: Timestamp.now(),
          // Campos específicos para pagamento a pronto
          ...(typePagamento === 'pronto' && {
            method: paymentMethod,
            metodo: paymentMethod,
            paymentMethod: paymentMethod
          }),
          // Campos específicos para pagamento por prestação
          ...(typePagamento === 'prestacao' && {
            dataMaximaPagamento: dataMaximaPagamento ? 
              Timestamp.fromDate(new Date(dataMaximaPagamento + 'T00:00:00')) : 
              null,
            valorPrestacao: parseFloat(valorPrestacao),
            isPago: false, // Inicialmente não pago
            method: null, // Método só será definido quando for pago
            metodo: null, // Método só será definido quando for pago
            paymentMethod: null // Método só será definido quando for pago
          })
        };
        pagamentosFinais = [...pagamentosAtuais, novoPagamento];

        // Calcular nova dívida total
        const novaDividaTotal = calcularTotalGeralComPagamentos(pagamentosFinais);

        await updateDoc(alunoRef, {
          pagamentos: pagamentosFinais,
          totalDivida: novaDividaTotal,
          updatedAt: Timestamp.now()
        });
      }

      // Chamar onSuccess para recarregar dados (sem await para não bloquear)
      // O handlePagamentoSuccess já vai fazer o refreshAlunoData
      if (onSuccess) {
        onSuccess(); // Removido await - refreshAlunoData já faz a atualização
      }
      onClose();
      
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      setError('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };


  const registrarMovimento = async (tipo, descricao, valor, metodoPagamento, observacoes = '') => {
    try {
      const movementsRef = collection(db, 'schools', escolaId, 'movements');
      const movimento = {
        type: 'pagamento',
        description: descricao,
        value: valor, // Valor positivo para pagamentos
        quantity: 1,
        paymentMethod: metodoPagamento,
        date: Timestamp.now(), // Sempre usar data/hora atual para pagamentos efetivos
        typeOperacao: tipo,
        alunoId: aluno.id,
        alunoName: aluno.name,
        observations: observacoes,
        naoAfetarFinanceiro: naoAfetarFinanceiro, // Flag para não afetar visão financeira
        createdAt: Timestamp.now()
      };

      const movimentoRef = await addDoc(movementsRef, movimento);
      return movimentoRef.id; // Retornar ID do movimento
    } catch (err) {
      console.error('Erro ao registrar movimento:', err);
      // Não falhar a operação principal por causa do movimento
      return null;
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEtapa(1);
      setTipoPagamento('');
      setMetodoPagamento('dinheiro');
      setValorPago('');
      setPaymentDate('');
      setObservacoes('');
      setNaoAfetarFinanceiro(false);
      setError('');
      setDataMaximaPagamento('');
      setValorPrestacao('');
      onClose();
    }
  };


  if (!isOpen || !aluno) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💳 Pagamento - {aluno.name}</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <div className="pagamento-form">
          {/* Resumo de Dívidas */}
          <div className="resumo-section">
            <h3>Resumo de Dívidas</h3>
            <div className="resumo-item">
              <span>Serviços:</span>
              <span>{formatPrice(totalServicos)}</span>
            </div>
            <div className="resumo-item">
              <span>Materiais:</span>
              <span>{formatPrice(totalMateriais)}</span>
            </div>
            {totalPagamentos > 0 && (
              <div className="resumo-item pagamentos">
                <span>Já Pago:</span>
                <span className="ja-pago">-{formatPrice(totalPagamentos)}</span>
              </div>
            )}
            <div className="resumo-total">
              <span>Total em Dívida:</span>
              <span>{formatPrice(totalGeral)}</span>
            </div>
          </div>

          {/* Etapa 1: Escolher Tipo de Pagamento */}
          {etapa === 1 && (
            <div className="etapa-type">
              <h3>Escolha o Tipo de Pagamento</h3>
              <div className="type-options">
                <button
                  type="button"
                  className="type-option pronto"
                  onClick={() => handleEscolherTipo('pronto')}
                  disabled={isLoading}
                >
                  <div className="type-icon">💰</div>
                  <div className="type-content">
                    <h4>Pagamento a Pronto</h4>
                    <p>Pagar o value total de uma vez</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  className="type-option prestacoes"
                  onClick={() => handleEscolherTipo('prestacao')}
                  disabled={isLoading}
                >
                  <div className="type-icon">💳</div>
                  <div className="type-content">
                    <h4>Pagamento por Prestação</h4>
                    <p>Definir valor e data máxima para pagamento</p>
                    </div>
                </button>
              </div>
            </div>
          )}

          {/* Etapa 2: Detalhes do Pagamento */}
          {etapa === 2 && (
            <form onSubmit={handleSubmit} className="etapa-detalhes">

              <div className="etapa-header">
                <h3>
                  {typePagamento === 'pronto' ? '💰 Pagamento a Pronto' : '💳 Pagamento por Prestação'}
                </h3>
                <button
                  type="button"
                  className="voltar-button"
                  onClick={handleVoltar}
                  disabled={isLoading}
                >
                  ← Voltar
                </button>
              </div>

              {/* Valor do Pagamento - apenas para pagamentos a pronto */}
              {typePagamento === 'pronto' && (
                <div className="form-group">
                  <label htmlFor="valuePago">Valor a Pagar *</label>
                  <div className="input-with-currency">
                      <input
                        type="number"
                        id="valuePago"
                        value={valuePago}
                        onChange={(e) => setValorPago(e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        className="form-input"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max={totalGeral}
                        required
                        disabled={isLoading}
                      />
                    <span className="currency-symbol">€</span>
                  </div>
                  <small>Máximo: {formatPrice(totalGeral)}</small>
                </div>
              )}

              {/* Método de Pagamento - apenas para pagamentos a pronto */}
              {typePagamento === 'pronto' && (
                <div className="form-group">
                  <label htmlFor="paymentMethod">Método de Pagamento *</label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setMetodoPagamento(e.target.value)}
                    className="form-input"
                    required
                    disabled={isLoading}
                  >
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="transferencia">🏦 Transferência</option>
                    <option value="multibanco">💳 Multibanco</option>
                  </select>
                </div>
              )}

              {/* Data do Pagamento - apenas para pagamentos a pronto */}
              {typePagamento === 'pronto' && (
                <div className="form-group">
                  <label htmlFor="paymentDate">Data do Pagamento</label>
                  <input
                    type="date"
                    id="paymentDate"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="form-input"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Campos específicos para pagamento por prestação */}
              {typePagamento === 'prestacao' && (
                <>
                  <div className="form-group">
                    <label htmlFor="valorPrestacao">Valor da Prestação *</label>
                    <div className="input-with-currency">
                      <input
                        type="number"
                        id="valorPrestacao"
                        value={valorPrestacao}
                        onChange={(e) => setValorPrestacao(e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        className="form-input"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max={totalGeral}
                        required
                        disabled={isLoading}
                      />
                      <span className="currency-symbol">€</span>
                    </div>
                    <small>Máximo: {formatPrice(totalGeral)}</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="dataMaximaPagamento">Data Máxima para Pagamento *</label>
                    <input
                      type="date"
                      id="dataMaximaPagamento"
                      value={dataMaximaPagamento}
                      onChange={(e) => setDataMaximaPagamento(e.target.value)}
                      className="form-input"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}

              {/* Observações */}
              <div className="form-group">
                <label htmlFor="observations">Observações</label>
                <textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="form-textarea"
                  placeholder="Notas sobre o pagamento..."
                  rows="3"
                  disabled={isLoading}
                />
              </div>

              {/* Opção de não afetar visão financeira */}
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={naoAfetarFinanceiro}
                    onChange={(e) => setNaoAfetarFinanceiro(e.target.checked)}
                    disabled={isLoading}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">
                    📊 Não afetar visão financeira
                  </span>
                </label>
                <p className="checkbox-description">
                  Se marcado, o pagamento será registado nos movimentos mas não será considerado nos cálculos financeiros.
                </p>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'A processar...' : 'Registar Pagamento'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PagamentoModal;
