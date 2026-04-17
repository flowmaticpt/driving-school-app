import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './Documentos.css';

const Documentos = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState(null);
  const [filter, setFilter] = useState('all'); // all, contract, license, other
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newDocumento, setNewDocumento] = useState({
    title: '',
    type: 'other',
    description: '',
    fileUrl: '',
    expiryDate: '',
    relatedSchoolId: '',
    relatedStudentId: '',
    tags: []
  });

  useEffect(() => {
    fetchDocumentos();
  }, [filter]);

  const fetchDocumentos = async () => {
    setLoading(true);
    try {
      const documentosRef = collection(db, 'documentos');
      let q;
      
      if (filter === 'all') {
        q = query(documentosRef, orderBy('createdAt', 'desc'));
      } else {
        q = query(
          documentosRef, 
          where('type', '==', filter),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      const documentosList = [];
      snapshot.forEach(doc => {
        documentosList.push({ id: doc.id, ...doc.data() });
      });
      
      setDocumentos(documentosList);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      setError('Erro ao carregar documentos');
      showMessage('error', 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleCreateDocumento = async (e) => {
    e.preventDefault();
    
    if (!newDocumento.title.trim()) {
      showMessage('error', 'O título é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const documentoData = {
        title: newDocumento.title.trim(),
        type: newDocumento.type,
        description: newDocumento.description.trim() || '',
        fileUrl: newDocumento.fileUrl.trim() || '',
        expiryDate: newDocumento.expiryDate ? Timestamp.fromDate(new Date(newDocumento.expiryDate)) : null,
        relatedSchoolId: newDocumento.relatedSchoolId || '',
        relatedStudentId: newDocumento.relatedStudentId || '',
        tags: newDocumento.tags || [],
        createdBy: {
          userId: userData?.id || '',
          name: userData?.name || 'Utilizador',
          email: userData?.email || ''
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'documentos'), documentoData);
      
      showMessage('success', 'Documento criado com sucesso!');
      setNewDocumento({
        title: '',
        type: 'other',
        description: '',
        fileUrl: '',
        expiryDate: '',
        relatedSchoolId: '',
        relatedStudentId: '',
        tags: []
      });
      setShowCreateModal(false);
      fetchDocumentos();
    } catch (error) {
      console.error('Erro ao criar documento:', error);
      showMessage('error', 'Erro ao criar documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDocumento = async (e) => {
    e.preventDefault();
    
    if (!selectedDocumento) return;
    
    if (!newDocumento.title.trim()) {
      showMessage('error', 'O título é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const documentoRef = doc(db, 'documentos', selectedDocumento.id);
      await updateDoc(documentoRef, {
        title: newDocumento.title.trim(),
        type: newDocumento.type,
        description: newDocumento.description.trim() || '',
        fileUrl: newDocumento.fileUrl.trim() || '',
        expiryDate: newDocumento.expiryDate ? Timestamp.fromDate(new Date(newDocumento.expiryDate)) : null,
        relatedSchoolId: newDocumento.relatedSchoolId || '',
        relatedStudentId: newDocumento.relatedStudentId || '',
        tags: newDocumento.tags || [],
        updatedAt: Timestamp.now()
      });
      
      showMessage('success', 'Documento atualizado com sucesso!');
      setShowEditModal(false);
      setSelectedDocumento(null);
      fetchDocumentos();
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      showMessage('error', 'Erro ao atualizar documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocumento = async () => {
    if (!selectedDocumento) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'documentos', selectedDocumento.id));
      showMessage('success', 'Documento removido com sucesso!');
      setShowDeleteModal(false);
      setSelectedDocumento(null);
      fetchDocumentos();
    } catch (error) {
      console.error('Erro ao remover documento:', error);
      showMessage('error', 'Erro ao remover documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (documento) => {
    setSelectedDocumento(documento);
    // Convert Timestamp to date string for input
    let expiryDateString = '';
    if (documento.expiryDate) {
      try {
        const date = documento.expiryDate.toDate ? documento.expiryDate.toDate() : new Date(documento.expiryDate);
        expiryDateString = date.toISOString().split('T')[0];
      } catch (e) {
        console.error('Erro ao converter data:', e);
      }
    }
    setNewDocumento({
      title: documento.title || '',
      type: documento.type || 'other',
      description: documento.description || '',
      fileUrl: documento.fileUrl || '',
      expiryDate: expiryDateString,
      relatedSchoolId: documento.relatedSchoolId || '',
      relatedStudentId: documento.relatedStudentId || '',
      tags: documento.tags || []
    });
    setShowEditModal(true);
  };

  const handleDelete = (documento) => {
    setSelectedDocumento(documento);
    setShowDeleteModal(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    try {
      const date = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    } catch {
      return false;
    }
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    try {
      const date = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
      return date < new Date();
    } catch {
      return false;
    }
  };

  const filteredDocumentos = documentos.filter(doc => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        doc.title?.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const getTypeLabel = (type) => {
    const types = {
      contract: 'Contrato',
      license: 'Licença',
      certificate: 'Certificado',
      invoice: 'Fatura',
      other: 'Outro'
    };
    return types[type] || type;
  };

  return (
    <div className="documentos-page">
      <button className="documentos-back-button" onClick={() => navigate('/')}>
        ← Voltar
      </button>

      <div className="documentos-header">
        <h1>📄 Documentos</h1>
        <p>Gerir documentos e contratos</p>
      </div>

      {message.text && (
        <div className={`documentos-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="documentos-actions">
        <div className="search-filter-bar">
          <input
            type="text"
            placeholder="Pesquisar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos os tipos</option>
            <option value="contract">Contratos</option>
            <option value="license">Licenças</option>
            <option value="certificate">Certificados</option>
            <option value="invoice">Faturas</option>
            <option value="other">Outros</option>
          </select>
        </div>
        <button
          onClick={() => {
            setNewDocumento({
              title: '',
              type: 'other',
              description: '',
              fileUrl: '',
              expiryDate: '',
              relatedSchoolId: '',
              relatedStudentId: '',
              tags: []
            });
            setShowCreateModal(true);
          }}
          className="add-button"
        >
          ➕ Adicionar Documento
        </button>
      </div>

      {loading && !documentos.length ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar documentos...</p>
        </div>
      ) : filteredDocumentos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>
            {searchTerm || filter !== 'all'
              ? 'Nenhum documento encontrado'
              : 'Nenhum documento cadastrado'}
          </h3>
          <p>
            {searchTerm || filter !== 'all'
              ? 'Tente ajustar os filtros de pesquisa.'
              : 'Comece adicionando o primeiro documento.'}
          </p>
        </div>
      ) : (
        <div className="documentos-grid">
          {filteredDocumentos.map((documento) => {
            const expiringSoon = isExpiringSoon(documento.expiryDate);
            const expired = isExpired(documento.expiryDate);
            
            return (
              <div key={documento.id} className="documento-card">
                <div className="documento-header">
                  <div className="documento-type">
                    <span className={`type-badge ${documento.type}`}>
                      {getTypeLabel(documento.type)}
                    </span>
                  </div>
                  {(expired || expiringSoon) && (
                    <span className={`expiry-badge ${expired ? 'expired' : 'expiring'}`}>
                      {expired ? '⚠️ Expirado' : '⏰ Expira em breve'}
                    </span>
                  )}
                </div>
                
                <div className="documento-content">
                  <h3>{documento.title}</h3>
                  {documento.description && (
                    <p className="documento-description">{documento.description}</p>
                  )}
                  
                  <div className="documento-details">
                    <div className="detail-item">
                      <strong>Criado em:</strong> {formatDate(documento.createdAt)}
                    </div>
                    {documento.expiryDate && (
                      <div className="detail-item">
                        <strong>Data de expiração:</strong> {formatDate(documento.expiryDate)}
                      </div>
                    )}
                    {documento.fileUrl && (
                      <div className="detail-item">
                        <a 
                          href={documento.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="file-link"
                        >
                          📎 Ver ficheiro
                        </a>
                      </div>
                    )}
                    {documento.tags && documento.tags.length > 0 && (
                      <div className="documento-tags">
                        {documento.tags.map((tag, idx) => (
                          <span key={idx} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="documento-actions">
                  <button
                    onClick={() => handleEdit(documento)}
                    className="edit-button"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(documento)}
                    className="delete-button"
                  >
                    🗑️ Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adicionar Documento</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-button">×</button>
            </div>
            <form onSubmit={handleCreateDocumento}>
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={newDocumento.title}
                  onChange={(e) => setNewDocumento({ ...newDocumento, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={newDocumento.type}
                  onChange={(e) => setNewDocumento({ ...newDocumento, type: e.target.value })}
                >
                  <option value="contract">Contrato</option>
                  <option value="license">Licença</option>
                  <option value="certificate">Certificado</option>
                  <option value="invoice">Fatura</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={newDocumento.description}
                  onChange={(e) => setNewDocumento({ ...newDocumento, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>URL do Ficheiro</label>
                <input
                  type="url"
                  value={newDocumento.fileUrl}
                  onChange={(e) => setNewDocumento({ ...newDocumento, fileUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>Data de Expiração</label>
                <input
                  type="date"
                  value={newDocumento.expiryDate}
                  onChange={(e) => setNewDocumento({ ...newDocumento, expiryDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={loading}>
                  {loading ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Documento</h2>
              <button onClick={() => setShowEditModal(false)} className="close-button">×</button>
            </div>
            <form onSubmit={handleUpdateDocumento}>
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={newDocumento.title}
                  onChange={(e) => setNewDocumento({ ...newDocumento, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={newDocumento.type}
                  onChange={(e) => setNewDocumento({ ...newDocumento, type: e.target.value })}
                >
                  <option value="contract">Contrato</option>
                  <option value="license">Licença</option>
                  <option value="certificate">Certificado</option>
                  <option value="invoice">Fatura</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={newDocumento.description}
                  onChange={(e) => setNewDocumento({ ...newDocumento, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>URL do Ficheiro</label>
                <input
                  type="url"
                  value={newDocumento.fileUrl}
                  onChange={(e) => setNewDocumento({ ...newDocumento, fileUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>Data de Expiração</label>
                <input
                  type="date"
                  value={newDocumento.expiryDate}
                  onChange={(e) => setNewDocumento({ ...newDocumento, expiryDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={loading}>
                  {loading ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedDocumento && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar Remoção</h2>
              <button onClick={() => setShowDeleteModal(false)} className="close-button">×</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja remover o documento <strong>{selectedDocumento.title}</strong>?</p>
              <p className="warning-text">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="cancel-button">
                Cancelar
              </button>
              <button type="button" onClick={handleDeleteDocumento} className="delete-button" disabled={loading}>
                {loading ? 'A remover...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documentos;

