import React, { useState } from 'react';
import { collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './AdicionarDespesaModal.css';

const AdicionarDespesaModal = ({ isOpen, onClose, onSuccess, escolaId, typesDespesa, categoriasDespesa }) => {
  const { userData } = useAuth();
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedSubcategoria, setSelectedSubcategoria] = useState('');
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    value: '',
    fornecedor: '',
    observations: ''
  });
  const [paymentMethod, setMetodoPagamento] = useState('dinheiro');
  const [naoAfetarFinanceiro, setNaoAfetarFinanceiro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategoria) {
      setError('Por favor, selecione a categoria de despesa');
      return;
    }

    // If category has subcategories, require one
    const catObj = (categoriasDespesa || []).find(c => c.id === selectedCategoria);
    if (catObj && catObj.subcategorias.length > 0 && !selectedSubcategoria) {
      setError('Por favor, selecione a subcategoria de despesa');
      return;
    }

    if (!formData.description.trim()) {
      setError('Por favor, insira uma descrição');
      return;
    }

    if (!formData.value || isNaN(parseFloat(formData.value)) || parseFloat(formData.value) <= 0) {
      setError('Por favor, insira um value válido');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const value = parseFloat(formData.value);

      // Resolve category and subcategory info
      const catObj = (categoriasDespesa || []).find(c => c.id === selectedCategoria);
      const subObj = catObj ? catObj.subcategorias.find(s => s.id === selectedSubcategoria) : null;
      const tipoId = selectedSubcategoria || selectedCategoria;
      const tipoNome = subObj ? subObj.nome : (catObj ? catObj.nome : tipoId);

      const despesaData = {
        tipo: tipoId, // Backwards compat
        type: tipoId,
        typeNome: tipoNome,
        categoria: selectedCategoria,
        categoriaNome: catObj?.nome || selectedCategoria,
        subcategoria: selectedSubcategoria || null,
        subcategoriaNome: subObj?.nome || null,
        description: formData.description.trim(),
        value: value,
        fornecedor: formData.fornecedor.trim() || null,
        observations: formData.observations.trim() || null,
        paymentMethod: paymentMethod,
        naoAfetarFinanceiro: naoAfetarFinanceiro,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: userData?.name || 'Desconhecido',
        createdByUserId: userData?.id || null
      };

      const despesasRef = collection(db, 'schools', escolaId, 'despesas');
      const despesaRef = await addDoc(despesasRef, despesaData);
      const despesaId = despesaRef.id;

      // Registrar movimento de pagamento
      const movimentoId = await registrarMovimento(despesaData, despesaId);

      // Atualizar despesa com ID do movimento
      if (movimentoId) {
        await updateDoc(despesaRef, { movimentoId: movimentoId });
      }

      // Limpar formulário
      setFormData({
        type: '',
        description: '',
        value: '',
        fornecedor: '',
        observations: ''
      });
      setSelectedCategoria('');
      setSelectedSubcategoria('');
      setMetodoPagamento('dinheiro');
      setNaoAfetarFinanceiro(false);

      onSuccess();
      
    } catch (err) {
      console.error('Erro ao adicionar despesa:', err);
      setError('Erro ao adicionar despesa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const registrarMovimento = async (despesaData, despesaId) => {
    try {
      const movementsRef = collection(db, 'schools', escolaId, 'movements');
      const movimento = {
        type: 'despesa',
        description: `${despesaData.typeNome} - ${despesaData.description}`,
        value: -despesaData.value, // Valor negativo para despesas
        quantity: 1,
        paymentMethod: despesaData.paymentMethod,
        date: despesaData.date,
        typeOperacao: 'despesa',
        despesaId: despesaId, // Ligação à despesa
        fornecedor: despesaData.fornecedor,
        observations: despesaData.observations,
        naoAfetarFinanceiro: despesaData.naoAfetarFinanceiro,
        createdBy: userData?.name || 'Desconhecido',
        createdByUserId: userData?.id || null,
        createdAt: serverTimestamp()
      };

      const movimentoRef = await addDoc(movementsRef, movimento);
      return movimentoRef.id; // Retornar ID do movimento para ligação
    } catch (err) {
      console.error('Erro ao registrar movimento:', err);
      // Não falhar a operação principal por causa do movimento
      return null;
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        type: '',
        description: '',
        value: '',
        fornecedor: '',
        observations: ''
      });
      setSelectedCategoria('');
      setSelectedSubcategoria('');
      setMetodoPagamento('dinheiro');
      setNaoAfetarFinanceiro(false);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Despesa</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="despesa-form">
          <div className="form-group">
            <label htmlFor="categoria">Categoria *</label>
            <select
              id="categoria"
              value={selectedCategoria}
              onChange={(e) => {
                setSelectedCategoria(e.target.value);
                setSelectedSubcategoria('');
              }}
              className="form-input"
              required
              disabled={isLoading}
            >
              <option value="">Selecione a categoria</option>
              {(categoriasDespesa || []).map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.nome}
                </option>
              ))}
            </select>
          </div>

          {selectedCategoria && (() => {
            const catObj = (categoriasDespesa || []).find(c => c.id === selectedCategoria);
            if (!catObj || catObj.subcategorias.length === 0) return null;
            return (
              <div className="form-group">
                <label htmlFor="subcategoria">Subcategoria *</label>
                <select
                  id="subcategoria"
                  value={selectedSubcategoria}
                  onChange={(e) => setSelectedSubcategoria(e.target.value)}
                  className="form-input"
                  required
                  disabled={isLoading}
                >
                  <option value="">Selecione a subcategoria</option>
                  {catObj.subcategorias.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.icon} {sub.nome}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          <div className="form-group">
            <label htmlFor="description">Descrição *</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Ex: Conta da água de janeiro"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="value">Valor *</label>
              <div className="input-with-currency">
                <input
                  type="number"
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  onWheel={(e) => e.target.blur()}
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={isLoading}
                />
                <span className="currency-symbol">€</span>
              </div>
            </div>

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
                <option value="dinheiro">Dinheiro</option>
                <option value="multibanco">Multibanco</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fornecedor">Fornecedor</label>
            <input
              type="text"
              id="fornecedor"
              name="fornecedor"
              value={formData.fornecedor}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Ex: EDP, Águas de Portugal, etc."
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="observations">Observações</label>
            <textarea
              id="observations"
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Notas adicionais sobre esta despesa..."
              rows="3"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={naoAfetarFinanceiro}
                onChange={(e) => setNaoAfetarFinanceiro(e.target.checked)}
                disabled={isLoading}
                className="checkbox-input"
              />
              <span className="checkbox-text">
                🚫 Não afetar a visão financeira
              </span>
            </label>
            <p className="checkbox-description">
              Marque esta opção se esta despesa não deve ser incluída nos cálculos financeiros gerais
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
              {isLoading ? 'A adicionar...' : 'Adicionar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarDespesaModal;
