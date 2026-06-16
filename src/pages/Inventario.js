import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import AdicionarMaterialModal from '../components/AdicionarMaterialModal';
import ReabastecerMaterialModal from '../components/ReabastecerMaterialModal';
import VerFichaMaterialModal from '../components/VerFichaMaterialModal';
import ConfirmarRemocaoMaterialModal from '../components/ConfirmarRemocaoMaterialModal';
import { formatPrice, formatDate } from '../utils/formatters';
import './Inventario.css';

const Inventario = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const [escola, setEscola] = useState(null);
  const [materials, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showVerFichaModal, setShowVerFichaModal] = useState(false);
  const [showReabastecerModal, setShowReabastecerModal] = useState(false);
  const [showRemoverModal, setShowRemoverModal] = useState(false);

  const fetchEscola = async () => {
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);

      if (!escolaSnap.exists()) {
        setError('Escola não encontrada');
        return;
      }

      const escolaData = {
        id: escolaSnap.id,
        ...escolaSnap.data()
      };

      setEscola(escolaData);
    } catch (err) {
      setError('Erro ao carregar dados da escola');
    }
  };

  const calculateStock = (reabastecimentos) => {
    if (!reabastecimentos || reabastecimentos.length === 0) {
      return 0;
    }
    return reabastecimentos.reduce((total, reabastecimento) => {
      return total + (reabastecimento.quantity || 0);
    }, 0);
  };

  const getCurrentPrice = (reabastecimentos) => {
    if (!reabastecimentos || reabastecimentos.length === 0) {
      return 0;
    }
    // Pegar o último reabastecimento (o mais recente)
    const lastReabastecimento = reabastecimentos[reabastecimentos.length - 1];
    return lastReabastecimento.unitPrice || 0;
  };

  const fetchMateriais = async () => {
    try {
      const materialsRef = collection(db, 'schools', escolaId, 'materials');
      const querySnapshot = await getDocs(materialsRef);
      
      if (querySnapshot.empty) {
        setMateriais([]);
        return;
      }
      
      const materialsData = querySnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        // Calcular stock a partir dos reabastecimentos
        data.stock = calculateStock(data.reabastecimentos);
        // Obter preço atual do último reabastecimento
        data.currentPrice = getCurrentPrice(data.reabastecimentos);
        return data;
      });
      
      setMateriais(materialsData);
    } catch (err) {
      setError('Erro ao carregar materiais');
    }
  };

  useEffect(() => {
    if (escolaId) {
      const loadData = async () => {
        setLoading(true);
        await fetchEscola();
        await fetchMateriais();
        setLoading(false);
      };
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaId]);

  const handleSuccess = async () => {
    await fetchMateriais();
    setIsModalOpen(false);
    
    if (selectedMaterial) {
      const materialAtualizado = materials.find(m => m.id === selectedMaterial.id);
      if (materialAtualizado) {
        setSelectedMaterial(materialAtualizado);
      }
    }
  };

  const handleVerFicha = (material) => {
    setSelectedMaterial(material);
    setShowVerFichaModal(true);
  };

  const handleReabastecer = (material) => {
    setSelectedMaterial(material);
    setShowReabastecerModal(true);
  };

  const handleRemover = (material) => {
    setSelectedMaterial(material);
    setShowRemoverModal(true);
  };

  const filteredMateriais = materials.filter(material => {
    if (!searchTerm || typeof searchTerm !== 'string') return true;
    
    const searchLower = searchTerm.toLowerCase();
    const name = (material.name || '').toLowerCase();
    const description = (material.description || '').toLowerCase();
    const price = (material.currentPrice || 0)?.toString();
    
    return name.includes(searchLower) || 
           description.includes(searchLower) || 
           price?.includes(searchLower);
  });


  if (loading) {
    return (
      <div className="inventario-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar inventário...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventario-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="error-container">
          <h2>Erro</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/escolas')} className="retry-button">
            Voltar às Escolas
          </button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="inventario-container">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
        <div className="error-container">
          <h2>Escola não encontrada</h2>
          <p>A escola solicitada não existe.</p>
          <button onClick={() => navigate('/escolas')} className="retry-button">
            Voltar às Escolas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inventario-container">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} showUserActions={true} />
      
      <div className="inventario-content">
        <div className="page-header">
          <h1>Inventário - {escola.name}</h1>
          <p>Gerir materiais desta escola</p>
        </div>

        <div className="inventario-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Pesquisar materiais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="button-group">
            <button
              onClick={() => setIsModalOpen(true)}
              className="add-button"
            >
              + Adicionar Material
            </button>
          </div>
        </div>

        <div className="inventario-stats">
          <div className="stat-card">
            <h3>Total de Materiais</h3>
            <span className="stat-number">{materials.length}</span>
          </div>
          <div className="stat-card">
            <h3>Materiais Ativos</h3>
            <span className="stat-number">
              {materials.filter(material => material.isActive !== false).length}
            </span>
          </div>
        </div>

        {filteredMateriais.length === 0 ? (
          <div className="no-materials">
            <h3>Nenhum material encontrado</h3>
            <p>
              {searchTerm 
                ? 'Nenhum material corresponde à sua pesquisa.' 
                : 'Esta escola ainda não tem materiais registados.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="add-button"
              >
                Adicionar Primeiro Material
              </button>
            )}
          </div>
        ) : (
          <div className="materials-grid">
            {filteredMateriais.map((material) => (
              <div key={material.id} className="material-card">
                <div className="material-header">
                  <h3>{material.name}</h3>
                  <span className={`status-badge ${material.isActive !== false ? 'active' : 'inactive'}`}>
                    {material.isActive !== false ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                <div className="material-info">
                  <p className="material-description">
                    {material.description || 'Sem descrição'}
                  </p>
                  
                  <div className="material-details">
                    <div className="detail-item">
                      <span className="label">Preço:</span>
                      <span className="value">{formatPrice(material.currentPrice || 0)}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="label">Stock:</span>
                      <span className="value">{material.stock || 0} unidades</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="label">Criado em:</span>
                      <span className="value">{formatDate(material.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="material-actions">
                  <button
                    onClick={() => handleVerFicha(material)}
                    className="view-button"
                  >
                    Ver Detalhes
                  </button>
                  <button
                    onClick={() => handleReabastecer(material)}
                    className="reabastecer-button"
                  >
                    Reabastecer
                  </button>
                  <button
                    onClick={() => handleRemover(material)}
                    className="remove-button"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Adicionar Material */}
      <AdicionarMaterialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        escolaId={escolaId}
      />

      {/* Modal de Ver Ficha */}
      {selectedMaterial && (
        <VerFichaMaterialModal
          isOpen={showVerFichaModal}
          onClose={() => {
            setShowVerFichaModal(false);
            setSelectedMaterial(null);
          }}
          onSuccess={handleSuccess}
          material={selectedMaterial}
          escolaId={escolaId}
        />
      )}

      {/* Modal de Reabastecer */}
      {selectedMaterial && (
        <ReabastecerMaterialModal
          isOpen={showReabastecerModal}
          onClose={() => {
            setShowReabastecerModal(false);
            setSelectedMaterial(null);
          }}
          onSuccess={handleSuccess}
          material={selectedMaterial}
          escolaId={escolaId}
        />
      )}

      {/* Modal de Confirmação de Remoção */}
      {selectedMaterial && (
        <ConfirmarRemocaoMaterialModal
          isOpen={showRemoverModal}
          onClose={() => {
            setShowRemoverModal(false);
            setSelectedMaterial(null);
          }}
          onConfirm={async () => {
            try {
              const materialRef = doc(db, 'schools', escolaId, 'materials', selectedMaterial.id);
              await deleteDoc(materialRef);
              await handleSuccess();
            } catch (error) {
              console.error('Erro ao remover material:', error);
              throw error;
            }
          }}
          material={selectedMaterial}
          escolaId={escolaId}
        />
      )}
    </div>
  );
};

export default Inventario;