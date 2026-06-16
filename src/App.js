import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MudarPalavraPasseModal from './components/MudarPalavraPasseModal';
import './App.css';
import ConfiguracoesGerais from './pages/ConfiguracoesGerais';
import Escolas from './pages/Escolas';
import Grupos from './pages/Grupos';
import VisaoGeralEscolas from './pages/VisaoGeralEscolas';
import EscolaDetalhes from './pages/EscolaDetalhes';
import Alunos from './pages/Alunos';
import AlunosAntigos from './pages/AlunosAntigos';
import Aulas from './pages/Aulas';
import Instrutores from './pages/Instrutores';
import Servicos from './pages/Servicos';
import Inventario from './pages/Inventario';
import Movimentos from './pages/Movimentos';
import Despesas from './pages/Despesas';
import VisaoFinanceira from './pages/VisaoFinanceira';
import Relatorios from './pages/Relatorios';
import RelatoriosGlobais from './pages/RelatoriosGlobais';
import ServicosPrestados from './pages/ServicosPrestados';
import MateriaisPrestados from './pages/MateriaisPrestados';
import Frota from './pages/Frota';
import Funcionarios from './pages/Funcionarios';
import Utilizadores from './pages/Utilizadores';
import Aprovacoes from './pages/Aprovacoes';
import SemAcesso from './pages/SemAcesso';
import SmartRedirect from './components/SmartRedirect';
import Auth from './pages/Auth';
import Backup from './pages/Backup';
import Suporte from './pages/Suporte';
import SuporteEscola from './pages/SuporteEscola';
import Configuracoes from './pages/Configuracoes';
import Notificacoes from './pages/Notificacoes';
import Documentos from './pages/Documentos';
import ModelosContrato from './pages/ModelosContrato';
import RelatorioInstrutores from './pages/RelatorioInstrutores';
import LimpezaDados from './pages/LimpezaDados';

