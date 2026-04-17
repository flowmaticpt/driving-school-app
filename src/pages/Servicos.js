import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import AdicionarNovoServicoModal from '../components/AdicionarNovoServicoModal';
import VerFichaServicoModal from '../components/VerFichaServicoModal';
import ConfirmarRemocaoServicoModal from '../components/ConfirmarRemocaoServicoModal';
import './Servicos.css';

const Servicos = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();
  const [escola, setEscola] = useState(null);
  const [services, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServico, setSelectedServico] = useState(null);
  const [showVerFichaModal, setShowVerFichaModal] = useState(false);
  const [showRemoverModal, setShowRemoverModal] = useState(false);

  const fetchEscola = async () => {
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);

      if (!escolaSnap.exists()) {
        setError('Escola não encontrada');
        return;
      }

      setEscola({
        id: escolaSnap.id,
        ...escolaSnap.data()
      });
    } catch (err) {
      console.error('Erro ao buscar escola:', err);
      setError('Erro ao carregar dados da escola');
    }
  };

  const fetchServicos = async () => {
    try {
      const servicesRef = collection(db, 'schools', escolaId, 'services');
      const q = query(servicesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const servicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setServicos(servicesData);
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
      setError('Erro ao carregar serviços');
    }
  };

  useEffect(() => {
    if (escolaId) {
      const loadData = async () => {
        setLoading(true);
        await fetchEscola();
        await fetchServicos();
        setLoading(false);
      };
      loadData();
    }
  }, [escolaId]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    fetchServicos(); // Recarregar lista de serviços
    setIsModalOpen(false);
  };

  const handleVerFicha = (servico) => {
    setSelectedServico(servico);
    setShowVerFichaModal(true);
  };

  const handleRemover = (servico) => {
    setSelectedServico(servico);
    setShowRemoverModal(true);
  };

  const handleCloseVerFicha = () => {
    setShowVerFichaModal(false);
    setSelectedServico(null);
  };

  const handleCloseRemover = () => {
    setShowRemoverModal(false);
    setSelectedServico(null);
  };

  const handleConfirmRemover = async () => {
    if (!selectedServico) return;

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const servicoRef = doc(db, 'schools', escolaId, 'services', selectedServico.id);
      await deleteDoc(servicoRef);
      
      // Recarregar lista de serviços
      await fetchServicos();
      setShowRemoverModal(false);
      setSelectedServico(null);
    } catch (err) {
      console.error('Erro ao remover serviço:', err);
      setError('Erro ao remover serviço. Tente novamente.');
    }
  };

  const filteredServicos = services.filter(servico =>
    servico.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    servico.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    servico.price?.toString().includes(searchTerm)
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    if (!price) return '0,00 €';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="services-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar serviços...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="services-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="services-page">
        <Navigation showBackButton={true} backPath="/visao-geral" />
        <div className="not-found">
          <h2>Escola não encontrada</h2>
          <p>A escola que procura não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="services-page">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
      
      <div className="content">
        <div className="page-header">
          <h1>Serviços - {escola.name}</h1>
          <p>Gerir serviços desta escola</p>
        </div>

        <div className="search-section">
          <div className="search-form">
            <input
              type="text"
              placeholder="Pesquisar por nome, descrição ou preço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="add-button" onClick={handleOpenModal}>
            + Adicionar Novo Serviço
          </button>
        </div>

        <div className="services-stats">
          <div className="stat-item">
            <span className="stat-number">{services.length}</span>
            <span className="stat-label">Total de Serviços</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{filteredServicos.length}</span>
            <span className="stat-label">Resultados da Pesquisa</span>
          </div>
        </div>

        {filteredServicos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚙️</div>
            <h3>
              {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
            </h3>
            <p>
              {searchTerm 
                ? 'Tente ajustar os termos de pesquisa.' 
                : 'Adicione o primeiro serviço usando o botão acima.'
              }
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredServicos.map((servico) => (
                  <tr key={servico.id} className="servico-row">
                    <td className="nome-cell">
                      <div className="servico-info">
                        <span className="servico-name">{servico.name}</span>
                      </div>
                    </td>
                    <td className="description-cell">
                      {servico.description || '-'}
                    </td>
                    <td className="category-cell">
                      <span className={`category-badge ${servico.category ? 'has-category' : 'no-category'}`}>
                        {servico.category || 'Sem categoria'}
                      </span>
                    </td>
                    <td className="price-cell">
                      <span className="price-value">{formatPrice(servico.price)}</span>
                    </td>
                    <td className="status-cell">
                      <div className="status-indicator">
                        <div className="status-icon"></div>
                        <span>Ativo</span>
                      </div>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button 
                          className="btn-ver-ficha"
                          onClick={() => handleVerFicha(servico)}
                        >
                          Ver Detalhes
                        </button>
                        <button 
                          className="btn-remover"
                          onClick={() => handleRemover(servico)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdicionarNovoServicoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        escolaId={escolaId}
      />

      <VerFichaServicoModal
        isOpen={showVerFichaModal}
        onClose={handleCloseVerFicha}
        servico={selectedServico}
        escolaId={escolaId}
        onSuccess={handleSuccess}
      />

      <ConfirmarRemocaoServicoModal
        isOpen={showRemoverModal}
        onClose={handleCloseRemover}
        servico={selectedServico}
        onConfirm={handleConfirmRemover}
      />
    </div>
  );
};

export default Servicos;
