/**
 * Testes COMPLETOS das funcionalidades implementadas com dados falsos.
 * Cobre todos os edge cases bizarros possiveis.
 * Executar: node src/tests/testFeatures.js
 */

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

function assertClose(a, b, testName, tolerance = 0.01) {
  assert(Math.abs(a - b) < tolerance, `${testName} (got ${a}, expected ${b})`);
}

const hoje = new Date();
const daqui = (dias) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
};
const atras = (dias) => daqui(-dias);


// =======================================================================
//  FUNÇÕES (cópia exacta da lógica dos componentes React)
// =======================================================================

function calcularValoresPeriodo(movimentos) {
  let receitas = 0, despesas = 0;
  let bancoReceitas = 0, bancoDespesas = 0;
  let dinheiroReceitas = 0, dinheiroDespesas = 0;

  movimentos.forEach(mov => {
    if (mov.naoAfetarFinanceiro) return;
    if (mov.type === 'pagamento' && mov.value > 0) receitas += mov.value;
    if (mov.value < 0) despesas += Math.abs(mov.value);

    if (mov.value > 0) {
      if (mov.paymentMethod === 'misto') {
        if (mov.parcelas && mov.parcelas.length > 0) {
          mov.parcelas.forEach(p => {
            const val = parseFloat(p.value) || 0;
            if (['transferencia','multibanco','mbway'].includes(p.method)) bancoReceitas += val;
            else if (p.method === 'dinheiro') dinheiroReceitas += val;
          });
        } else {
          bancoReceitas += mov.value;
        }
      } else if (['transferencia','multibanco','mbway'].includes(mov.paymentMethod)) {
        bancoReceitas += mov.value;
      } else if (mov.paymentMethod === 'dinheiro') {
        dinheiroReceitas += mov.value;
      }
    }

    if (mov.value < 0) {
      const abs = Math.abs(mov.value);
      if (['transferencia','multibanco','mbway'].includes(mov.paymentMethod)) bancoDespesas += abs;
      else if (mov.paymentMethod === 'dinheiro') dinheiroDespesas += abs;
    }
  });

  return { receitas, despesas, bancoReceitas, bancoDespesas, dinheiroReceitas, dinheiroDespesas };
}

const categoriasDespesa = [
  { id: 'operacionais', nome: 'Despesas Operacionais', icon: '⚙️', cor: '#e67e22',
    subcategorias: [
      { id: 'combustivel', nome: 'Combustível', icon: '⛽' },
      { id: 'seguros', nome: 'Seguros', icon: '🛡️' },
      { id: 'imt_licencas', nome: 'IMT / Licenças', icon: '📄' },
      { id: 'material_pedagogico', nome: 'Material Pedagógico', icon: '📚' },
      { id: 'exames', nome: 'Exames', icon: '📝' },
    ]
  },
  { id: 'gestao', nome: 'Gestão da Escola', icon: '🏢', cor: '#3498db',
    subcategorias: [
      { id: 'renda', nome: 'Renda', icon: '🏠' },
      { id: 'salarios', nome: 'Salários', icon: '💰' },
      { id: 'contabilidade', nome: 'Contabilidade', icon: '📊' },
    ]
  },
  { id: 'funcionamento', nome: 'Funcionamento', icon: '🔧', cor: '#1abc9c',
    subcategorias: [
      { id: 'agua', nome: 'Água', icon: '💧' },
      { id: 'eletricidade', nome: 'Eletricidade', icon: '⚡' },
      { id: 'internet', nome: 'Internet', icon: '🌐' },
      { id: 'limpeza', nome: 'Limpeza', icon: '🧽' },
      { id: 'manutencao', nome: 'Manutenção', icon: '🔧' },
    ]
  },
  { id: 'outros', nome: 'Outros', icon: '📋', cor: '#95a5a6', subcategorias: [] }
];

const tiposDespesa = categoriasDespesa.flatMap(cat =>
  cat.subcategorias.length > 0
    ? cat.subcategorias.map(sub => ({ id: sub.id, nome: sub.nome, icon: sub.icon, cor: cat.cor }))
    : [{ id: cat.id, nome: cat.nome, icon: cat.icon, cor: cat.cor }]
);

function filtrarDespesas(despesas, filtroCategoria, filtroSubcategoria, filtroMetodo) {
  return despesas.filter(despesa => {
    const metodoMatch = filtroMetodo === 'todos' || despesa.paymentMethod === filtroMetodo;
    let categoriaMatch = true;
    if (filtroCategoria !== 'todos') {
      if (despesa.categoria) {
        categoriaMatch = despesa.categoria === filtroCategoria;
      } else {
        const cat = categoriasDespesa.find(c => c.id === filtroCategoria);
        if (cat) {
          categoriaMatch = cat.subcategorias.some(sub => sub.id === despesa.tipo) || (cat.id === despesa.tipo);
        }
      }
    }
    let subcategoriaMatch = true;
    if (filtroSubcategoria !== 'todos') {
      if (despesa.subcategoria) {
        subcategoriaMatch = despesa.subcategoria === filtroSubcategoria;
      } else {
        subcategoriaMatch = despesa.tipo === filtroSubcategoria;
      }
    }
    return metodoMatch && categoriaMatch && subcategoriaMatch;
  });
}

function getTipoDespesa(tipoId) {
  return tiposDespesa.find(t => t.id === tipoId) || { nome: tipoId, icon: '📋', cor: '#95a5a6' };
}

function calcularAlertas(alunos, veiculos) {
  const alerts = [];
  const h = new Date();
  const em30 = new Date(); em30.setDate(h.getDate() + 30);

  alunos.forEach(a => {
    const name = a.name || 'Aluno sem nome';
    if (a.licenseIssueDate) {
      const em = new Date(a.licenseIssueDate);
      const exp = new Date(em); exp.setFullYear(exp.getFullYear() + 2);
      if (exp <= em30) {
        const d = Math.ceil((exp - h) / 86400000);
        alerts.push({ tipo: 'licenca', titulo: d <= 0 ? 'Licença expirada' : `Licença expira em ${d} dias`, descricao: name, prioridade: d <= 0 ? 0 : 1 });
      }
    }
    if (a.theoreticalExamDate && !a.theoreticalExamResult) {
      const dt = new Date(a.theoreticalExamDate);
      const d = Math.ceil((dt - h) / 86400000);
      if (d >= 0 && d <= 30) alerts.push({ tipo: 'exame_teorico', titulo: d === 0 ? 'Exame teórico hoje' : `Exame teórico em ${d} dias`, descricao: name, prioridade: d <= 3 ? 0 : 2 });
    }
    if (a.practicalExamDate && !a.practicalExamResult) {
      const dt = new Date(a.practicalExamDate);
      const d = Math.ceil((dt - h) / 86400000);
      if (d >= 0 && d <= 30) alerts.push({ tipo: 'exame_pratico', titulo: d === 0 ? 'Exame prático hoje' : `Exame prático em ${d} dias`, descricao: name, prioridade: d <= 3 ? 0 : 2 });
    }
  });

  veiculos.forEach(v => {
    const mat = v.registration || 'Sem matrícula';
    if (v.insuranceExpiry) {
      const exp = new Date(v.insuranceExpiry);
      const d = Math.ceil((exp - h) / 86400000);
      if (d <= 30) alerts.push({ tipo: 'seguro', titulo: d <= 0 ? 'Seguro expirado' : `Seguro expira em ${d} dias`, descricao: mat, prioridade: d <= 0 ? 0 : 1 });
    }
    if (v.inspectionExpiry) {
      const exp = new Date(v.inspectionExpiry);
      const d = Math.ceil((exp - h) / 86400000);
      if (d <= 30) alerts.push({ tipo: 'inspecao', titulo: d <= 0 ? 'Inspeção expirada' : `Inspeção expira em ${d} dias`, descricao: mat, prioridade: d <= 0 ? 0 : 1 });
    }
  });

  alerts.sort((a, b) => a.prioridade - b.prioridade);
  return alerts;
}

