import React, { useState, useEffect, useRef } from 'react';
import { PLACEHOLDER_GROUPS } from '../utils/templatePlaceholders';
import { extractPlaceholdersFromDocx, extractTextFromDocx, textToDocxBase64 } from '../utils/docxGenerator';
import './EditarModeloContratoModal.css';

const MAX_FILE_SIZE = 500 * 1024; // 500 KB

const EditarModeloContratoModal = ({ isOpen, onClose, onSave, template, isLoading }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [docxBase64, setDocxBase64] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState(null);
  const [mode, setMode] = useState('editor'); // 'editor' | 'upload'
  const [editorText, setEditorText] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [showRefTable, setShowRefTable] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setFileName(template.fileName || '');
      setFileSize(template.fileSize || 0);
      setDocxBase64(template.docxBase64 || '');
      // Se o template já tem um .docx, extrair texto para o editor
      if (template.docxBase64) {
        try {
          const text = extractTextFromDocx(template.docxBase64);
          setEditorText(text);
          setMode('editor');
        } catch {
          setEditorText('');
          setMode('upload');
        }
      }
    } else {
      setName('');
      setDescription('');
      setFileName('');
      setFileSize(0);
      setDocxBase64('');
      setEditorText('');
      setMode('editor');
    }
    setError('');
    setDetectedPlaceholders(null);
  }, [template, isOpen]);

  const processFile = (file) => {
    setError('');

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Apenas ficheiros .docx são aceites.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`Ficheiro demasiado grande (${formatSize(file.size)}). Limite: 500 KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      setDocxBase64(base64);
      setFileName(file.name);
      setFileSize(file.size);

      try {
        const found = extractPlaceholdersFromDocx(base64);
        setDetectedPlaceholders(found);
      } catch {
        setDetectedPlaceholders(null);
      }

      // Extrair texto para o editor
      try {
        const text = extractTextFromDocx(base64);
        setEditorText(text);
      } catch {
        // Manter editorText como está
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleRemoveFile = () => {
    setDocxBase64('');
    setFileName('');
    setFileSize(0);
    setDetectedPlaceholders(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const insertPlaceholder = (key) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editorText;
    const newText = text.substring(0, start) + key + text.substring(end);
    setEditorText(newText);

    // Reposicionar cursor depois do placeholder inserido
    setTimeout(() => {
      textarea.focus();
      const newPos = start + key.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    }, 0);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('O nome do template é obrigatório.');
      return;
    }

    let finalBase64 = docxBase64;
    let finalFileName = fileName;
    let finalFileSize = fileSize;

    if (mode === 'editor') {
      if (!editorText.trim()) {
        setError('O conteúdo do contrato não pode estar vazio.');
        return;
      }
      // Converter texto do editor para .docx
      try {
        finalBase64 = textToDocxBase64(editorText);
        finalFileName = `${name.trim().replace(/\s+/g, '_')}.docx`;
        finalFileSize = Math.round(finalBase64.length * 0.75); // Estimativa do tamanho
      } catch (err) {
        setError('Erro ao gerar o documento. Tente novamente.');
        console.error('Erro textToDocxBase64:', err);
        return;
      }
    } else {
      if (!finalBase64) {
        setError('É necessário carregar um ficheiro .docx.');
        return;
      }
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      docxBase64: finalBase64,
      fileName: finalFileName,
      fileSize: finalFileSize,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content editar-modelo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{template ? 'Editar Modelo de Contrato' : 'Novo Modelo de Contrato'}</h2>
          <button className="close-button" onClick={onClose} disabled={isLoading}>x</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label>Nome do Template *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Contrato Categoria B"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Contrato padrão para alunos de categoria B"
                disabled={isLoading}
              />
            </div>

            {/* Mode toggle */}
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-btn ${mode === 'editor' ? 'active' : ''}`}
                onClick={() => setMode('editor')}
                disabled={isLoading}
              >
                Escrever na App
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
                onClick={() => setMode('upload')}
                disabled={isLoading}
              >
                Carregar Word (.docx)
              </button>
            </div>

            {/* Editor mode */}
            {mode === 'editor' && (
              <>
                <div className="form-group">
                  <label>Inserir campos do aluno/escola:</label>
                  <div className="placeholder-toolbar">
                    {PLACEHOLDER_GROUPS.map((group) => (
                      <div key={group.label} className="placeholder-group">
                        <span className="placeholder-group-label">{group.label}:</span>
                        <div className="placeholder-buttons">
                          {group.placeholders.map((p) => (
                            <button
                              key={p.key}
                              type="button"
                              className="placeholder-button"
                              onClick={() => insertPlaceholder(p.key)}
                              title={p.description}
                              disabled={isLoading}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Conteudo do contrato *</label>
                  <textarea
                    ref={textareaRef}
                    className="contract-editor"
                    value={editorText}
                    onChange={(e) => setEditorText(e.target.value)}
                    placeholder={'CONTRATO DE FORMACAO\n\nEscola: {nomeEscola}\nMorada: {moradaEscola}\n\nDADOS DO ALUNO\nNome: {nome}\nNIF: {nif}\nCC: {cc}\n...\n\nData: {dataHoje}\n\nAssinatura: _______________'}
                    disabled={isLoading}
                    rows={16}
                  />
                  <p className="editor-hint">
                    Escreva o texto do contrato. Use os botoes acima para inserir campos que serao automaticamente preenchidos com os dados do aluno.
                  </p>
                </div>
              </>
            )}

            {/* Upload mode */}
            {mode === 'upload' && (
              <>
                <div className="contract-guide">
                  <p className="guide-title">Como usar o modo Word:</p>
                  <ol className="guide-steps">
                    <li>Abra o Word e escreva o contrato normalmente</li>
                    <li>Onde quiser dados automaticos, escreva o codigo entre chavetas. Exemplo: onde quer o nome do aluno, escreva <code>{'{nome}'}</code></li>
                    <li>Guarde o ficheiro como <strong>.docx</strong> e carregue-o aqui em baixo</li>
                  </ol>
                  <p className="guide-example">
                    Exemplo: "O aluno <code>{'{nome}'}</code>, portador do NIF <code>{'{nif}'}</code>, residente em <code>{'{morada}'}</code>..."
                  </p>
                  <button
                    type="button"
                    className="guide-toggle-ref"
                    onClick={() => setShowRefTable(!showRefTable)}
                  >
                    {showRefTable ? 'Esconder lista de codigos' : 'Ver todos os codigos disponiveis (clique para copiar)'}
                  </button>
                  {showRefTable && (
                    <div className="placeholder-ref-table">
                      {PLACEHOLDER_GROUPS.map((group) => (
                        <div key={group.label} className="ref-group">
                          <span className="ref-group-label">{group.label}</span>
                          <div className="ref-items">
                            {group.placeholders.map((p) => (
                              <button
                                key={p.key}
                                type="button"
                                className={`ref-item ${copiedKey === p.key ? 'copied' : ''}`}
                                onClick={() => copyToClipboard(p.key)}
                                title={`Copiar ${p.key}`}
                              >
                                <span className="ref-item-code">{p.key}</span>
                                <span className="ref-item-label">{p.description}</span>
                                <span className="ref-item-copy">{copiedKey === p.key ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Ficheiro .docx *</label>
                  {docxBase64 && mode === 'upload' ? (
                    <div className="file-info-box">
                      <div className="file-info-icon">📄</div>
                      <div className="file-info-details">
                        <span className="file-info-name">{fileName}</span>
                        <span className="file-info-size">{formatSize(fileSize)}</span>
                      </div>
                      <button
                        type="button"
                        className="file-remove-button"
                        onClick={handleRemoveFile}
                        disabled={isLoading}
                        title="Remover ficheiro"
                      >
                        x
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`dropzone ${dragging ? 'dragging' : ''}`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="dropzone-icon">📁</div>
                      <p className="dropzone-text">
                        Arraste o ficheiro .docx ou <span className="dropzone-link">clique para selecionar</span>
                      </p>
                      <p className="dropzone-hint">Máximo 500 KB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx"
                        onChange={handleFileChange}
                        className="dropzone-input"
                      />
                    </div>
                  )}
                </div>

                {detectedPlaceholders && docxBase64 && (
                  <div className="form-group">
                    <label>Placeholders detectados</label>
                    <div className="placeholder-checklist">
                      {PLACEHOLDER_GROUPS.map((group) => (
                        <div key={group.label} className="checklist-group">
                          <span className="checklist-group-label">{group.label}</span>
                          <div className="checklist-items">
                            {group.placeholders.map((ph) => {
                              const found = detectedPlaceholders.has(ph.key);
                              return (
                                <span
                                  key={ph.key}
                                  className={`checklist-item ${found ? 'found' : 'missing'}`}
                                  title={ph.description}
                                >
                                  <span className="checklist-icon">{found ? '\u2713' : '\u2014'}</span>
                                  {ph.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <p className="checklist-note">
                        Os placeholders em cinza nao estao no documento.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button" disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className="save-button" disabled={isLoading}>
              {isLoading ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarModeloContratoModal;
