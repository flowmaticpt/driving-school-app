import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './ReabastecerMaterialModal.css';

const ReabastecerMaterialModal = ({ isOpen, onClose, material, escolaId, onSuccess }) => {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    quantity: '',
    price: ''
  });
  const [paymentMethod, setMetodoPagamento] = useState('dinheiro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (material) {
      // Obter preço atual do último reabastecimento
      let currentPrice = '';
      if (material.reabastecimentos && material.reabastecimentos.length > 0) {
        const lastReabastecimento = material.reabastecimentos[material.reabastecimentos.length - 1];
        currentPrice = lastReabastecimento.unitPrice || '';
      }
      if (!currentPrice) {
        currentPrice = material.unitPrice || material.price || '';
      }
      
      setFormData({
        quantity: '',
        price: currentPrice
      });
    }
  }, [material]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    return quantity * price;
  };

  const registrarMovimento = async (type, description, value, paymentMethod, quantity = 1, materialId = null) => {
    try {
      const movementsRef = collection(db, 'schools', escolaId, 'movements');
      const movimento = {
        type: type,
        description: description,
        value: -value, // Valor negativo para despesas
        quantity: quantity,
        paymentMethod: paymentMethod,
        date: serverTimestamp(),
        typeOperacao: 'reabastecimento', // Para distinguir de compras de alunos
        materialId: materialId, // Ligação ao material
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

  const criarDespesa = async (materialData, movimentoId) => {
    try {
      const despesasRef = collection(db, 'schools', escolaId, 'despesas');
      const despesaData = {
        type: 'materials',
        typeNome: 'Materiais',
        description: `Reabastecimento: ${materialData.name}`,
        value: materialData.quantity * materialData.price,
        fornecedor: null,
        observations: `Quantidade: ${materialData.quantity}x | Preço unitário: ${materialData.price}€`,
        paymentMethod: paymentMethod,
        date: serverTimestamp(),
        materialId: materialData.id, // Ligação ao material
        movimentoId: movimentoId, // Ligação ao movimento
        createdAt: serverTimestamp()
      };

      const despesaRef = await addDoc(despesasRef, despesaData);
      return despesaRef.id; // Retornar ID da despesa
    } catch (err) {
      console.error('Erro ao criar despesa:', err);
      // Não falhar a operação principal por causa da despesa
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.quantity || isNaN(parseFloat(formData.quantity)) || parseFloat(formData.quantity) <= 0) {
      setError('Por favor, insira uma quantity válida.');
      return;
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      setError('Por favor, insira um preço válido.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const quantity = parseFloat(formData.quantity);
      const price = parseFloat(formData.price);
      const total = quantity * price;

      const materialRef = doc(db, 'schools', escolaId, 'materials', material.id);
      
      // Adicionar novo reabastecimento à lista existente
      const novoReabastecimento = {
        quantity: quantity,
        unitPrice: price,
        totalPrice: total,
        date: Timestamp.now(),
        type: 'reabastecimento'
      };

      const reabastecimentosAtualizados = [
        ...(material.reabastecimentos || []),
        novoReabastecimento
      ];

      await updateDoc(materialRef, {
        reabastecimentos: reabastecimentosAtualizados,
        unitPrice: price, // Atualizar preço unitário atual
        price: price, // Manter compatibilidade
        updatedAt: serverTimestamp()
      });

      // Registrar movimento de pagamento
      const valueTotal = quantity * price;
      const movimentoId = await registrarMovimento(
        'material',
        `${material.name} (${quantity}x) - Reabastecimento`,
        valueTotal,
        paymentMethod,
        quantity,
        material.id
      );

      // Criar despesa correspondente
      const despesaId = await criarDespesa({
        id: material.id,
        name: material.name,
        quantity: quantity,
        price: price
      }, movimentoId);

      // Atualizar movimento com despesaId
      if (despesaId && movimentoId) {
        const movimentoRef = doc(db, 'schools', escolaId, 'movements', movimentoId);
        await updateDoc(movimentoRef, { despesaId: despesaId });
      }

      onSuccess();
      handleClose();
      
    } catch (err) {
      console.error('Erro ao reabastecer material:', err);
      setError('Erro ao reabastecer material. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        quantity: '',
        price: ''
      });
      setMetodoPagamento('dinheiro');
      setError('');
      onClose();
    }
  };

  if (!isOpen || !material) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Reabastecer Material</h2>
          <button className="close-button" onClick={handleClose} disabled={isLoading}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="material-info">
            <h3>{material.name}</h3>
            {material.description && (
              <p className="material-description">{material.description}</p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity">
                Quantidade <span className="required">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                onWheel={(e) => e.target.blur()}
                placeholder="0"
                step="1"
                min="1"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">
                Preço Unitário <span className="required">*</span>
              </label>
              <div className="price-input-container">
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={isLoading}
                />
                <span className="currency-symbol">€</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="paymentMethod">Método de Pagamento</label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setMetodoPagamento(e.target.value)}
              className="edit-input"
            >
              <option value="dinheiro">Dinheiro</option>
              <option value="multibanco">Multibanco</option>
              <option value="transferencia">Transferência</option>
            </select>
          </div>

          <div className="total-section">
            <div className="total-display">
              <span className="total-label">Total do Reabastecimento:</span>
              <span className="total-value">
                {new Intl.NumberFormat('pt-PT', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(calculateTotal())}
              </span>
            </div>
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
              {isLoading ? 'Reabastecendo...' : 'Reabastecer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReabastecerMaterialModal;