function calcularDividaAluno(aluno) {
  const totalServicos = (aluno.servicosAtivos || []).reduce((s, sv) =>
    s + ((sv.servicoPrice || 0) * (sv.quantidade || sv.quantity || 1)), 0);
  const totalMateriais = (aluno.materiaisComprados || []).reduce((s, m) =>
    s + ((m.materialPrice || 0) * (m.quantidade || m.quantity || 1)), 0);
  let totalPagamentos = 0;
  (aluno.pagamentos || []).forEach(p => {
    const tipo = p.type || p.tipo || 'pronto';
    const val = p.value || p.valor || 0;
    if (tipo === 'pronto') totalPagamentos += val;
    else if (tipo === 'prestacao' && p.isPago === true) totalPagamentos += p.valorPrestacao || val;
    else if (tipo === 'prestacao') { /* não paga, ignora */ }
    else totalPagamentos += p.valorPago || val;
  });
  return { totalDivida: totalServicos + totalMateriais, totalPagamentos, saldo: (totalServicos + totalMateriais) - totalPagamentos };
}

function criarMovimento(dados, userData) {
  return { ...dados, createdBy: userData?.name || 'Desconhecido', createdByUserId: userData?.id || null };
}


// =======================================================================
//  TESTE 1: VISÃO FINANCEIRA — todos os edge cases
// =======================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 TESTE 1: Visão Financeira — Banco separado receitas/despesas');
console.log('='.repeat(60));

console.log('\n  --- Caso normal ---');
const r1 = calcularValoresPeriodo([
  { type: 'pagamento', value: 500, paymentMethod: 'transferencia' },
  { type: 'pagamento', value: 300, paymentMethod: 'multibanco' },
  { type: 'pagamento', value: 200, paymentMethod: 'mbway' },
  { type: 'pagamento', value: 150, paymentMethod: 'dinheiro' },
  { type: 'pagamento', value: 400, paymentMethod: 'misto', parcelas: [
    { method: 'transferencia', value: 250 }, { method: 'dinheiro', value: 150 }
  ]},
  { type: 'despesa', value: -100, paymentMethod: 'transferencia' },
  { type: 'despesa', value: -50, paymentMethod: 'dinheiro' },
  { type: 'despesa', value: -80, paymentMethod: 'multibanco' },
  { type: 'pagamento', value: 9999, paymentMethod: 'dinheiro', naoAfetarFinanceiro: true },
]);
assertClose(r1.receitas, 1550, 'Receitas = 1550');
assertClose(r1.despesas, 230, 'Despesas = 230');
assertClose(r1.bancoReceitas, 1250, 'BancoReceitas = 1250');
assertClose(r1.bancoDespesas, 180, 'BancoDespesas = 180');
assertClose(r1.dinheiroReceitas, 300, 'DinheiroReceitas = 300');
assertClose(r1.dinheiroDespesas, 50, 'DinheiroDespesas = 50');
assert(r1.dinheiroReceitas === 300, 'naoAfetarFinanceiro ignorado');

console.log('\n  --- Lista vazia ---');
const r2 = calcularValoresPeriodo([]);
assertClose(r2.receitas, 0, 'Sem movimentos: receitas = 0');
assertClose(r2.despesas, 0, 'Sem movimentos: despesas = 0');
assertClose(r2.bancoReceitas, 0, 'Sem movimentos: bancoReceitas = 0');
assertClose(r2.bancoDespesas, 0, 'Sem movimentos: bancoDespesas = 0');
assertClose(r2.dinheiroReceitas, 0, 'Sem movimentos: dinheiroReceitas = 0');
assertClose(r2.dinheiroDespesas, 0, 'Sem movimentos: dinheiroDespesas = 0');

console.log('\n  --- Movimento com value = 0 ---');
const r3 = calcularValoresPeriodo([
  { type: 'pagamento', value: 0, paymentMethod: 'transferencia' },
]);
assertClose(r3.receitas, 0, 'Value 0: receitas = 0');
assertClose(r3.bancoReceitas, 0, 'Value 0: bancoReceitas = 0');

console.log('\n  --- Movimento sem paymentMethod ---');
const r4 = calcularValoresPeriodo([
  { type: 'pagamento', value: 300 },
  { type: 'despesa', value: -100 },
]);
assertClose(r4.receitas, 300, 'Sem método: receitas = 300');
assertClose(r4.despesas, 100, 'Sem método: despesas = 100');
assertClose(r4.bancoReceitas, 0, 'Sem método: bancoReceitas = 0 (não classificado)');
assertClose(r4.dinheiroReceitas, 0, 'Sem método: dinheiroReceitas = 0 (não classificado)');
assertClose(r4.bancoDespesas, 0, 'Sem método: bancoDespesas = 0');
assertClose(r4.dinheiroDespesas, 0, 'Sem método: dinheiroDespesas = 0');

console.log('\n  --- Misto com parcelas vazias ---');
const r5 = calcularValoresPeriodo([
  { type: 'pagamento', value: 500, paymentMethod: 'misto', parcelas: [] },
]);
assertClose(r5.bancoReceitas, 500, 'Misto parcelas vazias: vai para banco (fallback)');

console.log('\n  --- Misto sem campo parcelas ---');
const r6 = calcularValoresPeriodo([
  { type: 'pagamento', value: 700, paymentMethod: 'misto' },
]);
assertClose(r6.bancoReceitas, 700, 'Misto sem parcelas: vai para banco (fallback)');

console.log('\n  --- Parcela com value string ---');
const r7 = calcularValoresPeriodo([
  { type: 'pagamento', value: 300, paymentMethod: 'misto', parcelas: [
    { method: 'transferencia', value: '200' },
    { method: 'dinheiro', value: '100' },
  ]},
]);
assertClose(r7.bancoReceitas, 200, 'Parcela string "200": parseFloat funciona');
assertClose(r7.dinheiroReceitas, 100, 'Parcela string "100": parseFloat funciona');

console.log('\n  --- Parcela com value inválido ---');
const r8 = calcularValoresPeriodo([
  { type: 'pagamento', value: 300, paymentMethod: 'misto', parcelas: [
    { method: 'transferencia', value: 'abc' },
    { method: 'dinheiro', value: null },
    { method: 'mbway', value: undefined },
  ]},
]);
assertClose(r8.bancoReceitas, 0, 'Parcela "abc": parseFloat NaN => 0');
assertClose(r8.dinheiroReceitas, 0, 'Parcela null: parseFloat => 0');

console.log('\n  --- Parcela com método desconhecido ---');
const r9 = calcularValoresPeriodo([
  { type: 'pagamento', value: 500, paymentMethod: 'misto', parcelas: [
    { method: 'bitcoin', value: 300 },
    { method: 'dinheiro', value: 200 },
  ]},
]);
assertClose(r9.bancoReceitas, 0, 'Método "bitcoin": não conta para banco');
assertClose(r9.dinheiroReceitas, 200, 'Dinheiro na parcela: conta normalmente');

console.log('\n  --- Valores decimais (cêntimos) ---');
const r10 = calcularValoresPeriodo([
  { type: 'pagamento', value: 99.99, paymentMethod: 'multibanco' },
  { type: 'pagamento', value: 0.01, paymentMethod: 'dinheiro' },
  { type: 'despesa', value: -0.50, paymentMethod: 'transferencia' },
]);
assertClose(r10.receitas, 100, 'Decimais: receitas = 100');
assertClose(r10.bancoReceitas, 99.99, 'Decimais: bancoReceitas = 99.99');
assertClose(r10.dinheiroReceitas, 0.01, 'Decimais: dinheiroReceitas = 0.01');
assertClose(r10.bancoDespesas, 0.50, 'Decimais: bancoDespesas = 0.50');