// Layout component that includes the header for all pages
const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  return (
    <div className="App">
      <div className="header">
        <div className="header-content">
          <h1>Driving School App</h1>
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">Olá, {userData?.name}</span>
              <span className="user-role">({userData?.role})</span>
            </div>
            <div className="button-group">
              <button className="change-password-button" onClick={handleChangePassword}>
                🔒 Alterar Palavra-passe
              </button>
              <button className="logout-button" onClick={handleLogout}>
                🚪 Sair
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="content" role="main">
        {children}
      </div>

      <div className="app-footer">
        <span className="app-version">v0.1.0</span>
      </div>

      {showPasswordModal && (
        <MudarPalavraPasseModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  // Instrutor: redirecionar para a escola atribuída
  useEffect(() => {
    if (userData?.role === 'instrutor') {
      const escolaId = userData.escolasAtribuidas?.[0] || userData.schoolId;
      if (escolaId) {
        navigate(`/escola/${escolaId}`, { replace: true });
      }
    }
  }, [userData, navigate]);

  const handleEscolasGrupos = () => {
    navigate('/configuracoes');
  };

  const handleConfiguracoes = () => {
    navigate('/settings');
  };

  const handleVisaoGeral = () => {
    navigate('/visao-geral');
  };

  const handleUtilizadores = () => {
    navigate('/utilizadores');
  };

  const handleAprovacoes = () => {
    navigate('/aprovacoes');
  };

  const handleRelatoriosGlobais = () => {
    navigate('/relatorios-globais');
  };

  const handleSuporte = () => {
    navigate('/suporte');
  };

  const handleBackup = () => {
    navigate('/backup');
  };

  const handleDocumentos = () => {
    navigate('/documentos');
  };

  const handleNotificacoes = () => {
    navigate('/notificacoes');
  };

  // Se instrutor, mostrar loading enquanto redireciona
  if (userData?.role === 'instrutor') {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>A redirecionar para a sua escola...</p>
      </div>
    );
  }

  return (
    <>
        <section className="hero" aria-label="Apresentação">
          <div className="hero-body">
            <h2 className="hero-title">Bem-vindo{userData?.name ? `, ${userData.name}` : ''}</h2>
            <p className="hero-subtitle">Gestão moderna e clara da sua rede de escolas de condução.</p>
            <div className="hero-actions">
              <button className="menu-tile primary" onClick={handleVisaoGeral} aria-label="Abrir visão geral de escolas">
                <div className="menu-icon-wrap">🏫</div>
                <div className="menu-content">
                  <div className="menu-title">Visão Geral</div>
                  <div className="menu-desc">Veja todas as escolas e grupos</div>
                </div>
              </button>
              {userData?.role === 'dono' && (
                <button className="menu-tile outline" onClick={handleRelatoriosGlobais} aria-label="Abrir relatórios globais">
                  <div className="menu-icon-wrap">📊</div>
                  <div className="menu-content">
                    <div className="menu-title">Relatórios</div>
                    <div className="menu-desc">Exportar e analisar resultados</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="gestao-title">
          <div className="section-header">
            <h3 id="gestao-title" className="section-title">Gestão</h3>
            <p className="section-desc">Aceda rapidamente às áreas de administração</p>
          </div>
          <div className="tiles-grid">
            {userData?.role === 'dono' && (
              <button className="menu-tile" onClick={handleUtilizadores} aria-label="Gestão de Utilizadores">
                <div className="menu-icon-wrap">👤</div>
                <div className="menu-content">
                  <div className="menu-title">Utilizadores</div>
                  <div className="menu-desc">Gerir contas e permissões</div>
                </div>
              </button>
            )}
            {userData?.role === 'dono' && (
              <button className="menu-tile" onClick={handleAprovacoes} aria-label="Aprovação de Utilizadores">
                <div className="menu-icon-wrap">✅</div>
                <div className="menu-content">
                  <div className="menu-title">Aprovações</div>
                  <div className="menu-desc">Rever pedidos de acesso</div>
                </div>
              </button>
            )}
            <button className="menu-tile" onClick={handleEscolasGrupos} aria-label="Escolas e Grupos">
              <div className="menu-icon-wrap">🏫</div>
              <div className="menu-content">
                <div className="menu-title">Escolas/Grupos</div>
                <div className="menu-desc">Gerir escolas e grupos</div>
              </div>
            </button>
            <button className="menu-tile" onClick={handleConfiguracoes} aria-label="Configurações Gerais">
              <div className="menu-icon-wrap">⚙️</div>
              <div className="menu-content">
                <div className="menu-title">Configurações</div>
                <div className="menu-desc">Preferências da aplicação</div>
              </div>
            </button>
            {userData?.role === 'dono' && (
              <button className="menu-tile" onClick={handleSuporte} aria-label="Suporte">
                <div className="menu-icon-wrap">🆘</div>
                <div className="menu-content">
                  <div className="menu-title">Suporte</div>
                  <div className="menu-desc">Ajuda e assistência técnica</div>
                </div>
              </button>
            )}
            {userData?.role === 'dono' && (
              <button className="menu-tile" onClick={handleBackup} aria-label="Backup">
                <div className="menu-icon-wrap">💾</div>
                <div className="menu-content">
                  <div className="menu-title">Backup</div>
                  <div className="menu-desc">Cópia de segurança dos dados</div>
                </div>
              </button>
            )}
            {userData?.role === 'dono' && (
              <button className="menu-tile" onClick={handleDocumentos} aria-label="Documentos">
                <div className="menu-icon-wrap">📄</div>
                <div className="menu-content">
                  <div className="menu-title">Documentos</div>
                  <div className="menu-desc">Gestão de documentos e contratos</div>
                </div>
              </button>
            )}
            {userData?.role === 'dono' && (
              <button className="menu-tile" onClick={handleNotificacoes} aria-label="Notificações">
                <div className="menu-icon-wrap">🔔</div>
                <div className="menu-content">
                  <div className="menu-title">Notificações</div>
                  <div className="menu-desc">Configurar alertas e avisos</div>
                </div>
              </button>
            )}
          </div>
        </section>

    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <HomePage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/visao-geral" element={
            <ProtectedRoute>
              <Layout>
                <VisaoGeralEscolas />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId" element={
            <ProtectedRoute>
              <Layout>
                <EscolaDetalhes />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/alunos" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Alunos />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/alunos-antigos" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <AlunosAntigos />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/aulas" element={
            <ProtectedRoute>
              <Layout>
                <Aulas />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/instrutores" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Instrutores />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/servicos" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Servicos />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/inventario" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Inventario />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/movimentos" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Movimentos />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/despesas" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Despesas />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/visao-financeira" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <VisaoFinanceira />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/relatorios" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <Relatorios />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/suporte" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <SuporteEscola />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/servicos-prestados" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <ServicosPrestados />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/materiais-prestados" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <MateriaisPrestados />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/frota" element={
            <ProtectedRoute>
              <Layout>
                <Frota />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/funcionarios" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Funcionarios />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/modelos-contrato" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <ModelosContrato />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escola/:escolaId/relatorio-instrutores" element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <RelatorioInstrutores />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/utilizadores" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <Utilizadores />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/relatorios-globais" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <RelatoriosGlobais />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/aprovacoes" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <Aprovacoes />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/backup" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <Backup />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/suporte" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <Suporte />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <Configuracoes />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/notificacoes" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <Notificacoes />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/documentos" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <Documentos />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/sem-acesso" element={
            <ProtectedRoute>
              <Layout>
                <SemAcesso />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/redirect" element={
            <ProtectedRoute>
              <Layout>
                <SmartRedirect />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/configuracoes" element={
            <ProtectedRoute>
              <Layout>
                <ConfiguracoesGerais />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/escolas" element={
            <ProtectedRoute>
              <Layout>
                <Escolas />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/grupos" element={
            <ProtectedRoute>
              <Layout>
                <Grupos />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/limpeza-dados" element={
            <ProtectedRoute requiredRole="dono">
              <Layout>
                <LimpezaDados />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
