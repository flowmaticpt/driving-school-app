import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs, orderBy, query, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navigation from '../components/Navigation';

const MateriaisPrestados = () => {
  const { escolaId } = useParams();
  const navigate = useNavigate();

  const [escola, setEscola] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registos, setRegistos] = useState([]);

  const [filtroData, setFiltroData] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const escolaRef = doc(db, 'schools', escolaId);
        const escolaSnap = await getDoc(escolaRef);
        if (!escolaSnap.exists()) {
          setError('Escola não encontrada');
          setLoading(false);
          return;
        }
        setEscola({ id: escolaSnap.id, ...escolaSnap.data() });

        const materiaisPrestadosRef = collection(db, 'schools', escolaId, 'materiaisPrestados');
        const q = query(materiaisPrestadosRef, orderBy('data', 'desc'));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRegistos(items);
      } catch (e) {
        console.error('Erro ao carregar materiais prestados:', e);
        setError('Erro ao carregar materiais prestados');
      } finally {
        setLoading(false);
      }
    };
    if (escolaId) load();
  }, [escolaId]);

  const filtered = useMemo(() => {
    return registos.filter(r => {
      let dataMatch = true;
      if (filtroData) {
        const d = r.data?.toDate ? r.data.toDate() : new Date(r.data);
        const f = new Date(filtroData);
        dataMatch = d.toDateString() === f.toDateString();
      }

      let textMatch = true;
      if (filtroTexto) {
        const s = filtroTexto.toLowerCase();
        textMatch = (r.alunoName || '').toLowerCase().includes(s)
          || (r.materialName || '').toLowerCase().includes(s);
      }
      return dataMatch && textMatch;
    });
  }, [registos, filtroData, filtroTexto]);

  const formatPrice = (price) => {
    if (!price) return '0,00 €';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-PT');
  };

  if (loading) {
    return (
      <div className="materiais-prestados-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>A carregar materiais prestados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="materiais-prestados-page">
        <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />
        <div className="error">
          <p>{error}</p>
          <button onClick={() => navigate(`/escola/${escolaId}`)} className="retry-button">Voltar</button>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="materiais-prestados-page">
        <Navigation showBackButton={true} backPath="/visao-geral" />
        <div className="not-found">
          <h2>Escola não encontrada</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="materiais-prestados-page">
      <Navigation showBackButton={true} backPath={`/escola/${escolaId}`} />

      <div className="content">
        <div className="page-header">
          <h1>Materiais Prestados - {escola.name}</h1>
          <p>Registos de materiais fornecidos aos alunos</p>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="filtroData">Data:</label>
            <input
              type="date"
              id="filtroData"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="filtroTexto">Pesquisar:</label>
            <input
              type="text"
              id="filtroTexto"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Aluno ou material..."
              className="filter-input"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Nenhum registo encontrado</h3>
            <p>Tente ajustar os filtros.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Aluno</th>
                  <th>Material</th>
                  <th>Preço Unitário</th>
                  <th>Quantidade</th>
                  <th>Preço Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>{formatDateTime(r.data)}</td>
                    <td>{r.alunoName}</td>
                    <td>{r.materialName}</td>
                    <td>{formatPrice(r.precoUnitario)}</td>
                    <td>{r.quantidade}</td>
                    <td>{formatPrice(r.precoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MateriaisPrestados;