console.log('\n  --- Valores muito grandes ---');
const r11 = calcularValoresPeriodo([
  { type: 'pagamento', value: 999999.99, paymentMethod: 'transferencia' },
  { type: 'despesa', value: -888888.88, paymentMethod: 'multibanco' },
]);
assertClose(r11.bancoReceitas, 999999.99, 'Grande: bancoReceitas');
assertClose(r11.bancoDespesas, 888888.88, 'Grande: bancoDespesas');

console.log('\n  --- Movimento type !== pagamento com value > 0 ---');
const r12 = calcularValoresPeriodo([
  { type: 'servico', value: 200, paymentMethod: 'dinheiro' },
  { type: 'material', value: 100, paymentMethod: 'transferencia' },
]);
assertClose(r12.receitas, 0, 'Type servico/material: NÃO conta como receita');
assertClose(r12.dinheiroReceitas, 200, 'Type servico: mas distribui por método (value>0)');
assertClose(r12.bancoReceitas, 100, 'Type material: distribui por método');

console.log('\n  --- Só despesas, nenhuma receita ---');
const r13 = calcularValoresPeriodo([
  { type: 'despesa', value: -300, paymentMethod: 'transferencia' },
  { type: 'despesa', value: -200, paymentMethod: 'dinheiro' },
]);
assertClose(r13.receitas, 0, 'Só despesas: receitas = 0');
assertClose(r13.despesas, 500, 'Só despesas: despesas = 500');
assertClose(r13.bancoDespesas, 300, 'Só despesas: bancoDespesas = 300');
assertClose(r13.dinheiroDespesas, 200, 'Só despesas: dinheiroDespesas = 200');
assertClose(r13.bancoReceitas - r13.bancoDespesas, -300, 'Só despesas: banco líquido negativo');

console.log('\n  --- Todos naoAfetarFinanceiro ---');
const r14 = calcularValoresPeriodo([
  { type: 'pagamento', value: 500, paymentMethod: 'transferencia', naoAfetarFinanceiro: true },
  { type: 'despesa', value: -200, paymentMethod: 'dinheiro', naoAfetarFinanceiro: true },
]);
assertClose(r14.receitas, 0, 'Todos ignorados: receitas = 0');
assertClose(r14.despesas, 0, 'Todos ignorados: despesas = 0');

console.log('\n  --- MBWay como despesa ---');
const r15 = calcularValoresPeriodo([
  { type: 'despesa', value: -75, paymentMethod: 'mbway' },
]);
assertClose(r15.bancoDespesas, 75, 'MBWay despesa: vai para bancoDespesas');


// =======================================================================
//  TESTE 2: CATEGORIAS E FILTROS DE DESPESAS — todos os edge cases
// =======================================================================
console.log('\n' + '='.repeat(60));
console.log('📂 TESTE 2: Categorias e subcategorias de despesas');
console.log('='.repeat(60));

const despesasTodas = [
  // Novas (com categoria+subcategoria)
  { id: '1', categoria: 'operacionais', subcategoria: 'combustivel', value: 80, paymentMethod: 'multibanco' },
  { id: '2', categoria: 'operacionais', subcategoria: 'seguros', value: 500, paymentMethod: 'transferencia' },
  { id: '3', categoria: 'gestao', subcategoria: 'renda', value: 600, paymentMethod: 'transferencia' },
  { id: '4', categoria: 'funcionamento', subcategoria: 'eletricidade', value: 120, paymentMethod: 'multibanco' },
  { id: '5', categoria: 'outros', value: 50, paymentMethod: 'dinheiro' },
  // Antigas (só tipo)
  { id: '6', tipo: 'combustivel', value: 65, paymentMethod: 'dinheiro' },
  { id: '7', tipo: 'salarios', value: 1200, paymentMethod: 'transferencia' },
  { id: '8', tipo: 'agua', value: 30, paymentMethod: 'multibanco' },
  // Bizarra: sem tipo nem categoria
  { id: '9', value: 100, paymentMethod: 'dinheiro' },
  // Bizarra: tipo desconhecido
  { id: '10', tipo: 'xyz_inexistente', value: 999, paymentMethod: 'dinheiro' },
  // Bizarra: categoria nova mas subcategoria undefined
  { id: '11', categoria: 'operacionais', value: 200, paymentMethod: 'dinheiro' },
];

console.log('\n  --- Flat list ---');
assert(tiposDespesa.length === 14, `tiposDespesa tem 14 items (got ${tiposDespesa.length})`);
assert(tiposDespesa.find(t => t.id === 'combustivel'), 'Tem combustivel');
assert(tiposDespesa.find(t => t.id === 'salarios'), 'Tem salarios');
assert(tiposDespesa.find(t => t.id === 'outros'), 'Tem outros');
assert(tiposDespesa.find(t => t.id === 'agua'), 'Tem agua');
assert(!tiposDespesa.find(t => t.id === 'operacionais'), 'NÃO tem "operacionais" (é categoria, não subcategoria)');

console.log('\n  --- getTipoDespesa ---');
const tComb = getTipoDespesa('combustivel');
assert(tComb.nome === 'Combustível', 'getTipoDespesa(combustivel) = Combustível');
const tDesconhecido = getTipoDespesa('xyz_nao_existe');
assert(tDesconhecido.nome === 'xyz_nao_existe', 'getTipoDespesa desconhecido: retorna id como nome');
assert(tDesconhecido.icon === '📋', 'getTipoDespesa desconhecido: icon fallback');

console.log('\n  --- Filtros básicos ---');
assert(filtrarDespesas(despesasTodas, 'todos', 'todos', 'todos').length === 11, 'Sem filtro = 11');

console.log('\n  --- Filtro por categoria (novas + retrocompat) ---');
const fOp = filtrarDespesas(despesasTodas, 'operacionais', 'todos', 'todos');
// id 1,2 (novas operacionais) + 6 (antiga tipo=combustivel in operacionais.subcategorias) + 11 (nova operacionais sem subcat)
assert(fOp.length === 4, `Operacionais = 4 (got ${fOp.length})`);

const fGest = filtrarDespesas(despesasTodas, 'gestao', 'todos', 'todos');
// id 3 (nova gestao) + 7 (antiga tipo=salarios in gestao.subcategorias)
assert(fGest.length === 2, `Gestão = 2 (got ${fGest.length})`);

const fFunc = filtrarDespesas(despesasTodas, 'funcionamento', 'todos', 'todos');
// id 4 (nova funcionamento) + 8 (antiga tipo=agua in funcionamento.subcategorias)
assert(fFunc.length === 2, `Funcionamento = 2 (got ${fFunc.length})`);

const fOut = filtrarDespesas(despesasTodas, 'outros', 'todos', 'todos');
// id 5 (nova outros)
// id 9 (sem tipo nem categoria) - sem categoria match: cat.subcategorias.some(sub => sub.id === undefined) = false, cat.id === undefined = false → NÃO match
// id 10 (tipo=xyz) - cat outros has no subcats, so: subcategorias.some(...)=false, cat.id('outros') === 'xyz' = false → NÃO match
assert(fOut.length === 1, `Outros = 1 (got ${fOut.length})`);

console.log('\n  --- Filtro por subcategoria ---');
const fComb = filtrarDespesas(despesasTodas, 'operacionais', 'combustivel', 'todos');
// id 1 (nova subcat=combustivel) + 6 (antiga tipo=combustivel)
assert(fComb.length === 2, `Combustível = 2 (got ${fComb.length})`);

const fSeg = filtrarDespesas(despesasTodas, 'operacionais', 'seguros', 'todos');
assert(fSeg.length === 1, `Seguros = 1 (got ${fSeg.length})`);

