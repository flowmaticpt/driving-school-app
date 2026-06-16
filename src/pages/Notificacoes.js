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
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import './Notificacoes.css';

const Notificacoes = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('notifications'); // notifications, alerts
  const [notifications, setNotifications] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCreateAlertModal, setShowCreateAlertModal] = useState(false);
  const [showEditAlertModal, setShowEditAlertModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [newAlertRule, setNewAlertRule] = useState({
    name: '',
    type: 'expense', // expense, income, classes, students
    condition: 'greater_than', // greater_than, less_than, equals
    value: '',
    period: 'daily', // daily, weekly, monthly
    schools: [],
    active: true
  });

  useEffect(() => {
    fetchNotifications();
    fetchAlertRules();
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const notificationsRef = collection(db, 'notifications');
      let q;

      if (filter === 'unread') {
        q = query(
          notificationsRef,
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      } else if (filter === 'read') {
        q = query(
          notificationsRef,
          where('read', '==', true),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      } else {
        q = query(
          notificationsRef,
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      const notificationsList = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.deleted) {
          notificationsList.push({ id: doc.id, ...data });
        }
      });
      
      setNotifications(notificationsList);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      showMessage('error', 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertRules = async () => {
    try {
      const rulesRef = collection(db, 'alert_rules');
      const snapshot = await getDocs(rulesRef);
      const rulesList = [];
      
      snapshot.forEach(doc => {
        rulesList.push({ id: doc.id, ...doc.data() });
      });
      
      setAlertRules(rulesList);
    } catch (error) {
      console.error('Erro ao buscar regras de alerta:', error);
      showMessage('error', 'Erro ao carregar regras de alerta');
    }
  };

  const fetchSchools = async () => {
    try {
      const schoolsRef = collection(db, 'schools');
      const snapshot = await getDocs(schoolsRef);
      const schoolsList = [];
      
      snapshot.forEach(doc => {
        schoolsList.push({ id: doc.id, ...doc.data() });
      });
      
      setSchools(schoolsList);
    } catch (error) {
      console.error('Erro ao buscar escolas:', error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAlertRule(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSchoolToggle = (schoolId) => {
    setNewAlertRule(prev => ({
      ...prev,
      schools: prev.schools.includes(schoolId)
        ? prev.schools.filter(id => id !== schoolId)
        : [...prev.schools, schoolId]
    }));
  };

  const handleCreateAlertRule = async (e) => {
    e.preventDefault();
    
    if (!newAlertRule.name.trim() || !newAlertRule.value) {
      showMessage('error', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (newAlertRule.schools.length === 0) {
      showMessage('error', 'Selecione pelo menos uma escola');
      return;
    }

    setSaving(true);
    try {
      const alertData = {
        ...newAlertRule,
        value: parseFloat(newAlertRule.value) || 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'alert_rules'), alertData);
      
      showMessage('success', 'Regra de alerta criada com sucesso!');
      setNewAlertRule({
        name: '',
        type: 'expense',
        condition: 'greater_than',
        value: '',
        period: 'daily',
        schools: [],
        active: true
      });
      setShowCreateAlertModal(false);
      fetchAlertRules();
    } catch (error) {
      console.error('Erro ao criar regra de alerta:', error);
      showMessage('error', 'Erro ao criar regra de alerta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAlertRule = async (e) => {
    e.preventDefault();
    
    if (!selectedAlert || !selectedAlert.name.trim() || !selectedAlert.value) {
      showMessage('error', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (selectedAlert.schools.length === 0) {
      showMessage('error', 'Selecione pelo menos uma escola');
      return;
    }

    setSaving(true);
    try {
      const alertData = {
        ...selectedAlert,
        value: parseFloat(selectedAlert.value) || 0,
        updatedAt: Timestamp.now()
      };

      const alertRef = doc(db, 'alert_rules', selectedAlert.id);
      await updateDoc(alertRef, alertData);
      
      showMessage('success', 'Regra de alerta atualizada com sucesso!');
      setShowEditAlertModal(false);
      setSelectedAlert(null);
      fetchAlertRules();
    } catch (error) {
      console.error('Erro ao atualizar regra de alerta:', error);
      showMessage('error', 'Erro ao atualizar regra de alerta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAlertActive = async (alertId, currentActive) => {
    try {
      const alertRef = doc(db, 'alert_rules', alertId);
      await updateDoc(alertRef, {
        active: !currentActive,
        updatedAt: Timestamp.now()
      });
      
      setAlertRules(prev => 
        prev.map(rule => rule.id === alertId ? { ...rule, active: !currentActive } : rule)
      );
      showMessage('success', `Alerta ${!currentActive ? 'ativado' : 'desativado'}`);
    } catch (error) {
      console.error('Erro ao alterar estado do alerta:', error);
      showMessage('error', 'Erro ao alterar estado do alerta');
    }
  };

  const handleDeleteAlertRule = async (alertId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra de alerta?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'alert_rules', alertId));
      showMessage('success', 'Regra de alerta excluída');
      fetchAlertRules();
    } catch (error) {
      console.error('Erro ao excluir regra de alerta:', error);
      showMessage('error', 'Erro ao excluir regra de alerta');
    }
  };

  const handleOpenEditModal = (alert) => {
    setSelectedAlert({
      ...alert,
      schools: alert.schools || []
    });
    setShowEditAlertModal(true);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: Timestamp.now()
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true, readAt: Timestamp.now() } : n)
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      showMessage('error', 'Erro ao atualizar notificação');
    }
  };

  const handleMarkAsUnread = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: false,
        readAt: null
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: false, readAt: null } : n)
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como não lida:', error);
      showMessage('error', 'Erro ao atualizar notificação');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        return updateDoc(notificationRef, {
          read: true,
          readAt: Timestamp.now()
        });
      });

      await Promise.all(updatePromises);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, readAt: Timestamp.now() }))
      );
      
      showMessage('success', 'Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      showMessage('error', 'Erro ao atualizar notificações');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta notificação?')) {
      return;
    }

    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        deleted: true,
        deletedAt: Timestamp.now()
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      showMessage('success', 'Notificação excluída');
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      showMessage('error', 'Erro ao excluir notificação');
    }
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

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type) => {
    const labels = {
      'expense': '💰 Despesas',
      'income': '💵 Rendimentos',
      'classes': '📚 Aulas',
      'students': '👥 Alunos'
    };
    return labels[type] || type;
  };

  const getConditionLabel = (condition) => {
    const labels = {
      'greater_than': 'Maior que',
      'less_than': 'Menor que',
      'equals': 'Igual a'
    };
    return labels[condition] || condition;
  };

  const getPeriodLabel = (period) => {
    const labels = {
      'daily': 'Diário',
      'weekly': 'Semanal',
      'monthly': 'Mensal'
    };
    return labels[period] || period;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notificacoes-page">
      <button className="notificacoes-back-button" onClick={() => navigate('/')}>
        ← Voltar
      </button>

      <div className="notificacoes-header">
        <div className="header-content">
          <div>
            <h1>🔔 Notificações</h1>
            <p>Gerencie suas notificações e alertas</p>
          </div>
          {unreadCount > 0 && (
            <div className="unread-badge">
              {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`notificacoes-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="notificacoes-tabs-nav">
        <button
          className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          📬 Notificações
        </button>
        <button
          className={`nav-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          ⚙️ Configurar Alertas
        </button>
      </div>

      {/* Tab: Notificações */}
      {activeTab === 'notifications' && (
        <>
          <div className="notificacoes-filters">
            <div className="filter-group">
              <label>Status:</label>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  Todas
                </button>
                <button
                  className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilter('unread')}
                >
                  Não lidas ({notifications.filter(n => !n.read).length})
                </button>
                <button
                  className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                  onClick={() => setFilter('read')}
                >
                  Lidas
                </button>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                className="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
              >
                ✓ Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="notificacoes-list">
            {loading ? (
              <div className="notificacoes-loading">Carregando notificações...</div>
            ) : notifications.length === 0 ? (
              <div className="notificacoes-empty">
                <div className="empty-icon">📭</div>
                <h3>Nenhuma notificação encontrada</h3>
                <p>Não há notificações {filter !== 'all' ? `com o filtro selecionado` : ''} no momento</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-card ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    {notification.type === 'expense' ? '💰' : 
                     notification.type === 'income' ? '💵' :
                     notification.type === 'student' ? '👤' :
                     notification.type === 'classes' ? '📚' :
                     notification.type === 'warning' ? '⚠️' :
                     notification.type === 'info' ? 'ℹ️' :
                     notification.type === 'success' ? '✅' :
                     notification.type === 'error' ? '❌' : '📢'}
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-header">
                      <div className="notification-meta">
                        <span className="notification-date">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      {!notification.read && (
                        <span className="unread-dot"></span>
                      )}
                    </div>

                    <h3 className="notification-title">{notification.title}</h3>
                    
                    {notification.message && (
                      <p className="notification-message">{notification.message}</p>
                    )}

                    {notification.link && (
                      <a
                        href={notification.link}
                        className="notification-link"
                        onClick={(e) => {
                          e.preventDefault();
                          if (notification.link.startsWith('/')) {
                            navigate(notification.link);
                          } else {
                            window.open(notification.link, '_blank');
                          }
                          if (!notification.read) {
                            handleMarkAsRead(notification.id);
                          }
                        }}
                      >
                        Ver detalhes →
                      </a>
                    )}

                    <div className="notification-footer">
                      <div className="notification-actions">
                        {notification.read ? (
                          <button
                            className="action-btn unread-btn"
                            onClick={() => handleMarkAsUnread(notification.id)}
                            title="Marcar como não lida"
                          >
                            📬 Marcar como não lida
                          </button>
                        ) : (
                          <button
                            className="action-btn read-btn"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="Marcar como lida"
                          >
                            ✓ Marcar como lida
                          </button>
                        )}
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteNotification(notification.id)}
                          title="Excluir"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Tab: Configurar Alertas */}
      {activeTab === 'alerts' && (
        <>
          <div className="alerts-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Nota:</strong> Algumas condições podem não estar a funcionar completamente.
            </div>
          </div>

          <div className="alerts-actions">
            <button 
              className="alerts-btn-create" 
              onClick={() => setShowCreateAlertModal(true)}
            >
              ➕ Criar Nova Regra de Alerta
            </button>
          </div>

          <div className="alerts-rules-list">
            {alertRules.length === 0 ? (
              <div className="alerts-empty">
                <div className="empty-icon">⚙️</div>
                <h3>Nenhuma regra de alerta configurada</h3>
                <p>Crie regras para receber notificações automáticas quando certas condições forem atendidas</p>
              </div>
            ) : (
              alertRules.map(rule => (
                <div key={rule.id} className="alert-rule-card">
                  <div className="alert-rule-header">
                    <div className="alert-rule-info">
                      <h3>{rule.name}</h3>
                      <div className="alert-rule-meta">
                        <span className="alert-type-badge">{getTypeLabel(rule.type)}</span>
                        <span className="alert-condition">
                          {getConditionLabel(rule.condition)} {rule.value}
                          {rule.type === 'expense' || rule.type === 'income' ? ' €' : ''}
                        </span>
                        <span className="alert-period">{getPeriodLabel(rule.period)}</span>
                      </div>
                    </div>
                    <div className="alert-rule-status">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={rule.active}
                          onChange={() => handleToggleAlertActive(rule.id, rule.active)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className={`status-text ${rule.active ? 'active' : 'inactive'}`}>
                        {rule.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="alert-rule-schools">
                    <strong>Escolas:</strong>
                    {rule.schools && rule.schools.length > 0 ? (
                      <div className="schools-list">
                        {rule.schools.map(schoolId => {
                          const school = schools.find(s => s.id === schoolId);
                          return school ? (
                            <span key={schoolId} className="school-badge">{school.name}</span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span className="no-schools">Nenhuma escola selecionada</span>
                    )}
                  </div>

                  <div className="alert-rule-actions">
                    <button
                      className="alert-btn-edit"
                      onClick={() => handleOpenEditModal(rule)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="alert-btn-delete"
                      onClick={() => handleDeleteAlertRule(rule.id)}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Create Alert Rule Modal */}
      {showCreateAlertModal && (
        <div className="notificacoes-modal-overlay" onClick={() => setShowCreateAlertModal(false)}>
          <div className="notificacoes-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="notificacoes-modal-header">
              <h2>Criar Nova Regra de Alerta</h2>
              <button 
                className="notificacoes-modal-close"
                onClick={() => setShowCreateAlertModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAlertRule} className="notificacoes-modal-body">
              <div className="notificacoes-form-group">
                <label htmlFor="alert-name">
                  Nome da Regra <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="alert-name"
                  name="name"
                  value={newAlertRule.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Despesas acima de 1000€"
                  required
                  disabled={saving}
                />
              </div>

              <div className="notificacoes-form-row">
                <div className="notificacoes-form-group">
                  <label htmlFor="alert-type">Tipo de Alerta <span className="required">*</span></label>
                  <select
                    id="alert-type"
                    name="type"
                    value={newAlertRule.type}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                  >
                    <option value="expense">💰 Despesas</option>
                    <option value="income">💵 Rendimentos</option>
                    <option value="classes">📚 Aulas</option>
                    <option value="students">👥 Alunos Adicionados</option>
                  </select>
                </div>

                <div className="notificacoes-form-group">
                  <label htmlFor="alert-condition">Condição <span className="required">*</span></label>
                  <select
                    id="alert-condition"
                    name="condition"
                    value={newAlertRule.condition}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                  >
                    <option value="greater_than">Maior que</option>
                    <option value="less_than">Menor que</option>
                    <option value="equals">Igual a</option>
                  </select>
                </div>
              </div>

              <div className="notificacoes-form-row">
                <div className="notificacoes-form-group">
                  <label htmlFor="alert-value">
                    Valor/Quantidade <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="alert-value"
                    name="value"
                    value={newAlertRule.value}
                    onChange={handleInputChange}
                    placeholder={(newAlertRule.type === 'expense' || newAlertRule.type === 'income') ? '1000' : '10'}
                    step={(newAlertRule.type === 'expense' || newAlertRule.type === 'income') ? '0.01' : '1'}
                    min="0"
                    required
                    disabled={saving}
                  />
                  <small>
                    {(newAlertRule.type === 'expense' || newAlertRule.type === 'income') 
                      ? 'Valor em euros (€)' 
                      : 'Quantidade numérica'}
                  </small>
                </div>

                <div className="notificacoes-form-group">
                  <label htmlFor="alert-period">Período <span className="required">*</span></label>
                  <select
                    id="alert-period"
                    name="period"
                    value={newAlertRule.period}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                  <small>Com que frequência verificar esta condição</small>
                </div>
              </div>

              <div className="notificacoes-form-group">
                <label>Escolas <span className="required">*</span></label>
                <div className="schools-checklist">
                  {schools.length === 0 ? (
                    <div className="no-schools-msg">Nenhuma escola disponível</div>
                  ) : (
                    schools.map(school => (
                      <label key={school.id} className="school-checkbox">
                        <input
                          type="checkbox"
                          checked={newAlertRule.schools.includes(school.id)}
                          onChange={() => handleSchoolToggle(school.id)}
                          disabled={saving}
                        />
                        <span>{school.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <small>Selecione as escolas para as quais este alerta se aplica</small>
              </div>

              <div className="notificacoes-form-group">
                <label className="alert-checkbox">
                  <input
                    type="checkbox"
                    name="active"
                    checked={newAlertRule.active}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                  <span>Ativar regra imediatamente</span>
                </label>
              </div>

              <div className="notificacoes-modal-footer">
                <button
                  type="button"
                  className="notificacoes-btn-cancel"
                  onClick={() => {
                    setShowCreateAlertModal(false);
                    setNewAlertRule({
                      name: '',
                      type: 'expense',
                      condition: 'greater_than',
                      value: '',
                      period: 'daily',
                      schools: [],
                      active: true
                    });
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="notificacoes-btn-submit"
                  disabled={saving || !newAlertRule.name.trim() || !newAlertRule.value || newAlertRule.schools.length === 0}
                >
                  {saving ? 'Criando...' : 'Criar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Alert Rule Modal */}
      {showEditAlertModal && selectedAlert && (
        <div className="notificacoes-modal-overlay" onClick={() => setShowEditAlertModal(false)}>
          <div className="notificacoes-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="notificacoes-modal-header">
              <h2>Editar Regra de Alerta</h2>
              <button 
                className="notificacoes-modal-close"
                onClick={() => {
                  setShowEditAlertModal(false);
                  setSelectedAlert(null);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditAlertRule} className="notificacoes-modal-body">
              <div className="notificacoes-form-group">
                <label htmlFor="edit-alert-name">
                  Nome da Regra <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="edit-alert-name"
                  name="name"
                  value={selectedAlert.name}
                  onChange={(e) => setSelectedAlert({ ...selectedAlert, name: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>

              <div className="notificacoes-form-row">
                <div className="notificacoes-form-group">
                  <label htmlFor="edit-alert-type">Tipo de Alerta <span className="required">*</span></label>
                  <select
                    id="edit-alert-type"
                    name="type"
                    value={selectedAlert.type}
                    onChange={(e) => setSelectedAlert({ ...selectedAlert, type: e.target.value })}
                    required
                    disabled={saving}
                  >
                    <option value="expense">💰 Despesas</option>
                    <option value="income">💵 Rendimentos</option>
                    <option value="classes">📚 Aulas</option>
                    <option value="students">👥 Alunos Adicionados</option>
                  </select>
                </div>

                <div className="notificacoes-form-group">
                  <label htmlFor="edit-alert-condition">Condição <span className="required">*</span></label>
                  <select
                    id="edit-alert-condition"
                    name="condition"
                    value={selectedAlert.condition}
                    onChange={(e) => setSelectedAlert({ ...selectedAlert, condition: e.target.value })}
                    required
                    disabled={saving}
                  >
                    <option value="greater_than">Maior que</option>
                    <option value="less_than">Menor que</option>
                    <option value="equals">Igual a</option>
                  </select>
                </div>
              </div>

              <div className="notificacoes-form-row">
                <div className="notificacoes-form-group">
                  <label htmlFor="edit-alert-value">
                    Valor/Quantidade <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="edit-alert-value"
                    name="value"
                    value={selectedAlert.value}
                    onChange={(e) => setSelectedAlert({ ...selectedAlert, value: e.target.value })}
                    step={(selectedAlert.type === 'expense' || selectedAlert.type === 'income') ? '0.01' : '1'}
                    min="0"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="notificacoes-form-group">
                  <label htmlFor="edit-alert-period">Período <span className="required">*</span></label>
                  <select
                    id="edit-alert-period"
                    name="period"
                    value={selectedAlert.period}
                    onChange={(e) => setSelectedAlert({ ...selectedAlert, period: e.target.value })}
                    required
                    disabled={saving}
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
              </div>

              <div className="notificacoes-form-group">
                <label>Escolas <span className="required">*</span></label>
                <div className="schools-checklist">
                  {schools.length === 0 ? (
                    <div className="no-schools-msg">Nenhuma escola disponível</div>
                  ) : (
                    schools.map(school => (
                      <label key={school.id} className="school-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedAlert.schools.includes(school.id)}
                          onChange={() => {
                            const schools = selectedAlert.schools.includes(school.id)
                              ? selectedAlert.schools.filter(id => id !== school.id)
                              : [...selectedAlert.schools, school.id];
                            setSelectedAlert({ ...selectedAlert, schools });
                          }}
                          disabled={saving}
                        />
                        <span>{school.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="notificacoes-form-group">
                <label className="alert-checkbox">
                  <input
                    type="checkbox"
                    name="active"
                    checked={selectedAlert.active}
                    onChange={(e) => setSelectedAlert({ ...selectedAlert, active: e.target.checked })}
                    disabled={saving}
                  />
                  <span>Regra ativa</span>
                </label>
              </div>

              <div className="notificacoes-modal-footer">
                <button
                  type="button"
                  className="notificacoes-btn-cancel"
                  onClick={() => {
                    setShowEditAlertModal(false);
                    setSelectedAlert(null);
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="notificacoes-btn-submit"
                  disabled={saving || !selectedAlert.name.trim() || !selectedAlert.value || selectedAlert.schools.length === 0}
                >
                  {saving ? 'Guardando...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notificacoes;
