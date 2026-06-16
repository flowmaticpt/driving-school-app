import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';
import EditarModeloContratoModal from '../components/EditarModeloContratoModal';
import { useAuth } from '../contexts/AuthContext';
import { generateSampleTemplate } from '../utils/docxGenerator';
import './ModelosContrato.css';

const ModelosContrato = () => {
  const { escolaId } = useParams();
  useNavigate();
  useAuth();
  const [templates, setTemplates] = useState([]);
  const [escola, setEscola] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEscola();
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaId]);

  const fetchEscola = async () => {
    try {
      const escolaRef = doc(db, 'schools', escolaId);
      const escolaSnap = await getDoc(escolaRef);
      if (escolaSnap.exists()) {
        setEscola({ id: escolaSnap.id, ...escolaSnap.data() });
      }
    } catch (error) {
      console.error('Erro ao buscar escola:', error);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const templatesRef = collection(db, 'schools', escolaId, 'documentTemplates');
      const q = query(templatesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTemplates(list);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      showMessage('error', 'Erro ao carregar modelos de contrato.');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setShowEditModal(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handleDelete = (template) => {
    setSelectedTemplate(template);
    setShowDeleteConfirm(true);
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (selectedTemplate) {
        // Update
        const templateRef = doc(db, 'schools', escolaId, 'documentTemplates', selectedTemplate.id);
        await updateDoc(templateRef, {
          ...data,
          updatedAt: Timestamp.now()
        });
        showMessage('success', 'Modelo atualizado com sucesso!');
      } else {
        // Create
        const templatesRef = collection(db, 'schools', escolaId, 'documentTemplates');
        await addDoc(templatesRef, {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        showMessage('success', 'Modelo criado com sucesso!');
      }
      setShowEditModal(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Erro ao guardar modelo:', error);
      showMessage('error', 'Erro ao guardar modelo. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'schools', escolaId, 'documentTemplates', selectedTemplate.id));
      showMessage('success', 'Modelo removido com sucesso!');
      setShowDeleteConfirm(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Erro ao remover modelo:', error);
      showMessage('error', 'Erro ao remover modelo. Tente novamente.');
    } finally {
      setSaving(false);
    }
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

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const filteredTemplates = templates.filter(t => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      t.name?.toLowerCase().includes(s) ||
      t.description?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="modelos-contrato-page">
      <Navigation
        showBackButton={true}
        backPath={`/escola/${escolaId}`}
      />

      <div className="modelos-header">
        <h1>Modelos de Contrato</h1>
        <p>{escola?.name || 'A carregar...'}</p>
      </div>

      {message.text && (
        <div className={`modelos-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="modelos-help-card">
        <div className="help-card-header">
          <h3>Como funcionam os modelos de contrato?</h3>
        </div>
        <div className="help-card-body">
          <div className="help-option">
            <span className="help-option-number">1</span>
            <div>
              <strong>Escrever na App (mais facil)</strong>
              <p>Clique em "+ Novo Modelo", escolha "Escrever na App" e use os botoes para inserir os campos automaticos (nome, NIF, morada, etc.).</p>
            </div>
          </div>
          <div className="help-option">
            <span className="help-option-number">2</span>
            <div>
              <strong>Usar o Word</strong>
              <p>Escreva o contrato no Word. Onde quiser dados automaticos, escreva codigos como <code>{'{nome}'}</code>, <code>{'{nif}'}</code>, <code>{'{morada}'}</code>. Depois carregue o ficheiro .docx aqui.</p>
            </div>
          </div>
          <div className="help-download">
            <button onClick={generateSampleTemplate} className="download-example-button-big">
              Descarregar Contrato de Exemplo
            </button>
            <span className="help-download-hint">Descarregue um exemplo pronto com todos os codigos para ver como funciona</span>
          </div>
        </div>
      </div>

      <div className="modelos-actions">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Pesquisar modelos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button onClick={handleCreate} className="add-button">
          + Novo Modelo
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>A carregar modelos...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>
            {searchTerm
              ? 'Nenhum modelo encontrado'
              : 'Nenhum modelo de contrato'}
          </h3>
          <p>
            {searchTerm
              ? 'Tente ajustar a pesquisa.'
              : 'Crie o primeiro modelo de contrato para a sua escola.'}
          </p>
        </div>
      ) : (
        <div className="modelos-grid">
          {filteredTemplates.map((template) => {
            const isLegacy = !template.docxBase64;
            return (
              <div key={template.id} className={`modelo-card ${isLegacy ? 'legacy' : ''}`}>
                <div className="modelo-card-header">
                  <h3>{template.name}</h3>
                  {isLegacy ? (
                    <span className="legacy-badge">Formato antigo</span>
                  ) : (
                    <span className="docx-badge">.docx</span>
                  )}
                </div>

                {template.description && (
                  <p className="modelo-description">{template.description}</p>
                )}

                {isLegacy ? (
                  <div className="modelo-legacy-warning">
                    Este modelo usa o formato antigo (texto). Edite-o para carregar um ficheiro .docx.
                  </div>
                ) : (
                  <div className="modelo-file-info">
                    <span className="modelo-file-icon">📄</span>
                    <div className="modelo-file-details">
                      <span className="modelo-file-name">{template.fileName}</span>
                      <span className="modelo-file-size">{formatSize(template.fileSize)}</span>
                    </div>
                  </div>
                )}

                <div className="modelo-meta">
                  <span>Criado em: {formatDate(template.createdAt)}</span>
                  {template.updatedAt && template.updatedAt !== template.createdAt && (
                    <span>Atualizado: {formatDate(template.updatedAt)}</span>
                  )}
                </div>

                <div className="modelo-actions">
                  <button
                    onClick={() => handleEdit(template)}
                    className="edit-button"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="delete-button"
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditarModeloContratoModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedTemplate(null); }}
        onSave={handleSave}
        template={selectedTemplate}
        isLoading={saving}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar Remoção</h2>
              <button onClick={() => setShowDeleteConfirm(false)} className="close-button">×</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja remover o modelo <strong>{selectedTemplate.name}</strong>?</p>
              <p className="warning-text">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="cancel-button"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="delete-button"
                disabled={saving}
              >
                {saving ? 'A remover...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelosContrato;