console.log('\n  --- Filtro subcategoria sem filtro de categoria ---');
// Subcategoria "combustivel" sem categoria: match por despesa.subcategoria ou despesa.tipo
const fCombSemCat = filtrarDespesas(despesasTodas, 'todos', 'combustivel', 'todos');
// id 1 (subcat=combustivel) + 6 (tipo=combustivel)
assert(fCombSemCat.length === 2, `Subcat "combustivel" sem cat = 2 (got ${fCombSemCat.length})`);

console.log('\n  --- Filtro por método ---');
const fDinh = filtrarDespesas(despesasTodas, 'todos', 'todos', 'dinheiro');
// id 5,6,9,10,11
assert(fDinh.length === 5, `Método dinheiro = 5 (got ${fDinh.length})`);

const fMB = filtrarDespesas(despesasTodas, 'todos', 'todos', 'multibanco');
// id 1,4,8
assert(fMB.length === 3, `Método multibanco = 3 (got ${fMB.length})`);

console.log('\n  --- Filtro cruzado categoria + método ---');
const fOpDinh = filtrarDespesas(despesasTodas, 'operacionais', 'todos', 'dinheiro');
// id 6 (antiga combustivel dinheiro) + id 11 (nova operacionais dinheiro)
assert(fOpDinh.length === 2, `Operacionais + dinheiro = 2 (got ${fOpDinh.length})`);

console.log('\n  --- Filtro cruzado 3 filtros ---');
const fTriple = filtrarDespesas(despesasTodas, 'operacionais', 'combustivel', 'dinheiro');
// id 6 (antiga tipo=combustivel dinheiro)
assert(fTriple.length === 1, `Operacionais + combustivel + dinheiro = 1 (got ${fTriple.length})`);

console.log('\n  --- Filtro que não devolve nada ---');
const fVazio = filtrarDespesas(despesasTodas, 'gestao', 'todos', 'dinheiro');
assert(fVazio.length === 0, `Gestão + dinheiro = 0 (got ${fVazio.length})`);

console.log('\n  --- Despesa sem tipo nem categoria + filtro "outros" ---');
const fSemTipo = filtrarDespesas([{ id: 'x', value: 50, paymentMethod: 'dinheiro' }], 'outros', 'todos', 'todos');
assert(fSemTipo.length === 0, 'Despesa sem tipo/categoria NÃO match "outros"');

console.log('\n  --- Lista vazia ---');
assert(filtrarDespesas([], 'operacionais', 'combustivel', 'dinheiro').length === 0, 'Lista vazia = 0');

console.log('\n  --- Despesa antiga com tipo que pertence a "outros" ---');
const fAntOut = filtrarDespesas([{ id: 'y', tipo: 'outros', value: 50 }], 'outros', 'todos', 'todos');
// cat.subcategorias.some(sub => sub.id === 'outros') → false (outros não tem subcats)
// cat.id === despesa.tipo → 'outros' === 'outros' → true!
assert(fAntOut.length === 1, `Antiga tipo="outros" match categoria "outros" (got ${fAntOut.length})`);


// =======================================================================
//  TESTE 3: ALERTAS — todos os edge cases bizarros
// =======================================================================
console.log('\n' + '='.repeat(60));
console.log('🔔 TESTE 3: Alertas para licenças, exames e veículos');
console.log('='.repeat(60));

console.log('\n  --- Caso normal ---');
const al1 = calcularAlertas([
  { name: 'João Expirado', licenseIssueDate: atras(731) },
  { name: 'Maria Quase', licenseIssueDate: atras(715) },
  { name: 'Pedro Normal', licenseIssueDate: atras(365) },
  { name: 'Ana Exame', theoreticalExamDate: daqui(5), theoreticalExamResult: '' },
  { name: 'Rui Pratico', practicalExamDate: daqui(1), practicalExamResult: '' },
  { name: 'Sofia Aprovada', theoreticalExamDate: daqui(10), theoreticalExamResult: 'approved' },
  { name: 'Tiago Longe', practicalExamDate: daqui(50), practicalExamResult: '' },
], [
  { registration: '11-AA-11', insuranceExpiry: atras(5), inspectionExpiry: daqui(200) },
  { registration: '22-BB-22', insuranceExpiry: daqui(200), inspectionExpiry: daqui(20) },
  { registration: '33-CC-33', insuranceExpiry: daqui(180), inspectionExpiry: daqui(180) },
]);
assert(al1.length === 6, `Normal: 6 alertas (got ${al1.length})`);
assert(al1.some(a => a.descricao === 'João Expirado'), 'João licença expirada');
assert(al1.some(a => a.descricao === 'Maria Quase'), 'Maria quase a expirar');
assert(!al1.some(a => a.descricao === 'Pedro Normal'), 'Pedro sem alerta');
assert(!al1.some(a => a.descricao === 'Sofia Aprovada'), 'Sofia sem alerta (aprovada)');
assert(!al1.some(a => a.descricao === 'Tiago Longe'), 'Tiago sem alerta (>30 dias)');
assert(!al1.some(a => a.descricao === '33-CC-33'), '33-CC-33 sem alerta');

console.log('\n  --- Listas vazias ---');
const al2 = calcularAlertas([], []);
assert(al2.length === 0, 'Sem alunos nem veículos = 0 alertas');

console.log('\n  --- Aluno sem nome ---');
const al3 = calcularAlertas([{ licenseIssueDate: atras(731) }], []);
assert(al3.length === 1, 'Aluno sem nome: gera alerta');
assert(al3[0].descricao === 'Aluno sem nome', 'Aluno sem nome: descricao = "Aluno sem nome"');

console.log('\n  --- Veículo sem matrícula ---');
const al4 = calcularAlertas([], [{ insuranceExpiry: atras(10) }]);
assert(al4.length === 1, 'Veículo sem matrícula: gera alerta');
assert(al4[0].descricao === 'Sem matrícula', 'Veículo sem matrícula: descricao correcta');

console.log('\n  --- Aluno sem licenseIssueDate ---');
const al5 = calcularAlertas([{ name: 'SemLicenca' }], []);
assert(al5.length === 0, 'Sem licenseIssueDate: 0 alertas');

console.log('\n  --- Licença emitida no futuro (data impossível) ---');
const al6 = calcularAlertas([{ name: 'Futuro', licenseIssueDate: daqui(30) }], []);
assert(al6.length === 0, 'Licença futura: sem alerta (expira daqui a 2 anos+30dias)');

console.log('\n  --- Exame hoje exactamente ---');
const al7 = calcularAlertas([{ name: 'Hoje', theoreticalExamDate: daqui(0), theoreticalExamResult: '' }], []);
// diasAte para daqui(0): ceil((date - hoje) / 86400000)
// Com daqui(0) a data é hoje mas no formato YYYY-MM-DD que ao criar new Date() pode dar meia-noite
// O resultado depende do fuso horário mas deve ser 0 ou 1
assert(al7.length === 1, `Exame hoje: gera alerta (got ${al7.length})`);
const hojeAlert = al7[0];
assert(hojeAlert.prioridade === 0, 'Exame hoje: prioridade 0 (urgente)');

console.log('\n  --- Exame ontem (já passou, sem resultado) ---');
const al8 = calcularAlertas([{ name: 'Ontem', theoreticalExamDate: atras(1), theoreticalExamResult: '' }], []);
// diasAte = ceil((ontem - hoje) / ...) = negativo → d < 0 → não entra (d >= 0 && d <= 30)
assert(al8.length === 0, 'Exame ontem: sem alerta (já passou)');

console.log('\n  --- Exame com resultado "failed" ---');
const al9 = calcularAlertas([{ name: 'Reprovado', theoreticalExamDate: daqui(10), theoreticalExamResult: 'failed' }], []);
// theoreticalExamResult é truthy ('failed'), logo !result é false → sem alerta
assert(al9.length === 0, 'Exame reprovado: sem alerta (já tem resultado)');

