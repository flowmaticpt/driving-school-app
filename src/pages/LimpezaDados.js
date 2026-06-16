import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, writeBatch, doc, deleteField, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './LimpezaDados.css';

const LimpezaDados = () => {
  const navigate = useNavigate();

  // Section 1: Test payments
  const [loadingAnalise1, setLoadingAnalise1] = useState(false);
  const [loadingExec1, setLoadingExec1] = useState(false);
  const [resultado1, setResultado1] = useState(null);
  const [progresso1, setProgresso1] = useState('');
  const [erro1, setErro1] = useState('');

  // Section 2: groupID normalization
  const [loadingAnalise2, setLoadingAnalise2] = useState(false);
  const [loadingExec2, setLoadingExec2] = useState(false);
  const [resultado2, setResultado2] = useState(null);
  const [progresso2, setProgresso2] = useState('');
  const [erro2, setErro2] = useState('');

  // Section 3: Root payments audit
  const [loadingAnalise3, setLoadingAnalise3] = useState(false);
  const [loadingExec3, setLoadingExec3] = useState(false);
  const [resultado3, setResultado3] = useState(null);
  const [progresso3, setProgresso3] = useState('');
  const [erro3, setErro3] = useState('');
  const [opcaoExec3, setOpcaoExec3] = useState('A'); // 'A' = delete all, 'B' = keep real

  // ==================== SECTION 1: Test Payments ====================

  const analisarPagamentosTeste = async () => {
    setLoadingAnalise1(true);
    setErro1('');
    setResultado1(null);
    try {
      const allSnap = await getDocs(collection(db, 'payments'));
      const totalDocs = allSnap.size;

      const testQuery = query(collection(db, 'payments'), where('test', '==', true));
      const testSnap = await getDocs(testQuery);
      const testDocs = testSnap.size;

      const percentagem = totalDocs > 0 ? ((testDocs / totalDocs) * 100).toFixed(1) : 0;

      const preview = [];
      testSnap.docs.slice(0, 10).forEach(d => {
        const data = d.data();
        preview.push({
          id: d.id,
          studentName: data.studentName || data.alunoNome || '—',
          amount: data.amount || data.valor || 0,
          method: data.method || data.metodo || '—',
          date: data.date ? (data.date.toDate ? data.date.toDate().toLocaleDateString('pt-PT') : String(data.date)) : '—'
        });
      });

      setResultado1({
        totalDocs,
        testDocs,
        percentagem,
        preview
      });
    } catch (error) {
      console.error('Erro ao analisar pagamentos de teste:', error);
      setErro1('Erro ao analisar: ' + error.message);
    }
    setLoadingAnalise1(false);
  };

  const executarLimpezaTeste = async () => {
    if (!resultado1 || resultado1.testDocs === 0) return;
    if (!window.confirm(`Tem a certeza que deseja eliminar ${resultado1.testDocs} documentos de teste da coleção payments?`)) return;

    setLoadingExec1(true);
    setErro1('');
    setProgresso1('A iniciar eliminação...');
    try {
      const testQuery = query(collection(db, 'payments'), where('test', '==', true));
      const testSnap = await getDocs(testQuery);
      const docs = testSnap.docs;

      let eliminados = 0;
      // Process in batches of 500
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        eliminados += chunk.length;
        setProgresso1(`Eliminados ${eliminados} de ${docs.length}...`);
      }

      const restantes = resultado1.totalDocs - eliminados;
      setProgresso1(`Eliminados ${eliminados} documentos de teste. Restam ${restantes} documentos reais.`);
      setResultado1(null);
    } catch (error) {
      console.error('Erro ao eliminar pagamentos de teste:', error);
      setErro1('Erro ao executar: ' + error.message);
    }
    setLoadingExec1(false);
  };

  // ==================== SECTION 2: groupID Normalization ====================

  const analisarGroupId = async () => {
    setLoadingAnalise2(true);
    setErro2('');
    setResultado2(null);
    try {
      const snap = await getDocs(collection(db, 'schools'));
      const inconsistentes = [];
      const totais = snap.size;

      snap.docs.forEach(d => {
        const data = d.data();
        // Check if has lowercase 'd' version
        if (data.groupId !== undefined) {
          inconsistentes.push({
            id: d.id,
            nome: data.name || data.nome || d.id,
            groupId: data.groupId,
            groupID: data.groupID || undefined
          });
        }
      });

      setResultado2({
        totalEscolas: totais,
        inconsistentes
      });
    } catch (error) {
      console.error('Erro ao analisar groupId:', error);
      setErro2('Erro ao analisar: ' + error.message);
    }
    setLoadingAnalise2(false);
  };

  const executarNormalizarGroupId = async () => {
    if (!resultado2 || resultado2.inconsistentes.length === 0) return;
    if (!window.confirm(`Tem a certeza que deseja normalizar groupId → groupID em ${resultado2.inconsistentes.length} escolas?`)) return;

    setLoadingExec2(true);
    setErro2('');
    setProgresso2('A iniciar normalização...');
    try {
      const { inconsistentes } = resultado2;
      let atualizados = 0;

      for (let i = 0; i < inconsistentes.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = inconsistentes.slice(i, i + 500);

        chunk.forEach(escola => {
          const ref = doc(db, 'schools', escola.id);
          const updateData = {
            updatedAt: Timestamp.now()
          };

          // If groupID is empty/undefined, copy groupId value to groupID
          if (!escola.groupID) {
            updateData.groupID = escola.groupId;
          }

          // Delete the lowercase 'd' field
          updateData.groupId = deleteField();

          batch.update(ref, updateData);
        });

        await batch.commit();
        atualizados += chunk.length;
        setProgresso2(`Atualizadas ${atualizados} de ${inconsistentes.length} escolas...`);
      }

      setProgresso2(`Normalização concluída. ${atualizados} escolas atualizadas (groupId → groupID).`);
      setResultado2(null);
    } catch (error) {
      console.error('Erro ao normalizar groupId:', error);
      setErro2('Erro ao executar: ' + error.message);
    }
    setLoadingExec2(false);
  };

  // ==================== SECTION 3: Root Payments Audit ====================

  const analisarRootPayments = async () => {
    setLoadingAnalise3(true);
    setErro3('');
    setResultado3(null);
    try {
      // Count root payments
      const allSnap = await getDocs(collection(db, 'payments'));
      const totalRoot = allSnap.size;

      let testCount = 0;
      let realCount = 0;
      const rootPayments = [];

      allSnap.docs.forEach(d => {
        const data = d.data();
        if (data.test === true) {
          testCount++;
        } else {
          realCount++;
          rootPayments.push({
            id: d.id,
            studentId: data.studentId || data.alunoId || null,
            studentName: data.studentName || data.alunoNome || '—',
            amount: data.amount || data.valor || 0,
            method: data.method || data.metodo || '—',
            date: data.date ? (data.date.toDate ? data.date.toDate().toLocaleDateString('pt-PT') : String(data.date)) : '—'
          });
        }
      });

      // Count embedded payments in students
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      let totalEmbedded = 0;
      const embeddedPerSchool = [];

      for (const schoolDoc of schoolsSnap.docs) {
        const studentsSnap = await getDocs(collection(db, 'schools', schoolDoc.id, 'students'));
        let schoolEmbedded = 0;
        studentsSnap.docs.forEach(sDoc => {
          const sData = sDoc.data();
          if (sData.pagamentos && Array.isArray(sData.pagamentos)) {
            schoolEmbedded += sData.pagamentos.length;
          }
        });
        totalEmbedded += schoolEmbedded;
        embeddedPerSchool.push({
          schoolId: schoolDoc.id,
          schoolName: schoolDoc.data().name || schoolDoc.data().nome || schoolDoc.id,
          count: schoolEmbedded
        });
      }

      setResultado3({
        totalRoot,
        testCount,
        realCount,
        totalEmbedded,
        embeddedPerSchool,
        rootPaymentsPreview: rootPayments.slice(0, 10)
      });
    } catch (error) {
      console.error('Erro ao auditar root payments:', error);
      setErro3('Erro ao analisar: ' + error.message);
    }
    setLoadingAnalise3(false);
  };

  const executarLimpezaRoot = async () => {
    if (!resultado3) return;

    const label = opcaoExec3 === 'A'
      ? `Eliminar TODOS os ${resultado3.totalRoot} documentos da coleção root payments?`
      : `Eliminar ${resultado3.testCount} documentos de teste e manter ${resultado3.realCount} documentos reais?`;

    if (!window.confirm(label)) return;

    setLoadingExec3(true);
    setErro3('');
    setProgresso3('A iniciar...');
    try {
      let docsToDelete;
      if (opcaoExec3 === 'A') {
        const snap = await getDocs(collection(db, 'payments'));
        docsToDelete = snap.docs;
      } else {
        const testQuery = query(collection(db, 'payments'), where('test', '==', true));
        const snap = await getDocs(testQuery);
        docsToDelete = snap.docs;
      }

      let eliminados = 0;
      for (let i = 0; i < docsToDelete.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docsToDelete.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        eliminados += chunk.length;
        setProgresso3(`Eliminados ${eliminados} de ${docsToDelete.length}...`);
      }

      setProgresso3(`Concluído. Eliminados ${eliminados} documentos.`);
      setResultado3(null);
    } catch (error) {
      console.error('Erro ao limpar root payments:', error);
      setErro3('Erro ao executar: ' + error.message);
    }
    setLoadingExec3(false);
  };

  // ==================== RENDER ====================

  return (
    <div className="limpeza-page">
      <button className="limpeza-back-button" onClick={() => navigate('/')}>
        ← Voltar
      </button>

      <div className="limpeza-header">
        <h1>Limpeza de Dados</h1>
        <p>Ferramentas para limpar dados de teste e normalizar inconsistências no Firestore.</p>
      </div>

      {/* ===== SECTION 1: Test Payments ===== */}
      <div className="limpeza-section">
        <div className="limpeza-section-header">
          <h2>1. Limpar Pagamentos de Teste</h2>
          <p>Eliminar documentos com <code>test: true</code> da coleção root <code>payments/</code>.</p>
        </div>

        <div className="limpeza-actions">
          <button
            className="limpeza-btn limpeza-btn-analisar"
            onClick={analisarPagamentosTeste}
            disabled={loadingAnalise1 || loadingExec1}
          >
            {loadingAnalise1 && <span className="limpeza-spinner" />}
            Analisar
          </button>
          {resultado1 && resultado1.testDocs > 0 && (
            <button
              className="limpeza-btn limpeza-btn-executar"
              onClick={executarLimpezaTeste}
              disabled={loadingExec1}
            >
              {loadingExec1 && <span className="limpeza-spinner" />}
              Executar Limpeza
            </button>
          )}
        </div>

        {erro1 && <div className="limpeza-erro">{erro1}</div>}
        {progresso1 && <div className="limpeza-progresso">{progresso1}</div>}

        {resultado1 && (
          <div className="limpeza-resultado">
            <div className="limpeza-stats">
              <div className="limpeza-stat">
                <span className="stat-label">Total de documentos</span>
                <span className="stat-value">{resultado1.totalDocs}</span>
              </div>
              <div className="limpeza-stat">
                <span className="stat-label">Documentos de teste</span>
                <span className="stat-value limpeza-stat-danger">{resultado1.testDocs}</span>
              </div>
              <div className="limpeza-stat">
                <span className="stat-label">Percentagem</span>
                <span className="stat-value">{resultado1.percentagem}%</span>
              </div>
            </div>

            {resultado1.preview.length > 0 && (
              <div className="limpeza-preview">
                <h4>Preview (primeiros {resultado1.preview.length} docs de teste):</h4>
                <table className="limpeza-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Aluno</th>
                      <th>Valor</th>
                      <th>Método</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado1.preview.map(p => (
                      <tr key={p.id}>
                        <td><code>{p.id.substring(0, 12)}...</code></td>
                        <td>{p.studentName}</td>
                        <td>{typeof p.amount === 'number' ? p.amount.toFixed(2) + ' €' : p.amount}</td>
                        <td>{p.method}</td>
                        <td>{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== SECTION 2: groupID Normalization ===== */}
      <div className="limpeza-section">
        <div className="limpeza-section-header">
          <h2>2. Normalizar groupID / groupId</h2>
          <p>O código usa <code>groupID</code> (D maiúsculo). Escolas com <code>groupId</code> serão normalizadas.</p>
        </div>

        <div className="limpeza-actions">
          <button
            className="limpeza-btn limpeza-btn-analisar"
            onClick={analisarGroupId}
            disabled={loadingAnalise2 || loadingExec2}
          >
            {loadingAnalise2 && <span className="limpeza-spinner" />}
            Analisar
          </button>
          {resultado2 && resultado2.inconsistentes.length > 0 && (
            <button
              className="limpeza-btn limpeza-btn-executar"
              onClick={executarNormalizarGroupId}
              disabled={loadingExec2}
            >
              {loadingExec2 && <span className="limpeza-spinner" />}
              Executar Normalização
            </button>
          )}
        </div>

        {erro2 && <div className="limpeza-erro">{erro2}</div>}
        {progresso2 && <div className="limpeza-progresso">{progresso2}</div>}

        {resultado2 && (
          <div className="limpeza-resultado">
            <div className="limpeza-stats">
              <div className="limpeza-stat">
                <span className="stat-label">Total de escolas</span>
                <span className="stat-value">{resultado2.totalEscolas}</span>
              </div>
              <div className="limpeza-stat">
                <span className="stat-label">Com groupId inconsistente</span>
                <span className="stat-value limpeza-stat-danger">{resultado2.inconsistentes.length}</span>
              </div>
            </div>

            {resultado2.inconsistentes.length > 0 && (
              <div className="limpeza-preview">
                <h4>Escolas com groupId (lowercase d):</h4>
                <table className="limpeza-table">
                  <thead>
                    <tr>
                      <th>Escola</th>
                      <th>groupId (atual)</th>
                      <th>groupID (existente)</th>
                      <th>Acção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado2.inconsistentes.map(e => (
                      <tr key={e.id}>
                        <td>{e.nome}</td>
                        <td><code>{e.groupId || '—'}</code></td>
                        <td><code>{e.groupID || '—'}</code></td>
                        <td>
                          {e.groupID
                            ? 'Eliminar groupId (groupID já existe)'
                            : 'Copiar groupId → groupID, eliminar groupId'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {resultado2.inconsistentes.length === 0 && (
              <div className="limpeza-progresso">Todas as escolas já usam groupID correctamente.</div>
            )}
          </div>
        )}
      </div>

      {/* ===== SECTION 3: Root Payments Audit ===== */}
      <div className="limpeza-section">
        <div className="limpeza-section-header">
          <h2>3. Auditar Coleção Root payments/</h2>
          <p>Comparar a coleção root <code>payments/</code> (legacy) com os pagamentos embedded nos alunos.</p>
        </div>

        <div className="limpeza-actions">
          <button
            className="limpeza-btn limpeza-btn-analisar"
            onClick={analisarRootPayments}
            disabled={loadingAnalise3 || loadingExec3}
          >
            {loadingAnalise3 && <span className="limpeza-spinner" />}
            Analisar
          </button>
          {resultado3 && resultado3.totalRoot > 0 && (
            <>
              <div className="limpeza-opcao-group">
                <label className="limpeza-radio">
                  <input
                    type="radio"
                    name="opcaoExec3"
                    value="A"
                    checked={opcaoExec3 === 'A'}
                    onChange={() => setOpcaoExec3('A')}
                    disabled={loadingExec3}
                  />
                  Eliminar toda a coleção root
                </label>
                <label className="limpeza-radio">
                  <input
                    type="radio"
                    name="opcaoExec3"
                    value="B"
                    checked={opcaoExec3 === 'B'}
                    onChange={() => setOpcaoExec3('B')}
                    disabled={loadingExec3}
                  />
                  Manter apenas docs reais (sem test)
                </label>
              </div>
              <button
                className="limpeza-btn limpeza-btn-executar"
                onClick={executarLimpezaRoot}
                disabled={loadingExec3}
              >
                {loadingExec3 && <span className="limpeza-spinner" />}
                Executar
              </button>
            </>
          )}
        </div>

        {erro3 && <div className="limpeza-erro">{erro3}</div>}
        {progresso3 && <div className="limpeza-progresso">{progresso3}</div>}

        {resultado3 && (
          <div className="limpeza-resultado">
            <div className="limpeza-stats">
              <div className="limpeza-stat">
                <span className="stat-label">Root payments (total)</span>
                <span className="stat-value">{resultado3.totalRoot}</span>
              </div>
              <div className="limpeza-stat">
                <span className="stat-label">De teste</span>
                <span className="stat-value limpeza-stat-danger">{resultado3.testCount}</span>
              </div>
              <div className="limpeza-stat">
                <span className="stat-label">Reais</span>
                <span className="stat-value limpeza-stat-success">{resultado3.realCount}</span>
              </div>
              <div className="limpeza-stat">
                <span className="stat-label">Embedded (alunos)</span>
                <span className="stat-value">{resultado3.totalEmbedded}</span>
              </div>
            </div>

            {resultado3.embeddedPerSchool.length > 0 && (
              <div className="limpeza-preview">
                <h4>Pagamentos embedded por escola:</h4>
                <table className="limpeza-table">
                  <thead>
                    <tr>
                      <th>Escola</th>
                      <th>Pagamentos nos alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado3.embeddedPerSchool.map(e => (
                      <tr key={e.schoolId}>
                        <td>{e.schoolName}</td>
                        <td>{e.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {resultado3.rootPaymentsPreview.length > 0 && (
              <div className="limpeza-preview">
                <h4>Preview docs reais na root (primeiros {resultado3.rootPaymentsPreview.length}):</h4>
                <table className="limpeza-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Aluno</th>
                      <th>Valor</th>
                      <th>Método</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado3.rootPaymentsPreview.map(p => (
                      <tr key={p.id}>
                        <td><code>{p.id.substring(0, 12)}...</code></td>
                        <td>{p.studentName}</td>
                        <td>{typeof p.amount === 'number' ? p.amount.toFixed(2) + ' €' : p.amount}</td>
                        <td>{p.method}</td>
                        <td>{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="limpeza-comparacao">
              <strong>Comparação:</strong> Root: {resultado3.totalRoot} docs ({resultado3.testCount} teste + {resultado3.realCount} reais) | Embedded: {resultado3.totalEmbedded} entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LimpezaDados;
