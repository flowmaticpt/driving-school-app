import React, { useState, useMemo } from 'react';
import { doc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatPrice } from '../utils/formatters';
import './PagamentoModal.css';

const METODOS_PAGAMENTO = [
  { value: 'dinheiro', label: '💵 Dinheiro' },
  { value: 'transferencia', label: '🏦 Transferência' },
  { value: 'multibanco', label: '💳 Multibanco' },
];

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
  // Parcelas: array de {method, value} para pagamento parcial
  const [parcelas, setParcelas] = useState([{ method: 'dinheiro', value: '' }]);
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
        setTipoPagamento('pronto');
        setParcelas([{ method: 'dinheiro', value: selectedInstallment.value.toString() }]);
        setEtapa(2);
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

      if (tipo === 'pagamento' && pagamento.valor) {
        return total + parseFloat(pagamento.valor);
      }

      if (tipo === 'pronto' && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }

      if (tipo === 'prestacao' && pagamento.isPago === true) {
        return total + parseFloat(pagamento.valorPrestacao || pagamento.value || 0);
      }

      if (pagamento.isPago === true && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }

      return total;
    }, 0);
  }, [aluno.pagamentos]);

  const totalGeral = useMemo(() => {
    return (totalServicos + totalMateriais) - totalPagamentos;
  }, [totalServicos, totalMateriais, totalPagamentos]);

  // Soma das parcelas actuais
  const somaParcelas = useMemo(() => {
    return parcelas.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
  }, [parcelas]);

  // Funções wrapper para compatibilidade
  const calcularTotalServicos = () => totalServicos;
  const calcularTotalMateriais = () => totalMateriais;

  // Função para calcular dívida com pagamentos específicos (usada para atualizações)
  const calcularTotalGeralComPagamentos = (pagamentos) => {
    const tServicos = calcularTotalServicos();
    const tMateriais = calcularTotalMateriais();

    const tPagamentos = pagamentos.reduce((total, pagamento) => {
      const tipo = pagamento.tipo || pagamento.type;

      if (tipo === 'pagamento' && pagamento.valor) {
        return total + parseFloat(pagamento.valor);
      }

      if (tipo === 'pronto' && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }

      if (tipo === 'prestacao' && pagamento.isPago === true) {
        return total + parseFloat(pagamento.valorPrestacao || pagamento.value || 0);
      }

      if (pagamento.isPago === true && pagamento.value) {
        return total + parseFloat(pagamento.value);
      }

      return total;
    }, 0);

    return (tServicos + tMateriais) - tPagamentos;
  };

  // --- Parcelas helpers ---
  const handleParcelaChange = (index, field, val) => {
    setParcelas(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
    setError('');
  };

  const handleAddParcela = () => {
    setParcelas(prev => [...prev, { method: 'dinheiro', value: '' }]);
  };

  const handleRemoveParcela = (index) => {
    setParcelas(prev => prev.filter((_, i) => i !== index));
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
    setParcelas([{ method: 'dinheiro', value: '' }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- Validações para pagamento a pronto ---
    if (typePagamento === 'pronto') {
      // Validar que todas as parcelas têm valor > 0
      for (let i = 0; i < parcelas.length; i++) {
        const v = parseFloat(parcelas[i].value);
        if (!parcelas[i].value || isNaN(v) || v <= 0) {
          setError(`Parcela ${i + 1}: insira um valor válido`);
          return;
        }
      }

      // Validar soma
      const soma = parcelas.reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
      const somaArredondada = Math.round(soma * 100) / 100;

      if (somaArredondada <= 0) {
        setError('O valor total deve ser superior a 0');
        return;
      }

      if (somaArredondada > Math.round(totalGeral * 100) / 100) {
        setError('O valor total não pode ser superior ao total em dívida');
        return;
      }

      if (!paymentDate) {
        setError('Por favor, selecione a data do pagamento');
        return;
      }
    }

    // --- Validações para prestação ---
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

    // Determinar o valor total baseado no tipo
    const value = typePagamento === 'prestacao'
      ? parseFloat(valorPrestacao)
      : Math.round(parcelas.reduce((s, p) => s + (parseFloat(p.value) || 0), 0) * 100) / 100;

    setIsLoading(true);
    setError('');

    try {
      const alunoRef = doc(db, 'schools', escolaId, 'students', aluno.id);
      const pagamentosAtuais = aluno.pagamentos || [];
      let pagamentosFinais = [];

      // Determinar o método principal (para backwards compat)
      // Se só uma parcela, o método é directo; se várias, fica 'misto'
      const metodoPrincipal = parcelas.length === 1 ? parcelas[0].method : 'misto';

      if (selectedInstallment) {
        // Pagamento de prestação específica existente
        const movimentoId = await registrarMovimento(
          'pagamento',
          `Pagamento de prestação ${selectedInstallment.numeroPrestacao || 1} - ${aluno.name}`,
          value,
          metodoPrincipal,
          observations
        );

        pagamentosFinais = pagamentosAtuais.map(pagamento => {
          if (pagamento === selectedInstallment) {
            return {
              ...pagamento,
              isPago: true,
              method: metodoPrincipal,
              metodo: metodoPrincipal,
              paymentMethod: metodoPrincipal,
              // Guardar parcelas se mais de 1 método
              ...(parcelas.length > 1 && {
                parcelas: parcelas.map(p => ({
                  method: p.method,
                  value: parseFloat(p.value)
                }))
              }),
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
        // Criar novo pagamento
        const movimentoId = typePagamento === 'pronto' ?
          await registrarMovimento(
            'pagamento',
            parcelas.length > 1
              ? `Pagamento misto (${parcelas.map(p => formatPrice(parseFloat(p.value))).join(' + ')}) - ${aluno.name}`
              : `Pagamento a pronto - ${aluno.name}`,
            value,
            metodoPrincipal,
            observations
          ) :
          null;

        const novoPagamento = {
          type: typePagamento,
          value: value,
          date: Timestamp.now(),
          data: Timestamp.now(),
          observations: observations.trim(),
          observacoes: observations.trim(),
          movimentoId: movimentoId,
          createdAt: Timestamp.now(),
          // Campos específicos para pagamento a pronto
          ...(typePagamento === 'pronto' && {
            method: metodoPrincipal,
            metodo: metodoPrincipal,
            paymentMethod: metodoPrincipal,
            // Guardar parcelas se mais de 1 método
            ...(parcelas.length > 1 && {
              parcelas: parcelas.map(p => ({
                method: p.method,
                value: parseFloat(p.value)
              }))
            })
          }),
          // Campos específicos para pagamento por prestação
          ...(typePagamento === 'prestacao' && {
            dataMaximaPagamento: dataMaximaPagamento ?
              Timestamp.fromDate(new Date(dataMaximaPagamento + 'T00:00:00')) :
              null,
            valorPrestacao: parseFloat(valorPrestacao),
            isPago: false,
            method: null,
            metodo: null,
            paymentMethod: null
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

      if (onSuccess) {
        onSuccess();
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
        value: valor,
        quantity: 1,
        paymentMethod: metodoPagamento,
        date: Timestamp.now(),
        typeOperacao: tipo,
        alunoId: aluno.id,
        alunoName: aluno.name,
        observations: observacoes,
        naoAfetarFinanceiro: naoAfetarFinanceiro,
        createdAt: Timestamp.now()
      };

      const movimentoRef = await addDoc(movementsRef, movimento);
      return movimentoRef.id;
    } catch (err) {
      console.error('Erro ao registrar movimento:', err);
      return null;
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEtapa(1);
      setTipoPagamento('');
      setParcelas([{ method: 'dinheiro', value: '' }]);
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
                    <p>Pagar com um ou mais métodos</p>
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

              {/* --- Pagamento a pronto: parcelas --- */}
              {typePagamento === 'pronto' && (
                <>
                  <div className="parcelas-section">
                    <label className="parcelas-label">Métodos de Pagamento *</label>

                    {parcelas.map((parcela, index) => (
                      <div key={index} className="parcela-row">
                        <select
                          value={parcela.method}
                          onChange={(e) => handleParcelaChange(index, 'method', e.target.value)}
                          className="form-input parcela-method"
                          disabled={isLoading}
                        >
                          {METODOS_PAGAMENTO.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <div className="input-with-currency parcela-value-wrap">
                          <input
                            type="number"
                            value={parcela.value}
                            onChange={(e) => handleParcelaChange(index, 'value', e.target.value)}
                            onWheel={(e) => e.target.blur()}
                            className="form-input parcela-value"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            required
                            disabled={isLoading}
                          />
                          <span className="currency-symbol">€</span>
                        </div>
                        {parcelas.length > 1 && (
                          <button
                            type="button"
                            className="parcela-remove"
                            onClick={() => handleRemoveParcela(index)}
                            disabled={isLoading}
                            title="Remover método"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      className="parcela-add"
                      onClick={handleAddParcela}
                      disabled={isLoading}
                    >
                      + Adicionar método de pagamento
                    </button>

                    {/* Resumo das parcelas */}
                    <div className="parcelas-resumo">
                      <span>Total:</span>
                      <span className={somaParcelas > totalGeral ? 'valor-excesso' : ''}>
                        {formatPrice(somaParcelas)}
                      </span>
                    </div>
                    <small>Máximo: {formatPrice(totalGeral)}</small>
                  </div>
                </>
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