console.log('\n  --- Aluno com ambos exames próximos ---');
const al10 = calcularAlertas([{
  name: 'Dois Exames',
  theoreticalExamDate: daqui(3),
  theoreticalExamResult: '',
  practicalExamDate: daqui(15),
  practicalExamResult: '',
}], []);
assert(al10.length === 2, `Dois exames: 2 alertas (got ${al10.length})`);
assert(al10.some(a => a.titulo.includes('teórico')), 'Tem alerta teórico');
assert(al10.some(a => a.titulo.includes('prático')), 'Tem alerta prático');

console.log('\n  --- Veículo com TUDO a expirar ---');
const al11 = calcularAlertas([], [{
  registration: '99-ZZ-99',
  insuranceExpiry: daqui(5),
  inspectionExpiry: atras(2),
}]);
assert(al11.length === 2, `Veículo tudo a expirar: 2 alertas (got ${al11.length})`);
assert(al11.some(a => a.titulo.includes('Seguro')), 'Alerta seguro');
assert(al11.some(a => a.titulo.includes('Inspeção expirada')), 'Alerta inspeção expirada');

console.log('\n  --- Veículo sem datas de expiração ---');
const al12 = calcularAlertas([], [{ registration: '00-AA-00' }]);
assert(al12.length === 0, 'Veículo sem datas: 0 alertas');

console.log('\n  --- Limite exacto: expira em exactamente 30 dias ---');
const al13 = calcularAlertas([], [{ registration: 'LIMITE', insuranceExpiry: daqui(30) }]);
assert(al13.length === 1, `Expira em 30 dias: gera alerta (got ${al13.length})`);

console.log('\n  --- Limite exacto: expira em 31 dias ---');
const al14 = calcularAlertas([], [{ registration: 'FORA', insuranceExpiry: daqui(31) }]);
assert(al14.length === 0, `Expira em 31 dias: sem alerta (got ${al14.length})`);

console.log('\n  --- Licença emitida há exactamente 2 anos ---');
const al15 = calcularAlertas([{ name: 'Exacto2Anos', licenseIssueDate: atras(730) }], []);
assert(al15.length === 1, `Licença exactamente 2 anos: gera alerta (got ${al15.length})`);
const exactAlert = al15[0];
assert(exactAlert.prioridade === 0, 'Licença 2 anos: prioridade 0 (expirada ou quase)');

console.log('\n  --- Ordenação com muitos tipos ---');
const al16 = calcularAlertas(
  [
    { name: 'A', practicalExamDate: daqui(20), practicalExamResult: '' }, // p2
    { name: 'B', licenseIssueDate: atras(731) }, // p0
    { name: 'C', theoreticalExamDate: daqui(2), theoreticalExamResult: '' }, // p0 (<=3)
  ],
  [
    { registration: 'V1', insuranceExpiry: daqui(15) }, // p1
  ]
);
assert(al16.length === 4, `Ordenação: 4 alertas (got ${al16.length})`);
// Verificar que p0 vem antes de p1, p1 antes de p2
for (let i = 1; i < al16.length; i++) {
  assert(al16[i].prioridade >= al16[i-1].prioridade, `Ordem: alerta ${i-1}(p${al16[i-1].prioridade}) <= ${i}(p${al16[i].prioridade})`);
}

console.log('\n  --- Muitos alunos e veículos sem problemas ---');
const alunosSaudaveis = Array.from({length: 50}, (_, i) => ({
  name: `Aluno${i}`,
  licenseIssueDate: atras(100), // 1 ano e 265 dias até expirar
  theoreticalExamDate: daqui(60), // fora de 30 dias
  theoreticalExamResult: '',
}));
const veiculosSaudaveis = Array.from({length: 20}, (_, i) => ({
  registration: `${i}-XX-${i}`,
  insuranceExpiry: daqui(180),
  inspectionExpiry: daqui(180),
}));
const al17 = calcularAlertas(alunosSaudaveis, veiculosSaudaveis);
assert(al17.length === 0, `50 alunos + 20 veículos saudáveis: 0 alertas (got ${al17.length})`);


// =======================================================================
//  TESTE 4: RELATÓRIO SERVIÇOS POR ALUNO — todos os edge cases
// =======================================================================
console.log('\n' + '='.repeat(60));
console.log('📋 TESTE 4: Relatório serviços por aluno / cálculo de dívida');
console.log('='.repeat(60));

console.log('\n  --- Caso normal ---');
const d1 = calcularDividaAluno({
  servicosAtivos: [
    { servicoPrice: 500, quantidade: 1 },
    { servicoPrice: 30, quantidade: 1 },
  ],
  materiaisComprados: [{ materialPrice: 25, quantidade: 1 }],
  pagamentos: [
    { type: 'pronto', value: 200 },
    { type: 'prestacao', value: 100, isPago: true, valorPrestacao: 100 },
    { type: 'prestacao', value: 100, isPago: false, valorPrestacao: 100 },
  ]
});
assertClose(d1.totalDivida, 555, 'Normal: dívida = 555');
assertClose(d1.totalPagamentos, 300, 'Normal: pago = 300');
assertClose(d1.saldo, 255, 'Normal: saldo = 255');

console.log('\n  --- Aluno completamente vazio ---');
const d2 = calcularDividaAluno({});
assertClose(d2.totalDivida, 0, 'Vazio: dívida = 0');
assertClose(d2.totalPagamentos, 0, 'Vazio: pago = 0');
assertClose(d2.saldo, 0, 'Vazio: saldo = 0');

console.log('\n  --- Aluno com undefined nos arrays ---');
const d3 = calcularDividaAluno({ servicosAtivos: undefined, materiaisComprados: undefined, pagamentos: undefined });
assertClose(d3.totalDivida, 0, 'Undefined arrays: dívida = 0');
assertClose(d3.totalPagamentos, 0, 'Undefined arrays: pago = 0');

console.log('\n  --- Serviço sem servicoPrice ---');
const d4 = calcularDividaAluno({ servicosAtivos: [{ quantidade: 5 }] });
assertClose(d4.totalDivida, 0, 'Serviço sem preço: dívida = 0 (0 * 5)');

console.log('\n  --- Serviço sem quantidade (fallback 1) ---');
const d5 = calcularDividaAluno({ servicosAtivos: [{ servicoPrice: 100 }] });
assertClose(d5.totalDivida, 100, 'Sem quantidade: usa 1 (100 * 1 = 100)');

console.log('\n  --- Serviço com "quantity" em vez de "quantidade" ---');
const d6 = calcularDividaAluno({ servicosAtivos: [{ servicoPrice: 50, quantity: 3 }] });
assertClose(d6.totalDivida, 150, 'Campo "quantity": 50 * 3 = 150');

console.log('\n  --- Material com quantidade > 1 ---');
const d7 = calcularDividaAluno({ materiaisComprados: [{ materialPrice: 10, quantidade: 5 }] });
assertClose(d7.totalDivida, 50, 'Material 10 * 5 = 50');

console.log('\n  --- Pagamento com "tipo" em vez de "type" ---');
const d8 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 200, quantidade: 1 }],
  pagamentos: [{ tipo: 'pronto', valor: 150 }]
});
assertClose(d8.totalPagamentos, 150, 'Campo "tipo"/"valor": funciona');
assertClose(d8.saldo, 50, 'Saldo com campos antigos: 200 - 150 = 50');

console.log('\n  --- Pagamento tipo "pagamento" (do VerFichaAlunoModal) ---');
const d9 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 300, quantidade: 1 }],
  pagamentos: [{ tipo: 'pagamento', valor: 300 }]
});
// tipo 'pagamento' não é 'pronto' nem 'prestacao' → cai no else → valorPago || val
assertClose(d9.totalPagamentos, 300, 'Tipo "pagamento": conta via else branch');

