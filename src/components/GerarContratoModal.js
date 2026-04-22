import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { replacePlaceholders } from '../utils/templatePlaceholders';
import { generateContractPdf, previewContractPdf } from '../utils/pdfGenerator';
import './GerarContratoModal.css';

const GerarContratoModal = ({ isOpen, onClose, aluno, escolaId, extras = {} }) => {
  const [templates, setTemplates] = useState([]);
  const [escola, setEscola] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState('select'); // 'select' | 'preview'

  useEffect(() => {
    if (isOpen && escolaId) {
      fetchData();
    }
    return () => {
      // Cleanup blob URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, escolaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch templates and escola in parallel
      const [templatesSnap, escolaSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'schools', escolaId, 'documentTemplates'),
          orderBy('createdAt', 'desc')
        )),
        getDoc(doc(db, 'schools', escolaId))
      ]);

      const templatesList = [];
      templatesSnap.forEach(d => {
        templatesList.push({ id: d.id, ...d.data() });
      });
      setTemplates(templatesList);

      if (escolaSnap.exists()) {
        setEscola({ id: escolaSnap.id, ...escolaSnap.data() });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
  };

  const handlePreview = async () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    setGenerating(true);
    try {
      const filled = replacePlaceholders(template.body, aluno, escola, extras);
      setPreviewText(filled);

      const url = await previewContractPdf(filled, escola, template.name);
      // Cleanup previous URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
      setStep('preview');
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      alert('Erro ao gerar pré-visualização. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const filled = replacePlaceholders(template.body, aluno, escola, extras);
    const sanitizedName = (aluno?.name || 'aluno').replace(/[^a-zA-Z0-9\u00C0-\u00FF ]/g, '').replace(/\s+/g, '_');
    const fileName = `Contrato_${sanitizedName}.pdf`;

    generateContractPdf(filled, escola, template.name, fileName);
  };

  const handleBack = () => {
    setStep('select');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedTemplateId('');
    setPreviewText('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content gerar-contrato-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {step === 'select' ? 'Gerar Contrato' : 'Pré-visualização do Contrato'}
          </h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>A carregar modelos...</p>
            </div>
          ) : step === 'select' ? (
            <>
              <div className="aluno-info-bar">
                <strong>Aluno:</strong> {aluno?.name || 'N/A'}
                {aluno?.nif && <span> | NIF: {aluno.nif}</span>}
              </div>

              {templates.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h3>Sem modelos de contrato</h3>
                  <p>Crie primeiro um modelo de contrato na página "Modelos de Contrato" da escola.</p>
                </div>
              ) : (
                <div className="templates-list">
                  <label className="section-label">Escolha um modelo:</label>
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`template-option ${selectedTemplateId === template.id ? 'selected' : ''}`}
                      onClick={() => handleSelectTemplate(template.id)}
                    >
                      <div className="template-radio">
                        <div className={`radio-dot ${selectedTemplateId === template.id ? 'active' : ''}`} />
                      </div>
                      <div className="template-info">
                        <strong>{template.name}</strong>
                        {template.description && (
                          <span className="template-desc">{template.description}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="preview-container">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="pdf-preview-iframe"
                  title="Preview do contrato"
                />
              ) : (
                <div className="text-preview">
                  <pre>{previewText}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions">
          {step === 'select' ? (
            <>
              <button type="button" onClick={handleClose} className="cancel-button">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePreview}
                className="save-button"
                disabled={!selectedTemplateId || generating}
              >
                {generating ? 'A gerar...' : 'Pré-visualizar'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleBack} className="cancel-button">
                Voltar
              </button>
              <button type="button" onClick={handleDownload} className="save-button download-button">
                Descarregar PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GerarContratoModal;
