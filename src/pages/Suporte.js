import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './Suporte.css';

const Suporte = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState('all'); // all, open, in_progress, resolved, closed
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [newTicket, setNewTicket] = useState({
    title: '',
    category: 'question',
    priority: 'medium',
    description: ''
  });

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const ticketsRef = collection(db, 'support_tickets');
      let q;
      
      if (filter === 'all') {
        q = query(ticketsRef, orderBy('createdAt', 'desc'));
      } else {
        q = query(ticketsRef, where('status', '==', filter), orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      const ticketsList = [];
      snapshot.forEach(doc => {
        ticketsList.push({ id: doc.id, ...doc.data() });
      });
      
      setTickets(ticketsList);
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      showMessage('error', 'Erro ao carregar tickets de suporte');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    
    if (!userData) {
      showMessage('error', 'Erro: dados do utilizador não disponíveis');
      return;
    }
    
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      showMessage('error', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const ticketData = {
        title: newTicket.title.trim(),
        category: newTicket.category,
        priority: newTicket.priority,
        description: newTicket.description.trim(),
        status: 'open',
        createdBy: {
          userId: userData?.id || '',
          name: userData?.name || 'Utilizador',
          email: userData?.email || ''
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messages: [{
          message: newTicket.description.trim(),
          sentBy: {
            userId: userData?.id || '',
            name: userData?.name || 'Utilizador',
            email: userData?.email || ''
          },
          sentAt: Timestamp.now()
        }]
      };

      await addDoc(collection(db, 'support_tickets'), ticketData);
      
      showMessage('success', 'Ticket criado com sucesso!');
      setNewTicket({ title: '', category: 'question', priority: 'medium', description: '' });
      setShowCreateModal(false);
      fetchTickets();
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      showMessage('error', 'Erro ao criar ticket. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      showMessage('success', 'Status do ticket atualizado');
      fetchTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showMessage('error', 'Erro ao atualizar status do ticket');
    }
  };

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status) => {
    const labels = {
      'open': 'Aberto',
      'in_progress': 'Em Progresso',
      'resolved': 'Resolvido',
      'closed': 'Fechado'
    };
    return labels[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = {
      'open': 'status-open',
      'in_progress': 'status-in-progress',
      'resolved': 'status-resolved',
      'closed': 'status-closed'
    };
    return classes[status] || '';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  };

  const getPriorityClass = (priority) => {
    const classes = {
      'low': 'priority-low',
      'medium': 'priority-medium',
      'high': 'priority-high',
      'urgent': 'priority-urgent'
    };
    return classes[priority] || '';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'bug': '🐛 Bug',
      'feature': '✨ Funcionalidade',
      'question': '❓ Pergunta',
      'technical': '🔧 Técnico',
      'other': '📝 Outro'
    };
    return labels[category] || category;
  };

  const filteredTickets = tickets;

  return (
    <div className="suporte-page">
      <button className="suporte-back-button" onClick={() => navigate('/')}>
        ← Voltar
      </button>

      <div className="suporte-header">
        <h1>🆘 Suporte</h1>
        <p>Gerencie solicitações de suporte e ajuda</p>
      </div>

      {message.text && (
        <div className={`suporte-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="suporte-actions">
        <button 
          className="suporte-btn-primary" 
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
        >
          ➕ Criar Novo Ticket
        </button>
      </div>

      <div className="suporte-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos
        </button>
        <button 
          className={`filter-btn ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
        >
          Abertos
        </button>
        <button 
          className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          Em Progresso
        </button>
        <button 
          className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilter('resolved')}
        >
          Resolvidos
        </button>
        <button 
          className={`filter-btn ${filter === 'closed' ? 'active' : ''}`}
          onClick={() => setFilter('closed')}
        >
          Fechados
        </button>
      </div>

      <div className="suporte-tickets">
        {loading ? (
          <div className="suporte-loading">Carregando tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="suporte-empty">
            <div className="empty-icon">📭</div>
            <h3>Nenhum ticket encontrado</h3>
            <p>Não há tickets {filter !== 'all' ? `com status "${getStatusLabel(filter)}"` : ''} no momento</p>
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-header">
                <div className="ticket-title-section">
                  <h3 className="ticket-title">{ticket.title}</h3>
                  <div className="ticket-meta">
                    <span className={`ticket-status ${getStatusClass(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <span className={`ticket-priority ${getPriorityClass(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                    <span className="ticket-category">
                      {getCategoryLabel(ticket.category)}
                    </span>
                  </div>
                </div>
                <div className="ticket-actions">
                  <button 
                    className="ticket-btn-view"
                    onClick={() => handleViewTicket(ticket)}
                  >
                    👁️ Ver Detalhes
                  </button>
                </div>
              </div>
              
              <div className="ticket-body">
                <p className="ticket-description">
                  {ticket.description || ticket.messages?.[0]?.message || 'Sem descrição'}
                </p>
                <div className="ticket-footer">
                  <span className="ticket-author">
                    Criado por: {ticket.createdBy?.name || 'Utilizador'}
                  </span>
                  <span className="ticket-date">
                    {formatDate(ticket.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="suporte-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="suporte-modal" onClick={(e) => e.stopPropagation()}>
            <div className="suporte-modal-header">
              <h2>Criar Novo Ticket</h2>
              <button 
                className="suporte-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="suporte-modal-body">
              <div className="suporte-form-group">
                <label htmlFor="ticket-title">
                  Título <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="ticket-title"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  placeholder="Ex: Erro ao fazer login"
                  required
                  disabled={loading}
                />
              </div>

              <div className="suporte-form-row">
                <div className="suporte-form-group">
                  <label htmlFor="ticket-category">Categoria</label>
                  <select
                    id="ticket-category"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    disabled={loading}
                  >
                    <option value="bug">🐛 Bug</option>
                    <option value="feature">✨ Funcionalidade</option>
                    <option value="question">❓ Pergunta</option>
                    <option value="technical">🔧 Técnico</option>
                    <option value="other">📝 Outro</option>
                  </select>
                </div>

                <div className="suporte-form-group">
                  <label htmlFor="ticket-priority">Prioridade</label>
                  <select
                    id="ticket-priority"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    disabled={loading}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="suporte-form-group">
                <label htmlFor="ticket-description">
                  Descrição <span className="required">*</span>
                </label>
                <textarea
                  id="ticket-description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Descreva o problema ou solicitação..."
                  rows="6"
                  required
                  disabled={loading}
                />
              </div>

              <div className="suporte-modal-footer">
                <button
                  type="button"
                  className="suporte-btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="suporte-btn-submit"
                  disabled={loading}
                >
                  {loading ? 'Criando...' : 'Criar Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {showTicketModal && selectedTicket && (
        <div className="suporte-modal-overlay" onClick={() => setShowTicketModal(false)}>
          <div className="suporte-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="suporte-modal-header">
              <h2>{selectedTicket.title}</h2>
              <button 
                className="suporte-modal-close"
                onClick={() => setShowTicketModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="suporte-modal-body">
              <div className="ticket-details">
                <div className="ticket-details-meta">
                  <div className="ticket-detail-item">
                    <label>Status:</label>
                    <span className={`ticket-status ${getStatusClass(selectedTicket.status)}`}>
                      {getStatusLabel(selectedTicket.status)}
                    </span>
                  </div>
                  <div className="ticket-detail-item">
                    <label>Prioridade:</label>
                    <span className={`ticket-priority ${getPriorityClass(selectedTicket.priority)}`}>
                      {getPriorityLabel(selectedTicket.priority)}
                    </span>
                  </div>
                  <div className="ticket-detail-item">
                    <label>Categoria:</label>
                    <span>{getCategoryLabel(selectedTicket.category)}</span>
                  </div>
                  <div className="ticket-detail-item">
                    <label>Criado por:</label>
                    <span>{selectedTicket.createdBy?.name || 'Utilizador'}</span>
                  </div>
                  <div className="ticket-detail-item">
                    <label>Data de criação:</label>
                    <span>{formatDate(selectedTicket.createdAt)}</span>
                  </div>
                  <div className="ticket-detail-item">
                    <label>Última atualização:</label>
                    <span>{formatDate(selectedTicket.updatedAt)}</span>
                  </div>
                </div>

                <div className="ticket-description-section">
                  <h3>Descrição</h3>
                  <p>{selectedTicket.description || selectedTicket.messages?.[0]?.message || 'Sem descrição'}</p>
                </div>

                {selectedTicket.messages && selectedTicket.messages.length > 1 && (
                  <div className="ticket-messages-section">
                    <h3>Mensagens ({selectedTicket.messages.length})</h3>
                    <div className="ticket-messages-list">
                      {selectedTicket.messages.map((msg, index) => (
                        <div key={index} className="ticket-message">
                          <div className="message-header">
                            <span className="message-author">{msg.sentBy?.name || 'Utilizador'}</span>
                            <span className="message-date">{formatDate(msg.sentAt)}</span>
                          </div>
                          <div className="message-content">{msg.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ticket-actions-section">
                  <h3>Ações</h3>
                  <div className="ticket-status-actions">
                    {selectedTicket.status !== 'open' && (
                      <button
                        className="suporte-btn-secondary"
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'open')}
                      >
                        Reabrir Ticket
                      </button>
                    )}
                    {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'closed' && (
                      <button
                        className="suporte-btn-secondary"
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'in_progress')}
                      >
                        Marcar como Em Progresso
                      </button>
                    )}
                    {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                      <button
                        className="suporte-btn-secondary"
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'resolved')}
                      >
                        Marcar como Resolvido
                      </button>
                    )}
                    {selectedTicket.status !== 'closed' && (
                      <button
                        className="suporte-btn-secondary"
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'closed')}
                      >
                        Fechar Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suporte;

