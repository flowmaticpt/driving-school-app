import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Configuracoes.css';

const Configuracoes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('general');

  const [settings, setSettings] = useState({
    // Geral
    appName: 'Driving School App',
    companyName: '',
    defaultLanguage: 'pt',
    timezone: 'Europe/Lisbon',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    
    // Segurança
    requireStrongPassword: true,
    sessionTimeout: 30,
    twoFactorAuth: false,
    ipWhitelist: false,
    allowedIPs: [],
    
    // Aparência
    theme: 'light',
    primaryColor: '#6366f1',
    compactMode: false,
    showAnimations: true,
    
    // Backup
    autoBackup: false,
    backupFrequency: 'daily',
    keepBackups: 30
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settingsRef = doc(db, 'system', 'settings');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }

      // Also load backup config from autoBackupConfig for compatibility
      const autoBackupConfigRef = doc(db, 'system', 'autoBackupConfig');
      const autoBackupConfigSnap = await getDoc(autoBackupConfigRef);
      
      if (autoBackupConfigSnap.exists()) {
        const backupConfig = autoBackupConfigSnap.data();
        setSettings(prev => ({
          ...prev,
          autoBackup: backupConfig.enabled || false,
          backupFrequency: backupConfig.interval || 'daily'
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      showMessage('error', 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsRef = doc(db, 'system', 'settings');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      // Also save backup config separately for compatibility with Backup page
      const autoBackupConfigRef = doc(db, 'system', 'autoBackupConfig');
      await setDoc(autoBackupConfigRef, {
        enabled: settings.autoBackup,
        interval: settings.backupFrequency
      }, { merge: true });
      
      showMessage('success', 'Configurações guardadas com sucesso!');
    } catch (error) {
      console.error('Erro ao guardar configurações:', error);
      showMessage('error', 'Erro ao guardar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja redefinir todas as configurações para os valores padrão?')) {
      fetchSettings(); // Recarrega as configurações do servidor
      showMessage('info', 'Configurações redefinidas');
    }
  };

  const tabs = [
    { id: 'general', label: '⚙️ Geral', icon: '⚙️' },
    { id: 'security', label: '🔒 Segurança', icon: '🔒' },
    { id: 'appearance', label: '🎨 Aparência', icon: '🎨' },
    { id: 'backup', label: '💾 Backup', icon: '💾' }
  ];

  return (
    <div className="configuracoes-page">
      <button className="configuracoes-back-button" onClick={() => navigate('/')}>
        ← Voltar
      </button>

      <div className="configuracoes-header">
        <h1>⚙️ Configurações</h1>
        <p>Gerencie as configurações do sistema</p>
      </div>

      {message.text && (
        <div className={`configuracoes-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="configuracoes-warning">
        <div className="warning-icon">⚠️</div>
        <div className="warning-content">
          <strong>Aviso:</strong> Algumas funcionalidades nesta página ainda não estão totalmente implementadas. As configurações serão salvas, mas podem não ter efeito imediato no sistema.
        </div>
      </div>

      <div className="configuracoes-container">
        <div className="configuracoes-sidebar">
          <div className="configuracoes-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`configuracoes-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="configuracoes-content">
          {loading ? (
            <div className="configuracoes-loading">Carregando configurações...</div>
          ) : (
            <>
              {/* Geral */}
              {activeTab === 'general' && (
                <div className="configuracoes-section">
                  <h2>Configurações Gerais</h2>
                  <div className="configuracoes-form">
                    <div className="config-form-group">
                      <label htmlFor="appName">Nome da Aplicação</label>
                      <input
                        type="text"
                        id="appName"
                        name="appName"
                        value={settings.appName}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="config-form-group">
                      <label htmlFor="companyName">Nome da Empresa</label>
                      <input
                        type="text"
                        id="companyName"
                        name="companyName"
                        value={settings.companyName}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="config-form-row">
                      <div className="config-form-group">
                        <label htmlFor="defaultLanguage">Idioma Padrão</label>
                        <select
                          id="defaultLanguage"
                          name="defaultLanguage"
                          value={settings.defaultLanguage}
                          onChange={handleInputChange}
                        >
                          <option value="pt">Português</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                        </select>
                      </div>

                      <div className="config-form-group">
                        <label htmlFor="timezone">Fuso Horário</label>
                        <select
                          id="timezone"
                          name="timezone"
                          value={settings.timezone}
                          onChange={handleInputChange}
                        >
                          <option value="Europe/Lisbon">Europe/Lisbon (UTC+0/+1)</option>
                          <option value="Europe/London">Europe/London (UTC+0/+1)</option>
                          <option value="Europe/Madrid">Europe/Madrid (UTC+1/+2)</option>
                          <option value="America/New_York">America/New_York (UTC-5/-4)</option>
                        </select>
                      </div>
                    </div>

                    <div className="config-form-row">
                      <div className="config-form-group">
                        <label htmlFor="dateFormat">Formato de Data</label>
                        <select
                          id="dateFormat"
                          name="dateFormat"
                          value={settings.dateFormat}
                          onChange={handleInputChange}
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>

                      <div className="config-form-group">
                        <label htmlFor="timeFormat">Formato de Hora</label>
                        <select
                          id="timeFormat"
                          name="timeFormat"
                          value={settings.timeFormat}
                          onChange={handleInputChange}
                        >
                          <option value="24h">24 horas</option>
                          <option value="12h">12 horas (AM/PM)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Segurança */}
              {activeTab === 'security' && (
                <div className="configuracoes-section">
                  <h2>Configurações de Segurança</h2>
                  <div className="configuracoes-form">
                    <div className="config-checkbox-group">
                      <label className="config-checkbox">
                        <input
                          type="checkbox"
                          name="requireStrongPassword"
                          checked={settings.requireStrongPassword}
                          onChange={handleInputChange}
                        />
                        <span>Exigir palavra-passe forte</span>
                      </label>

                      <label className="config-checkbox">
                        <input
                          type="checkbox"
                          name="twoFactorAuth"
                          checked={settings.twoFactorAuth}
                          onChange={handleInputChange}
                        />
                        <span>Ativar autenticação de dois fatores</span>
                      </label>

                      <label className="config-checkbox">
                        <input
                          type="checkbox"
                          name="ipWhitelist"
                          checked={settings.ipWhitelist}
                          onChange={handleInputChange}
                        />
                        <span>Ativar lista branca de IPs</span>
                      </label>
                    </div>

                    <div className="config-form-group">
                      <label htmlFor="sessionTimeout">Tempo de Expiração da Sessão (minutos)</label>
                      <input
                        type="number"
                        id="sessionTimeout"
                        name="sessionTimeout"
                        value={settings.sessionTimeout}
                        onChange={handleInputChange}
                        min="5"
                        max="1440"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Aparência */}
              {activeTab === 'appearance' && (
                <div className="configuracoes-section">
                  <h2>Configurações de Aparência</h2>
                  <div className="configuracoes-form">
                    <div className="config-form-group">
                      <label htmlFor="theme">Tema</label>
                      <select
                        id="theme"
                        name="theme"
                        value={settings.theme}
                        onChange={handleInputChange}
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="auto">Automático</option>
                      </select>
                    </div>

                    <div className="config-form-group">
                      <label htmlFor="primaryColor">Cor Primária</label>
                      <input
                        type="color"
                        id="primaryColor"
                        name="primaryColor"
                        value={settings.primaryColor}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="config-checkbox-group">
                      <label className="config-checkbox">
                        <input
                          type="checkbox"
                          name="compactMode"
                          checked={settings.compactMode}
                          onChange={handleInputChange}
                        />
                        <span>Modo compacto</span>
                      </label>

                      <label className="config-checkbox">
                        <input
                          type="checkbox"
                          name="showAnimations"
                          checked={settings.showAnimations}
                          onChange={handleInputChange}
                        />
                        <span>Mostrar animações</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Backup */}
              {activeTab === 'backup' && (
                <div className="configuracoes-section">
                  <h2>Configurações de Backup</h2>
                  <div className="configuracoes-form">
                    <div className="config-checkbox-group">
                      <label className="config-checkbox">
                        <input
                          type="checkbox"
                          name="autoBackup"
                          checked={settings.autoBackup}
                          onChange={handleInputChange}
                        />
                        <span>Ativar backup automático</span>
                      </label>
                    </div>

                    {settings.autoBackup && (
                      <>
                        <div className="config-form-group">
                          <label htmlFor="backupFrequency">Frequência do Backup</label>
                          <select
                            id="backupFrequency"
                            name="backupFrequency"
                            value={settings.backupFrequency}
                            onChange={handleInputChange}
                          >
                            <option value="daily">Diariamente</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="monthly">Mensalmente</option>
                          </select>
                        </div>

                        <div className="config-form-group">
                          <label htmlFor="keepBackups">Manter Backups (dias)</label>
                          <input
                            type="number"
                            id="keepBackups"
                            name="keepBackups"
                            value={settings.keepBackups}
                            onChange={handleInputChange}
                            min="1"
                            max="365"
                          />
                          <small>Backups mais antigos serão removidos automaticamente</small>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="configuracoes-actions">
                <button
                  className="configuracoes-btn-reset"
                  onClick={handleReset}
                  disabled={saving}
                >
                  Redefinir
                </button>
                <button
                  className="configuracoes-btn-save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar Configurações'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;

