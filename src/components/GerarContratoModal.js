import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { buildPlaceholderData, replacePlaceholders } from '../utils/templatePlaceholders';
import { downloadFilledDocx, extractTextFromDocx } from '../utils/docxGenerator';
import './GerarContratoModal.css';

const GerarContratoModal = ({ isOpen, onClose, aluno, escolaId, extras = {} }) => {
  const [templates, setTemplates] = useState([]);
  const [escola, setEscola] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState('select'); // 'select' | 'preview'

  useEffect(() => {
    if (isOpen && escolaId) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, escolaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesSnap, escolaSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'schools', escolaId, 'documentTemplates'),
          orderBy('createdAt', 'desc')
        )),
        getDoc(doc(db, 'schools', escolaId))
      ]);

      const templatesList = [];
      templatesSnap.forEach(d => {
        const data = d.data();
        // Only include templates that have a .docx file
        if (data.docxBase64) {
          templatesList.push({ id: d.id, ...data });
        }
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

  const handlePreview = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    setGenerating(true);
    try {
      const data = buildPlaceholderData(aluno, escola, extras);

      // Verificar dados do aluno
      const camposVazios = [];
      if (!data.nome) camposVazios.push('Nome');
      if (!data.morada) camposVazios.push('Morada');
      if (!data.nif) camposVazios.push('NIF');
      if (!data.cc) camposVazios.push('CC');
      if (!data.telefone) camposVazios.push('Telefone');
      if (!data.email) camposVazios.push('Email');

      if (camposVazios.length > 0) {
        const msg = `Atenção: Os seguintes campos do aluno estão vazios e não vão aparecer no contrato:\n\n- ${camposVazios.join('\n- ')}\n\nPreencha estes dados na ficha do aluno primeiro.`;
        alert(msg);
      }

      // Verificar se o template tem placeholders
      const rawText = extractTextFromDocx(template.docxBase64);
      const rawTextLower = rawText.toLowerCase();
      const temPlaceholders = rawTextLower.includes('{nome}') || rawTextLower.includes('{morada}') || rawTextLower.includes('{nif}');
      if (!temPlaceholders) {
        alert('Atenção: Este modelo de contrato não tem codigos como {nome}, {morada}, {nif}. Os dados do aluno não vão aparecer.\n\nEdite o modelo e adicione os codigos nos sitios corretos.');
      }

      const filledText = replacePlaceholders(rawText, data);
      setPreviewText(filledText);
      setStep('preview');
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      alert('Erro ao gerar pré-visualização: ' + (error.message || error));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    try {
      const data = buildPlaceholderData(aluno, escola, extras);
      console.log('📄 Dados para contrato:', data);
      const sanitizedName = (aluno?.name || 'aluno').replace(/[^a-zA-Z0-9\u00C0-\u00FF ]/g, '').replace(/\s+/g, '_');
      const fileName = `Contrato_${sanitizedName}.docx`;
      downloadFilledDocx(template.docxBase64, data, fileName);
    } catch (error) {
      console.error('Erro ao descarregar documento:', error);
      alert('Erro ao descarregar documento: ' + (error.message || error));
    }
  };

  const handleBack = () => {
    setStep('select');
    setPreviewText('');
  };

  const handleClose = () => {
    setStep('select');
    setSelectedTemplateId('');
    setPreviewText('');
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
                <strong>Aluno:</strong> {aluno?.name || <span style={{color:'#e74c3c'}}>Sem nome</span>}
                {aluno?.nif ? <span> | NIF: {aluno.nif}</span> : <span style={{color:'#e74c3c'}}> | NIF: vazio</span>}
                {aluno?.address ? <span> | Morada: {aluno.address.substring(0, 30)}...</span> : <span style={{color:'#e74c3c'}}> | Morada: vazia</span>}
              </div>
              {(!aluno?.name || !aluno?.nif || !aluno?.address) && (
                <div style={{padding:'0.5rem 0.75rem', background:'#fff3cd', borderRadius:'6px', fontSize:'0.85rem', color:'#856404', marginBottom:'0.75rem'}}>
                  Alguns dados do aluno estao vazios. Preencha a ficha do aluno primeiro para que o contrato saia completo.
                </div>
              )}

              {templates.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <h3>Sem modelos de contrato</h3>
                  <p>Crie primeiro um modelo de contrato (formato .docx) na página "Modelos de Contrato" da escola.</p>
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
                        {template.fileName && (
                          <span className="template-file">📄 {template.fileName}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="preview-container">
              <div className="preview-notice">
                A formatação completa (logo, tabelas, estilos) será visível no documento Word descarregado.
              </div>
              <div className="text-preview">
                <pre>{previewText}</pre>
              </div>
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
                Descarregar .docx
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GerarContratoModal;