console.log('\n  --- Prestação com isPago undefined (não boolean) ---');
const d10 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 100, quantidade: 1 }],
  pagamentos: [{ type: 'prestacao', value: 100, isPago: undefined }]
});
assertClose(d10.totalPagamentos, 0, 'isPago undefined: não conta (=== true falha)');

console.log('\n  --- Prestação com isPago = "true" (string!) ---');
const d11 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 100, quantidade: 1 }],
  pagamentos: [{ type: 'prestacao', value: 100, isPago: 'true' }]
});
assertClose(d11.totalPagamentos, 0, 'isPago string "true": NÃO conta (=== true falha com string)');

console.log('\n  --- Aluno que pagou MAIS do que deve (saldo negativo) ---');
const d12 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 100, quantidade: 1 }],
  pagamentos: [{ type: 'pronto', value: 300 }]
});
assertClose(d12.saldo, -200, 'Pagou a mais: saldo = -200');

console.log('\n  --- Só prestações, todas pagas ---');
const d13 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 300, quantidade: 1 }],
  pagamentos: [
    { type: 'prestacao', value: 100, isPago: true, valorPrestacao: 100 },
    { type: 'prestacao', value: 100, isPago: true, valorPrestacao: 100 },
    { type: 'prestacao', value: 100, isPago: true, valorPrestacao: 100 },
  ]
});
assertClose(d13.totalPagamentos, 300, 'Todas prestações pagas: 300');
assertClose(d13.saldo, 0, 'Tudo pago: saldo = 0');

console.log('\n  --- Só prestações, nenhuma paga ---');
const d14 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 300, quantidade: 1 }],
  pagamentos: [
    { type: 'prestacao', value: 100, isPago: false },
    { type: 'prestacao', value: 100, isPago: false },
    { type: 'prestacao', value: 100, isPago: false },
  ]
});
assertClose(d14.totalPagamentos, 0, 'Nenhuma prestação paga: 0');
assertClose(d14.saldo, 300, 'Nenhuma paga: saldo = 300');

console.log('\n  --- Valores decimais ---');
const d15 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 99.99, quantidade: 1 }],
  materiaisComprados: [{ materialPrice: 0.01, quantidade: 1 }],
  pagamentos: [{ type: 'pronto', value: 50.50 }]
});
assertClose(d15.totalDivida, 100, 'Decimais: dívida = 100');
assertClose(d15.totalPagamentos, 50.50, 'Decimais: pago = 50.50');
assertClose(d15.saldo, 49.50, 'Decimais: saldo = 49.50');

console.log('\n  --- Muitos serviços e materiais ---');
const d16 = calcularDividaAluno({
  servicosAtivos: Array.from({length: 10}, () => ({ servicoPrice: 100, quantidade: 2 })),
  materiaisComprados: Array.from({length: 5}, () => ({ materialPrice: 20, quantidade: 3 })),
  pagamentos: [{ type: 'pronto', value: 1000 }]
});
// Serviços: 10 * 100 * 2 = 2000
// Materiais: 5 * 20 * 3 = 300
// Total: 2300, Pago: 1000, Saldo: 1300
assertClose(d16.totalDivida, 2300, 'Muitos items: dívida = 2300');
assertClose(d16.totalPagamentos, 1000, 'Muitos items: pago = 1000');
assertClose(d16.saldo, 1300, 'Muitos items: saldo = 1300');

console.log('\n  --- Prestação com valorPrestacao diferente de value ---');
const d17 = calcularDividaAluno({
  servicosAtivos: [{ servicoPrice: 500, quantidade: 1 }],
  pagamentos: [{ type: 'prestacao', value: 100, isPago: true, valorPrestacao: 150 }]
});
assertClose(d17.totalPagamentos, 150, 'valorPrestacao (150) tem prioridade sobre value (100)');


// =======================================================================
//  TESTE 5: CREATEDBY — todos os edge cases
// =======================================================================
console.log('\n' + '='.repeat(60));
console.log('🧑‍💼 TESTE 5: Campo createdBy nos movimentos');
console.log('='.repeat(60));

console.log('\n  --- Casos normais ---');
const m1 = criarMovimento({ type: 'pagamento', value: 100 }, { name: 'João Silva', id: 'user123' });
assert(m1.createdBy === 'João Silva', 'Com user: createdBy = "João Silva"');
assert(m1.createdByUserId === 'user123', 'Com user: createdByUserId = "user123"');

const m2 = criarMovimento({ type: 'pagamento', value: 100 }, null);
assert(m2.createdBy === 'Desconhecido', 'Sem user (null): createdBy = "Desconhecido"');
assert(m2.createdByUserId === null, 'Sem user (null): userId = null');

const m3 = criarMovimento({ type: 'pagamento', value: 100 }, undefined);
assert(m3.createdBy === 'Desconhecido', 'Sem user (undefined): createdBy = "Desconhecido"');
assert(m3.createdByUserId === null, 'Sem user (undefined): userId = null');

console.log('\n  --- User sem campos ---');
const m4 = criarMovimento({}, { email: 'test@test.com' });
assert(m4.createdBy === 'Desconhecido', 'User sem name: "Desconhecido"');
assert(m4.createdByUserId === null, 'User sem id: null');

console.log('\n  --- User com nome vazio ---');
const m5 = criarMovimento({}, { name: '', id: 'abc' });
assert(m5.createdBy === 'Desconhecido', 'Nome vazio: "Desconhecido" (falsy)');
assert(m5.createdByUserId === 'abc', 'Id existe: preservado');

console.log('\n  --- Campos do movimento preservados ---');
const m6 = criarMovimento({ type: 'despesa', value: -500, paymentMethod: 'transferencia', description: 'Gasolina' }, { name: 'Admin', id: '1' });
assert(m6.type === 'despesa', 'type preservado');
assert(m6.value === -500, 'value preservado');
assert(m6.paymentMethod === 'transferencia', 'paymentMethod preservado');
assert(m6.description === 'Gasolina', 'description preservado');
assert(m6.createdBy === 'Admin', 'createdBy adicionado');

console.log('\n  --- User com nome com caracteres especiais ---');
const m7 = criarMovimento({}, { name: 'José María Ñöñö', id: '123' });
assert(m7.createdBy === 'José María Ñöñö', 'Nome com acentos e caracteres especiais');

console.log('\n  --- User object vazio ---');
const m8 = criarMovimento({}, {});
assert(m8.createdBy === 'Desconhecido', 'Object vazio: "Desconhecido"');
assert(m8.createdByUserId === null, 'Object vazio: userId null');


// =======================================================================
//  TESTE 6: ITEM 10 — Prestações aparecem imediatamente (optimistic update)
// =======================================================================
console.log('\n' + '='.repeat(60));
console.log('💳 TESTE 6: Prestações aparecem imediatamente após pagamento');
console.log('='.repeat(60));

// Simula o fluxo: PagamentoModal → onSuccess(pagamentosFinais) → handlePagamentoSuccess
// A lógica core é: se pagamentosFinais é array válido, usar diretamente; senão, ignorar

function simulateHandlePagamentoSuccess(pagamentosFinais, alunoAtual) {
  // Simula o que handlePagamentoSuccess faz no VerFichaAlunoModal
  let pagamentosLocal = alunoAtual.pagamentos || null;
  let alunoUpdated = { ...alunoAtual };

  if (pagamentosFinais && Array.isArray(pagamentosFinais)) {
    pagamentosLocal = pagamentosFinais;
    alunoUpdated = { ...alunoAtual, pagamentos: pagamentosFinais };
  }

  return { pagamentosLocal, alunoUpdated };
}

