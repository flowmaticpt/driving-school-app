import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, Timestamp, query, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './CriarAulaModal.css';

const MAX_DURACAO_MINUTOS = 50;

const CriarAulaModal = ({ instrutor, onClose, onSuccess }) => {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    tipo: 'teorica',
    minutos: 50,
    veiculoId: instrutor?.carroHabitual || '',
    data: '',
    hora: '',
    observacoes: ''
  });
  const [alunos, setAlunos] = useState([]);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conflitos, setConflitos] = useState([]);

  useEffect(() => {
    if (instrutor) {
      fetchAlunos();
      fetchVeiculos();
      setFormData(prev => ({
        ...prev,
        veiculoId: instrutor.carroHabitual || ''
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrutor]);

  const fetchAlunos = async () => {
    try {
      const studentsRef = collection(db, 'schools', instrutor.escolaId, 'students');
      const q = query(studentsRef, limit(1000));
      const studentsSnapshot = await getDocs(q);
      const alunosData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(aluno => aluno.active !== false);
      setAlunos(alunosData);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      setError('Erro ao carregar lista de alunos');
    }
  };

  const fetchVeiculos = async () => {
    try {
      const veiculosRef = collection(db, 'schools', instrutor.escolaId, 'fleet');
      const veiculosSnapshot = await getDocs(veiculosRef);
      const veiculosData = veiculosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVeiculos(veiculosData);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
      setError('Erro ao carregar veículos da frota');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAlunoToggle = (aluno) => {
    setAlunosSelecionados(prev => {
      const isSelected = prev.find(a => a.id === aluno.id);
      if (isSelected) {
        return prev.filter(a => a.id !== aluno.id);
      } else {
        return [...prev, aluno];
      }
    });
  };

  const verificarConflitos = async () => {
    if (!formData.data || !formData.hora) return [];

    try {
      const aulasRef = collection(db, 'aulas');
      const q = query(aulasRef, where('escolaId', '==', instrutor.escolaId), where('data', '==', formData.data));
      const snapshot = await getDocs(q);

      const duracaoMin = parseInt(formData.minutos) || 50;
      const [h, m] = formData.hora.split(':').map(Number);
      const inicioNova = h * 60 + m;
      const fimNova = inicioNova + duracaoMin;

      const conflitosEncontrados = [];

      snapshot.docs.forEach(docSnap => {
        const aula = docSnap.data();
        if (aula.status === 'cancelada') return;

        const [ah, am] = (aula.hora || '00:00').split(':').map(Number);
        const inicioExistente = ah * 60 + am;
        const fimExistente = inicioExistente + (parseInt(aula.minutos) || 50);

        // Verificar sobreposição de horário
        const sobrepoe = inicioNova < fimExistente && fimNova > inicioExistente;
        if (!sobrepoe) return;

        // Conflito de instrutor
        if (aula.instrutorId === instrutor.id) {
          conflitosEncontrados.push(`Instrutor ${instrutor.name} ja tem aula as ${aula.hora}`);
        }

        // Conflito de veiculo
        if (formData.tipo === 'pratica' && formData.veiculoId && aula.veiculoId === formData.veiculoId) {
          const veiculo = veiculos.find(v => v.id === formData.veiculoId);
          conflitosEncontrados.push(`Veiculo ${veiculo?.registration || formData.veiculoId} ja esta em uso as ${aula.hora}`);
        }
      });

      return conflitosEncontrados;
    } catch (err) {
      console.error('Erro ao verificar conflitos:', err);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.data || !formData.hora) {
      setError('Data e hora são obrigatórios');
      return;
    }

    const duracaoMin = parseInt(formData.minutos) || 50;
    if (duracaoMin > MAX_DURACAO_MINUTOS) {
      setError(`A duracao maxima por aula e de ${MAX_DURACAO_MINUTOS} minutos.`);
      return;
    }

    if (duracaoMin < 1) {
      setError('A duracao minima e de 1 minuto.');
      return;
    }

    if (formData.tipo === 'pratica' && !formData.veiculoId) {
      setError('Veículo é obrigatório para aulas práticas');
      return;
    }

    if (alunosSelecionados.length === 0) {
      setError('Selecione pelo menos um aluno');
      return;
    }

    setLoading(true);
    setError('');
    setConflitos([]);

    try {
      // Verificar conflitos de horário
      const conflitosEncontrados = await verificarConflitos();
      if (conflitosEncontrados.length > 0) {
        setConflitos(conflitosEncontrados);
        setError('Foram detetados conflitos de horario. Verifique antes de continuar.');
        setLoading(false);
        return;
      }
      // Determinar status baseado na data
      const aulaDateTime = new Date(`${formData.data}T${formData.hora}`);
      const agora = new Date();
      const status = aulaDateTime > agora ? 'agendada' : 'realizada';

      const aulaData = {
        instrutorId: instrutor.id,
        instrutorNome: instrutor.name,
        tipo: formData.tipo,
        minutos: parseInt(formData.minutos) || 60, // Store duration in minutes
        horas: parseFloat((parseInt(formData.minutos) || 60) / 60).toFixed(2), // Keep for backward compatibility
        veiculoId: formData.tipo === 'pratica' ? formData.veiculoId : null,
        data: formData.data,
        hora: formData.hora,
        observacoes: formData.observacoes || '',
        alunos: alunosSelecionados.map(aluno => ({
          id: aluno.id,
          nome: aluno.name,
          numero: aluno.enrollmentNumber
        })),
        status: status,
        escolaId: instrutor.escolaId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userData?.name || 'Desconhecido',
        createdByUserId: userData?.id || null
      };

      // Criar a aula
      const aulaRef = await addDoc(collection(db, 'aulas'), aulaData);
      const aulaId = aulaRef.id;

      // Adicionar o ID da aula ao array de aulas de cada aluno
      const updatePromises = alunosSelecionados.map(async (aluno) => {
        try {
          const alunoRef = doc(db, 'schools', instrutor.escolaId, 'students', aluno.id);
          await updateDoc(alunoRef, {
            aulas: arrayUnion(aulaId),
            updatedAt: Timestamp.now()
          });
        } catch (error) {
          console.error(`Erro ao atualizar aluno ${aluno.id}:`, error);
          // Não falha a criação da aula se um aluno não puder ser atualizado
        }
      });

      // Aguardar todas as atualizações dos alunos
      await Promise.all(updatePromises);

      // Adicionar o ID da aula ao array de aulas do instrutor
      try {
        const instrutorRef = doc(db, 'utilizadores', instrutor.id);
        await updateDoc(instrutorRef, {
          aulas: arrayUnion(aulaId),
          updatedAt: Timestamp.now()
        });
      } catch (error) {
        console.error('Erro ao atualizar instrutor:', error);
        // Não falha a criação da aula se o instrutor não puder ser atualizado
      }

      // Mostrar mensagem informativa sobre o status
      const statusMessage = status === 'agendada' 
        ? 'Aula agendada com sucesso! (Data futura)' 
        : 'Aula registada como realizada! (Data passada)';
      
      alert(statusMessage);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar aula:', error);
      setError('Erro ao criar aula. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const filteredAlunos = alunos.filter(aluno => {
    if (!searchTerm || typeof searchTerm !== 'string') return true;
    
    const searchLower = searchTerm.toLowerCase();
    const name = (aluno.name || '').toLowerCase();
    const email = (aluno.email || '').toLowerCase();
    const phone = (aluno.phone || '').toLowerCase();
    const enrollmentNumber = (aluno.enrollmentNumber || '').toLowerCase();
    
    return name.includes(searchLower) || 
           email.includes(searchLower) || 
           phone.includes(searchLower) ||
           enrollmentNumber.includes(searchLower);
  }).slice(0, 5); // Limitar a 5 alunos

  const veiculoSelecionado = veiculos.find(v => v.id === formData.veiculoId);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content criar-aula-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <div className="instrutor-info">
              <span className="instrutor-icon">👨‍🏫</span>
              <div className="instrutor-details">
                <h2>Criar Aula</h2>
                <p>Instrutor: {instrutor?.name}</p>
              </div>
            </div>
          </div>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-wrapper">
          <div className="modal-form-scroll">
          {/* Tipo e Horas */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">📚</span>
              <h3>Detalhes da Aula</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="tipo">Tipo de Aula *</label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="teorica">📖 Teórica</option>
                  <option value="pratica">🚗 Prática</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="minutos">Duração (minutos) *</label>
                <input
                  type="number"
                  id="minutos"
                  name="minutos"
                  value={formData.minutos}
                  onChange={handleInputChange}
                  className="form-input"
                  min="1"
                  max={MAX_DURACAO_MINUTOS}
                  step="1"
                  placeholder={`Max ${MAX_DURACAO_MINUTOS} min`}
                  required
                />
                <small className="form-hint">
                  {parseInt(formData.minutos) > MAX_DURACAO_MINUTOS
                    ? `Maximo ${MAX_DURACAO_MINUTOS} minutos por aula`
                    : `${formData.minutos} minutos`
                  }
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="data">Data *</label>
                <input
                  type="date"
                  id="data"
                  name="data"
                  value={formData.data}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="hora">Hora *</label>
                <input
                  type="time"
                  id="hora"
                  name="hora"
                  value={formData.hora}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Veículo (apenas para práticas) */}
          {formData.tipo === 'pratica' && (
            <div className="form-section">
              <div className="section-header">
                <span className="section-icon">🚗</span>
                <h3>Veículo</h3>
              </div>
              
              <div className="form-group">
                <label htmlFor="veiculoId">Veículo *</label>
                <select
                  id="veiculoId"
                  name="veiculoId"
                  value={formData.veiculoId}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">Selecionar veículo...</option>
                  {veiculos.map(veiculo => (
                    <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.registration} - {veiculo.brand} {veiculo.model}
                      {veiculo.id === instrutor?.carroHabitual ? ' (Habitual)' : ''}
                    </option>
                  ))}
                </select>
                {veiculoSelecionado && (
                  <div className="veiculo-info">
                    <p><strong>Veículo selecionado:</strong> {veiculoSelecionado.registration} - {veiculoSelecionado.brand} {veiculoSelecionado.model}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seleção de Alunos */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">👥</span>
              <h3>Alunos</h3>
            </div>
            
            <div className="form-group">
              <label htmlFor="searchAlunos">Pesquisar Alunos</label>
              <input
                type="text"
                id="searchAlunos"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome ou número..."
                className="form-input"
              />
            </div>

            <div className="alunos-selection">
              <div className="alunos-list">
                {filteredAlunos.map(aluno => (
                  <div 
                    key={aluno.id} 
                    className={`aluno-item ${alunosSelecionados.find(a => a.id === aluno.id) ? 'selected' : ''}`}
                    onClick={() => handleAlunoToggle(aluno)}
                  >
                    <div className="aluno-checkbox">
                      <input
                        type="checkbox"
                        checked={alunosSelecionados.find(a => a.id === aluno.id) ? true : false}
                        onChange={() => handleAlunoToggle(aluno)}
                      />
                    </div>
                    <div className="aluno-info">
                      <h4>{aluno.name || 'Nome não informado'}</h4>
                      <p>Nº {aluno.enrollmentNumber || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {alunosSelecionados.length > 0 && (
                <div className="alunos-selecionados">
                  <h4>Alunos Selecionados ({alunosSelecionados.length})</h4>
                  <div className="selected-list">
                    {alunosSelecionados.map(aluno => (
                      <div key={aluno.id} className="selected-aluno">
                        <span>{aluno.name} (Nº {aluno.enrollmentNumber})</span>
                        <button 
                          type="button"
                          onClick={() => handleAlunoToggle(aluno)}
                          className="remove-aluno"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-icon">📝</span>
              <h3>Observações</h3>
            </div>
            
            <div className="form-group">
              <label htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                name="observacoes"
                value={formData.observacoes}
                onChange={handleInputChange}
                placeholder="Observações sobre a aula (opcional)..."
                className="form-textarea"
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
              {conflitos.length > 0 && (
                <ul className="conflitos-list">
                  {conflitos.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'A criar...' : 'Criar Aula'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CriarAulaModal;
