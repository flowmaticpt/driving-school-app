import React, { useState, useEffect, useRef } from 'react';
import { PLACEHOLDER_GROUPS } from '../utils/templatePlaceholders';
import './EditarModeloContratoModal.css';

const EditarModeloContratoModal = ({ isOpen, onClose, onSave, template, isLoading }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setBody(template.body || '');
    } else {
      setName('');
      setDescription('');
      setBody('');
    }
    setError('');
  }, [template, isOpen]);

  const handleInsertPlaceholder = (placeholderKey) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.substring(0, start) + placeholderKey + body.substring(end);
    setBody(newBody);

    // Reposicionar cursor após o placeholder inserido
    setTimeout(() => {
      textarea.focus();
      const newPos = start + placeholderKey.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('O nome do template é obrigatório.');
      return;
    }

    if (!body.trim()) {
      setError('O corpo do contrato é obrigatório.');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      body: body
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content editar-modelo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{template ? 'Editar Modelo de Contrato' : 'Novo Modelo de Contrato'}</h2>
          <button className="close-button" onClick={onClose} disabled={isLoading}>×</button>
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

            <div className="form-group">
              <label>Placeholders disponíveis</label>
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
                          onClick={() => handleInsertPlaceholder(p.key)}
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
              <label>Corpo do Contrato *</label>
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={'CONTRATO DE FORMAÇÃO\n\nEntre {{nomeEscola}}, com sede em {{moradaEscola}}...\n\ne o(a) aluno(a) {{nome}}, portador(a) do NIF {{nif}}...'}
                rows="18"
                className="contract-body-textarea"
                disabled={isLoading}
              />
            </div>
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