console.log('\n  --- Pagamento a pronto: pagamentosFinais passado com sucesso ---');
const pag1_antes = { id: 'aluno1', name: 'João', pagamentos: [] };
const pag1_finais = [
  { type: 'pronto', value: 500, method: 'transferencia', date: { seconds: Date.now()/1000 } }
];
const pag1_result = simulateHandlePagamentoSuccess(pag1_finais, pag1_antes);
assert(pag1_result.pagamentosLocal.length === 1, 'Pagamento a pronto: pagamentosLocal atualizado com 1 item');
assert(pag1_result.pagamentosLocal[0].value === 500, 'Pagamento a pronto: valor correto (500)');
assert(pag1_result.alunoUpdated.pagamentos.length === 1, 'Pagamento a pronto: aluno atualizado');

console.log('\n  --- Prestação adicionada sequencialmente ---');
const pag2_antes = { id: 'aluno2', name: 'Maria', pagamentos: [
  { type: 'prestacao', value: 100, valorPrestacao: 100, isPago: false, dataMaximaPagamento: { seconds: Date.now()/1000 } }
]};
const pag2_finais = [
  ...pag2_antes.pagamentos,
  { type: 'prestacao', value: 100, valorPrestacao: 100, isPago: false, dataMaximaPagamento: { seconds: Date.now()/1000 } }
];
const pag2_result = simulateHandlePagamentoSuccess(pag2_finais, pag2_antes);
assert(pag2_result.pagamentosLocal.length === 2, 'Prestação sequencial: pagamentosLocal = 2');
assert(pag2_result.alunoUpdated.pagamentos.length === 2, 'Prestação sequencial: aluno tem 2 pagamentos');

console.log('\n  --- Pagar prestação existente ---');
const pag3_antes = { id: 'aluno3', name: 'Carlos', pagamentos: [
  { type: 'prestacao', value: 100, valorPrestacao: 100, isPago: false },
  { type: 'prestacao', value: 150, valorPrestacao: 150, isPago: false }
]};
const pag3_finais = [
  { type: 'prestacao', value: 100, valorPrestacao: 100, isPago: true, method: 'dinheiro' },
  { type: 'prestacao', value: 150, valorPrestacao: 150, isPago: false }
];
const pag3_result = simulateHandlePagamentoSuccess(pag3_finais, pag3_antes);
assert(pag3_result.pagamentosLocal[0].isPago === true, 'Pagar prestação: 1ª fica isPago = true');
assert(pag3_result.pagamentosLocal[0].method === 'dinheiro', 'Pagar prestação: método atualizado');
assert(pag3_result.pagamentosLocal[1].isPago === false, 'Pagar prestação: 2ª continua isPago = false');

console.log('\n  --- 5 prestações sequenciais sem sair ---');
let pagSeq = { id: 'aluno4', name: 'Ana', pagamentos: [] };
for (let i = 1; i <= 5; i++) {
  const novasPrestacoes = [...pagSeq.pagamentos, { type: 'prestacao', value: 50, valorPrestacao: 50, isPago: false, numeroPrestacao: i }];
  const res = simulateHandlePagamentoSuccess(novasPrestacoes, pagSeq);
  pagSeq = res.alunoUpdated; // Simular que o aluno é atualizado entre cada adição
}
assert(pagSeq.pagamentos.length === 5, '5 prestações sequenciais: todas aparecem (5)');
assert(pagSeq.pagamentos[0].numeroPrestacao === 1, '5 prestações sequenciais: 1ª é nº 1');
assert(pagSeq.pagamentos[4].numeroPrestacao === 5, '5 prestações sequenciais: 5ª é nº 5');

console.log('\n  --- pagamentosFinais null (fallback) ---');
const pag4_antes = { id: 'aluno5', name: 'Rui', pagamentos: [{ type: 'pronto', value: 200 }] };
const pag4_result = simulateHandlePagamentoSuccess(null, pag4_antes);
assert(pag4_result.pagamentosLocal !== null, 'pagamentosFinais null: mantém local existente');
assert(pag4_result.pagamentosLocal.length === 1, 'pagamentosFinais null: pagamentos anteriores intactos');

console.log('\n  --- pagamentosFinais undefined (fallback) ---');
const pag5_result = simulateHandlePagamentoSuccess(undefined, pag4_antes);
assert(pag5_result.pagamentosLocal.length === 1, 'pagamentosFinais undefined: pagamentos intactos');

console.log('\n  --- pagamentosFinais array vazio ---');
const pag6_result = simulateHandlePagamentoSuccess([], pag4_antes);
assert(pag6_result.pagamentosLocal.length === 0, 'pagamentosFinais []: pagamentosLocal vazio (reset)');
assert(pag6_result.alunoUpdated.pagamentos.length === 0, 'pagamentosFinais []: aluno reset');

console.log('\n  --- pagamentosFinais não é array (string) ---');
const pag7_result = simulateHandlePagamentoSuccess('not-an-array', pag4_antes);
assert(pag7_result.pagamentosLocal.length === 1, 'pagamentosFinais string: ignorado, mantém anterior');

console.log('\n  --- pagamentosFinais não é array (object) ---');
const pag8_result = simulateHandlePagamentoSuccess({length: 2}, pag4_antes);
assert(pag8_result.pagamentosLocal.length === 1, 'pagamentosFinais object: ignorado, mantém anterior');

console.log('\n  --- pagamentosFinais não é array (number) ---');
const pag9_result = simulateHandlePagamentoSuccess(42, pag4_antes);
assert(pag9_result.pagamentosLocal.length === 1, 'pagamentosFinais number: ignorado, mantém anterior');

console.log('\n  --- Aluno sem pagamentos anteriores + novo pagamento ---');
const pag10_antes = { id: 'aluno6', name: 'Pedro' };
const pag10_finais = [{ type: 'pronto', value: 300, method: 'multibanco' }];
const pag10_result = simulateHandlePagamentoSuccess(pag10_finais, pag10_antes);
assert(pag10_result.pagamentosLocal.length === 1, 'Sem pagamentos + novo: pagamentosLocal = 1');

console.log('\n  --- Pagamento misto em prestação ---');
const pag11_finais = [
  { type: 'prestacao', value: 200, valorPrestacao: 200, isPago: true, method: 'misto',
    parcelas: [{ method: 'dinheiro', value: 100 }, { method: 'transferencia', value: 100 }] }
];
const pag11_result = simulateHandlePagamentoSuccess(pag11_finais, { id: 'x', pagamentos: [] });
assert(pag11_result.pagamentosLocal[0].method === 'misto', 'Pagamento misto: method = misto');
assert(pag11_result.pagamentosLocal[0].parcelas.length === 2, 'Pagamento misto: 2 parcelas');

console.log('\n  --- totalDivida recalculado após pagamento optimista ---');
const alunoComServicos = {
  id: 'aluno7',
  name: 'Sara',
  servicosAtivos: [{ servicoPrice: 500, quantity: 1 }, { servicoPrice: 300, quantity: 2 }],
  materiaisComprados: [{ materialPrice: 25, quantity: 2 }],
  pagamentos: [{ type: 'pronto', value: 200 }]
};
// Total = 500 + 600 + 50 = 1150, Pago = 200, Saldo = 950
const div_antes = calcularDividaAluno(alunoComServicos);
assertClose(div_antes.saldo, 950, 'Antes do pagamento: saldo = 950');

// Simular pagamento a pronto de 300€
const novoPag = [...alunoComServicos.pagamentos, { type: 'pronto', value: 300 }];
const depois = simulateHandlePagamentoSuccess(novoPag, alunoComServicos);
const div_depois = calcularDividaAluno({ ...depois.alunoUpdated, servicosAtivos: alunoComServicos.servicosAtivos, materiaisComprados: alunoComServicos.materiaisComprados });
assertClose(div_depois.saldo, 650, 'Após pagamento optimista: saldo = 650');
assertClose(div_depois.totalPagamentos, 500, 'Após pagamento optimista: totalPago = 500');


// =======================================================================
//  TESTE 7: ITEM 12 — Aluno aparece imediatamente após adicionar
// =======================================================================
console.log('\n' + '='.repeat(60));
console.log('🎓 TESTE 7: Aluno aparece imediatamente na lista após criação');
console.log('='.repeat(60));

// Simula o fluxo: AdicionarNovoAlunoModal → onSuccess(novoAluno) → handleSuccess
// A lógica core: se novoAluno tem id, adicionar à lista; depois fetchAlunos para sync

function sortByLastModified(list) {
  return [...list].sort((a, b) => {
    const getTime = (s) => {
      const t = s.updatedAt || s.createdAt;
      if (!t) return 0;
      if (t.toDate) return t.toDate().getTime();
      if (t.seconds) return t.seconds * 1000;
      if (t instanceof Date) return t.getTime();
      return new Date(t).getTime() || 0;
    };
    return getTime(b) - getTime(a);
  });
}

function simulateHandleSuccess(novoAluno, alunosAtuais) {
  let alunos = [...alunosAtuais];

  // Simula handleSuccess do Alunos.js
  if (novoAluno && novoAluno.id) {
    alunos = sortByLastModified([novoAluno, ...alunos]);
  }

  return alunos;
}

console.log('\n  --- Adicionar aluno a lista vazia ---');
const novoAluno1 = { id: 'abc1', name: 'Novo Aluno', email: 'novo@test.com', createdAt: { seconds: Date.now()/1000 } };
const lista1 = simulateHandleSuccess(novoAluno1, []);
assert(lista1.length === 1, 'Lista vazia + novo: length = 1');
assert(lista1[0].name === 'Novo Aluno', 'Lista vazia + novo: nome correto');
assert(lista1[0].id === 'abc1', 'Lista vazia + novo: id correto');

console.log('\n  --- Adicionar aluno a lista existente ---');
const alunosExistentes = [
  { id: 'old1', name: 'Aluno Antigo 1', createdAt: { seconds: (Date.now()/1000) - 86400 } },
  { id: 'old2', name: 'Aluno Antigo 2', createdAt: { seconds: (Date.now()/1000) - 172800 } }
];
const novoAluno2 = { id: 'new1', name: 'Aluno Novo', createdAt: { seconds: Date.now()/1000 } };
const lista2 = simulateHandleSuccess(novoAluno2, alunosExistentes);
assert(lista2.length === 3, 'Lista existente + novo: length = 3');
assert(lista2[0].id === 'new1', 'Novo aluno é o primeiro (mais recente)');

console.log('\n  --- novoAluno null (fallback) ---');
const lista3 = simulateHandleSuccess(null, alunosExistentes);
assert(lista3.length === 2, 'novoAluno null: lista inalterada (length = 2)');

console.log('\n  --- novoAluno undefined (fallback) ---');
const lista4 = simulateHandleSuccess(undefined, alunosExistentes);
assert(lista4.length === 2, 'novoAluno undefined: lista inalterada');

console.log('\n  --- novoAluno sem id (ignorado) ---');
const lista5 = simulateHandleSuccess({ name: 'Sem ID' }, alunosExistentes);
assert(lista5.length === 2, 'novoAluno sem id: ignorado, lista inalterada');

console.log('\n  --- novoAluno com id vazio string (ignorado) ---');
const lista6 = simulateHandleSuccess({ id: '', name: 'Id vazio' }, alunosExistentes);
assert(lista6.length === 2, 'novoAluno id="": ignorado (falsy)');

console.log('\n  --- novoAluno com campos mínimos ---');
const novoAluno3 = { id: 'min1', name: 'Minimalista', createdAt: { seconds: Date.now()/1000 } };
const lista7 = simulateHandleSuccess(novoAluno3, []);
assert(lista7.length === 1, 'Campos mínimos: adicionado');
assert(lista7[0].email === undefined, 'Campos mínimos: email undefined (ok)');

console.log('\n  --- novoAluno com todos os campos ---');
const novoAluno4 = {
  id: 'full1', name: 'Aluno Completo', email: 'comp@test.com', phone: '912345678',
  address: 'Rua X nº1', nif: '123456789', cc: '12345678',
  enrollmentDate: '2025-01-15', enrollmentNumber: 'INS001',
  totalDivida: 0, active: true, createdAt: { seconds: Date.now()/1000 }
};
const lista8 = simulateHandleSuccess(novoAluno4, alunosExistentes);
assert(lista8.length === 3, 'Todos os campos: adicionado (length = 3)');
assert(lista8[0].enrollmentNumber === 'INS001', 'Todos os campos: enrollmentNumber preservado');

console.log('\n  --- Ordenação: aluno sem createdAt fica no final ---');
const novoSemData = { id: 'nodate1', name: 'Sem Data' }; // sem createdAt
const listaOrdem = simulateHandleSuccess(novoSemData, alunosExistentes);
assert(listaOrdem.length === 3, 'Sem createdAt: adicionado');
assert(listaOrdem[listaOrdem.length - 1].id === 'nodate1', 'Sem createdAt: fica no final da lista');

console.log('\n  --- Adicionar 10 alunos sequencialmente ---');
let listaSeq = [];
for (let i = 1; i <= 10; i++) {
  const aluno = { id: `seq${i}`, name: `Aluno Seq ${i}`, createdAt: { seconds: (Date.now()/1000) + i } };
  listaSeq = simulateHandleSuccess(aluno, listaSeq);
}
assert(listaSeq.length === 10, '10 alunos sequenciais: todos adicionados');
assert(listaSeq[0].id === 'seq10', '10 alunos sequenciais: mais recente é o último adicionado');
assert(listaSeq[9].id === 'seq1', '10 alunos sequenciais: mais antigo é o primeiro adicionado');

console.log('\n  --- novoAluno não é object ---');
const lista9 = simulateHandleSuccess('string-aluno', alunosExistentes);
assert(lista9.length === 2, 'novoAluno string: ignorado');
const lista10 = simulateHandleSuccess(42, alunosExistentes);
assert(lista10.length === 2, 'novoAluno number: ignorado');
const lista11 = simulateHandleSuccess(true, alunosExistentes);
assert(lista11.length === 2, 'novoAluno boolean: ignorado');

console.log('\n  --- createdAt como Date nativo ---');
const novoComDate = { id: 'date1', name: 'Com Date', createdAt: new Date() };
const listaDate = simulateHandleSuccess(novoComDate, alunosExistentes);
assert(listaDate.length === 3, 'createdAt Date: adicionado');
assert(listaDate[0].id === 'date1', 'createdAt Date: mais recente fica primeiro');

console.log('\n  --- createdAt como string ISO ---');
const novoComStr = { id: 'str1', name: 'Com String', createdAt: new Date().toISOString() };
const listaStr = simulateHandleSuccess(novoComStr, alunosExistentes);
assert(listaStr.length === 3, 'createdAt string: adicionado');
assert(listaStr[0].id === 'str1', 'createdAt string: ordenado corretamente');

console.log('\n  --- createdAt com toDate() (Firestore Timestamp simulado) ---');
const novoComToDate = { id: 'td1', name: 'Com toDate', createdAt: { toDate: () => new Date() } };
const listaTD = simulateHandleSuccess(novoComToDate, alunosExistentes);
assert(listaTD.length === 3, 'createdAt toDate(): adicionado');
assert(listaTD[0].id === 'td1', 'createdAt toDate(): ordenado corretamente');


// =======================================================================
//  RESUMO FINAL
// =======================================================================
console.log('\n' + '='.repeat(60));
console.log(`\n📊 RESULTADO FINAL: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ ALGUNS TESTES FALHARAM!\n');
  process.exit(1);
} else {
  console.log('✅ TODOS OS TESTES PASSARAM!\n');
  process.exit(0);
}
