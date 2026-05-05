import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './ExtrairVariaveisPagamentos.css';

const ExtrairVariaveisPagamentos = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [progresso, setProgresso] = useState('');
  const [showRenomear, setShowRenomear] = useState(false);
  const [variavelAntiga, setVariavelAntiga] = useState('');
  const [variavelNova, setVariavelNova] = useState('');
  const [previewRenomear, setPreviewRenomear] = useState(null);
  const [renomeando, setRenomeando] = useState(false);
  const [showRemoverDuplicada, setShowRemoverDuplicada] = useState(false);
  const [variavel1, setVariavel1] = useState('');
  const [variavel2, setVariavel2] = useState('');
  const [previewRemover, setPreviewRemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [showRemoverNull, setShowRemoverNull] = useState(false);
  const [previewRemoverNull, setPreviewRemoverNull] = useState(null);
  const [removendoNull, setRemovendoNull] = useState(false);
  const [showConverterDatas, setShowConverterDatas] = useState(false);
  const [previewConverterDatas, setPreviewConverterDatas] = useState(null);
  const [convertendoDatas, setConvertendoDatas] = useState(false);
  const [showNormalizar, setShowNormalizar] = useState(false);
  const [previewNormalizar, setPreviewNormalizar] = useState(null);
  const [normalizando, setNormalizando] = useState(false);
  const [gruposNormalizacao, setGruposNormalizacao] = useState([]); // Array de {id, nomePadrao, variaveis: []}
  const [conflitos, setConflitos] = useState([]); // Array de conflitos encontrados
  const [resolucoesConflitos, setResolucoesConflitos] = useState({}); // {conflitoId: {acao: 'manter', variavel: 'valor'}}
  const [variaveisSelecionadas, setVariaveisSelecionadas] = useState([]); // Array de variáveis selecionadas para análise
  const [valoresUnicos, setValoresUnicos] = useState({}); // {variavel: Set de valores únicos}
  const [carregandoValores, setCarregandoValores] = useState(false);

  // Adicionar novo grupo de normalização
  const adicionarGrupoNormalizacao = () => {
    const novoId = Date.now().toString();
    setGruposNormalizacao(prev => [...prev, {
      id: novoId,
      nomePadrao: '',
      variaveis: []
    }]);
  };

  // Remover grupo de normalização
  const removerGrupoNormalizacao = (grupoId) => {
    setGruposNormalizacao(prev => prev.filter(g => g.id !== grupoId));
  };

  // Atualizar nome padrão de um grupo
  const atualizarNomePadrao = (grupoId, nomePadrao) => {
    setGruposNormalizacao(prev => prev.map(g => 
      g.id === grupoId ? { ...g, nomePadrao } : g
    ));
  };

  // Adicionar variável a um grupo
  const adicionarVariavelAoGrupo = (grupoId, variavel) => {
    setGruposNormalizacao(prev => prev.map(g => {
      if (g.id === grupoId && !g.variaveis.includes(variavel)) {
        return { ...g, variaveis: [...g.variaveis, variavel] };
      }
      return g;
    }));
  };

  // Remover variável de um grupo
  const removerVariavelDoGrupo = (grupoId, variavel) => {
    setGruposNormalizacao(prev => prev.map(g => {
      if (g.id === grupoId) {
        return { ...g, variaveis: g.variaveis.filter(v => v !== variavel) };
      }
      return g;
    }));
  };

  const extrairTodasVariaveisPagamentos = async (escolaId, escolaNome) => {
    const todasVariaveis = new Set();
    const contadorVariaveis = {};
    const exemplosValores = {};

    try {
      setProgresso(`A processar escola: ${escolaNome || escolaId}...`);
      const studentsRef = collection(db, 'schools', escolaId, 'students');
      const studentsSnapshot = await getDocs(studentsRef);

      let alunoIndex = 0;
      for (const studentDoc of studentsSnapshot.docs) {
        alunoIndex++;
        const alunoId = studentDoc.id;
        const alunoData = studentDoc.data();

        setProgresso(`A processar escola: ${escolaNome || escolaId}... Aluno ${alunoIndex}/${studentsSnapshot.size}`);

        // Verificar pagamentos no array do documento do aluno
        if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
          alunoData.pagamentos.forEach((pagamento, index) => {
            if (pagamento && typeof pagamento === 'object' && !Array.isArray(pagamento)) {
              try {
                Object.keys(pagamento).forEach(chave => {
                  // Só contar se o valor não for null ou undefined
                  if (pagamento[chave] !== null && pagamento[chave] !== undefined) {
                    todasVariaveis.add(chave);
                    contadorVariaveis[chave] = (contadorVariaveis[chave] || 0) + 1;

                    if (!exemplosValores[chave]) {
                      exemplosValores[chave] = {
                        valor: pagamento[chave],
                        tipo: typeof pagamento[chave],
                        aluno: alunoData.name || alunoId,
                        index: index
                      };
                    }
                  }
                });
              } catch (err) {
                console.warn('Erro ao processar pagamento do array:', err);
              }
            }
          });
        }

        // Verificar pagamentos na subcoleção 'pagamentos'
        try {
          const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
          const pagamentosSnapshot = await getDocs(pagamentosRef);

          pagamentosSnapshot.forEach((pagamentoDoc) => {
            try {
              const pagamentoData = pagamentoDoc.data();

              if (pagamentoData && typeof pagamentoData === 'object' && !Array.isArray(pagamentoData)) {
                Object.keys(pagamentoData).forEach(chave => {
                  // Só contar se o valor não for null ou undefined
                  if (pagamentoData[chave] !== null && pagamentoData[chave] !== undefined) {
                    todasVariaveis.add(chave);
                    contadorVariaveis[chave] = (contadorVariaveis[chave] || 0) + 1;

                    if (!exemplosValores[chave]) {
                      exemplosValores[chave] = {
                        valor: pagamentoData[chave],
                        tipo: typeof pagamentoData[chave],
                        aluno: alunoData.name || alunoId,
                        documento: pagamentoDoc.id
                      };
                    }
                  }
                });
              }
            } catch (err) {
              console.warn('Erro ao processar documento de pagamento:', err);
            }
          });
        } catch (err) {
          // Ignorar erros de subcoleção (pode não existir)
          console.log(`Subcoleção de pagamentos não existe para aluno ${alunoId}`);
        }
      }

      const variaveisOrdenadas = Array.from(todasVariaveis).sort((a, b) => {
        return contadorVariaveis[b] - contadorVariaveis[a];
      });

      return {
        escolaId,
        totalVariaveis: todasVariaveis.size,
        variaveis: variaveisOrdenadas,
        contador: contadorVariaveis,
        exemplos: exemplosValores,
        totalAlunos: studentsSnapshot.size
      };
    } catch (error) {
      console.error('Erro ao extrair variáveis:', error);
      throw error;
    }
  };

  const handleExtrair = async () => {
    setLoading(true);
    setErro('');
    setResultado(null);
    setProgresso('A iniciar...');

    try {
      setProgresso('A buscar escolas...');
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);

      console.log(`Encontradas ${schoolsSnapshot.size} escolas`);

      const todasVariaveisGlobal = new Set();
      const contadorGlobal = {};
      const exemplosGlobal = {};
      const resultadosPorEscola = [];

      let escolaIndex = 0;
      for (const schoolDoc of schoolsSnapshot.docs) {
        escolaIndex++;
        const escolaId = schoolDoc.id;
        const escolaData = schoolDoc.data();

        setProgresso(`A processar escola ${escolaIndex}/${schoolsSnapshot.size}: ${escolaData.name || escolaId}`);

        try {
          const resultadoEscola = await extrairTodasVariaveisPagamentos(escolaId, escolaData.name);
          resultadosPorEscola.push({
            escolaId,
            escolaNome: escolaData.name || escolaId,
            ...resultadoEscola
          });

          // Consolidar resultados globais
          resultadoEscola.variaveis.forEach(variavel => {
            todasVariaveisGlobal.add(variavel);
            contadorGlobal[variavel] = (contadorGlobal[variavel] || 0) + resultadoEscola.contador[variavel];

            if (!exemplosGlobal[variavel]) {
              exemplosGlobal[variavel] = resultadoEscola.exemplos[variavel];
            }
          });
        } catch (err) {
          console.error(`Erro ao processar escola ${escolaId}:`, err);
          // Continuar com próxima escola mesmo se houver erro
        }
      }

      const variaveisGlobaisOrdenadas = Array.from(todasVariaveisGlobal).sort((a, b) => {
        return contadorGlobal[b] - contadorGlobal[a];
      });

      setProgresso('A finalizar...');
      
      setResultado({
        totalEscolas: schoolsSnapshot.size,
        totalVariaveis: todasVariaveisGlobal.size,
        variaveis: variaveisGlobaisOrdenadas,
        contador: contadorGlobal,
        exemplos: exemplosGlobal,
        resultadosPorEscola
      });

      setProgresso('Concluído!');
      console.log('Extração concluída com sucesso');
    } catch (error) {
      console.error('Erro ao processar:', error);
      setErro(`Erro ao extrair variáveis: ${error.message}. Verifique a consola para mais detalhes.`);
      setProgresso('');
    } finally {
      setLoading(false);
    }
  };

  const formatarValor = (valor) => {
    if (valor === null) return 'null';
    if (valor === undefined) return 'undefined';
    if (typeof valor === 'object') {
      if (valor.toDate && typeof valor.toDate === 'function') {
        return valor.toDate().toLocaleString('pt-PT');
      }
      if (valor.seconds) {
        return new Date(valor.seconds * 1000).toLocaleString('pt-PT');
      }
      return JSON.stringify(valor);
    }
    return String(valor);
  };

  // Função para extrair valores únicos das variáveis selecionadas
  const extrairValoresUnicos = async () => {
    if (!resultado || variaveisSelecionadas.length === 0) {
      setErro('Por favor, selecione pelo menos uma variável.');
      return;
    }

    setCarregandoValores(true);
    setErro('');
    setProgresso('A extrair valores únicos...');

    try {
      const valoresPorVariavel = {};
      variaveisSelecionadas.forEach(variavel => {
        valoresPorVariavel[variavel] = new Set();
      });

      setProgresso('A buscar escolas...');
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);

      let escolaIndex = 0;
      for (const schoolDoc of schoolsSnapshot.docs) {
        escolaIndex++;
        const escolaId = schoolDoc.id;
        const escolaData = schoolDoc.data();

        setProgresso(`A processar escola ${escolaIndex}/${schoolsSnapshot.size}: ${escolaData.name || escolaId}`);

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        let alunoIndex = 0;
        for (const studentDoc of studentsSnapshot.docs) {
          alunoIndex++;
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();

          // Verificar pagamentos no array do documento do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento) => {
              if (pagamento && typeof pagamento === 'object' && !Array.isArray(pagamento)) {
                variaveisSelecionadas.forEach(variavel => {
                  if (pagamento[variavel] !== null && pagamento[variavel] !== undefined) {
                    const valorFormatado = formatarValor(pagamento[variavel]);
                    valoresPorVariavel[variavel].add(valorFormatado);
                  }
                });
              }
            });
          }

          // Verificar pagamentos na subcoleção 'pagamentos'
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);

            pagamentosSnapshot.forEach((pagamentoDoc) => {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && typeof pagamentoData === 'object' && !Array.isArray(pagamentoData)) {
                variaveisSelecionadas.forEach(variavel => {
                  if (pagamentoData[variavel] !== null && pagamentoData[variavel] !== undefined) {
                    const valorFormatado = formatarValor(pagamentoData[variavel]);
                    valoresPorVariavel[variavel].add(valorFormatado);
                  }
                });
              }
            });
          } catch (err) {
            // Ignorar erros de subcoleção
          }
        }
      }

      // Converter Sets para Arrays ordenados
      const valoresUnicosFormatados = {};
      variaveisSelecionadas.forEach(variavel => {
        valoresUnicosFormatados[variavel] = Array.from(valoresPorVariavel[variavel]).sort();
      });

      setValoresUnicos(valoresUnicosFormatados);
      setProgresso('Concluído!');
    } catch (error) {
      console.error('Erro ao extrair valores únicos:', error);
      setErro(`Erro ao extrair valores únicos: ${error.message}`);
    } finally {
      setCarregandoValores(false);
    }
  };

  // Toggle seleção de variável
  const toggleVariavelSelecionada = (variavel) => {
    setVariaveisSelecionadas(prev => {
      if (prev.includes(variavel)) {
        return prev.filter(v => v !== variavel);
      } else {
        return [...prev, variavel];
      }
    });
  };

  // Limpar valores únicos quando o resultado mudar
  useEffect(() => {
    if (resultado) {
      // Filtrar variáveis selecionadas que não existem mais no resultado
      setVariaveisSelecionadas(prev => 
        prev.filter(v => resultado.variaveis.includes(v))
      );
    } else {
      // Limpar tudo se não houver resultado
      setVariaveisSelecionadas([]);
      setValoresUnicos({});
    }
  }, [resultado]);

  const handlePreviewRenomear = async () => {
    if (!variavelAntiga || !variavelNova || variavelAntiga === variavelNova) {
      setErro('Por favor, preencha ambos os campos com valores diferentes.');
      return;
    }

    setErro('');
    setPreviewRenomear(null);
    setProgresso('A analisar alterações...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);

      let totalEscolas = 0;
      let totalAlunos = 0;
      let totalDocumentos = 0;
      const escolasAfetadas = [];

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        const escolaData = schoolDoc.data();
        let alunosAfetados = 0;
        let documentosEscola = 0;

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let alunoAfetado = false;

          // Verificar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            const temVariavel = alunoData.pagamentos.some(pagamento => 
              pagamento && typeof pagamento === 'object' && variavelAntiga in pagamento
            );
            if (temVariavel) {
              alunoAfetado = true;
              documentosEscola++;
            }
          }

          // Verificar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);
            
            pagamentosSnapshot.forEach((pagamentoDoc) => {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && variavelAntiga in pagamentoData) {
                alunoAfetado = true;
                documentosEscola++;
              }
            });
          } catch (err) {
            // Ignorar se subcoleção não existir
          }

          if (alunoAfetado) {
            alunosAfetados++;
          }
        }

        if (alunosAfetados > 0) {
          totalEscolas++;
          totalAlunos += alunosAfetados;
          totalDocumentos += documentosEscola;
          escolasAfetadas.push({
            escolaId,
            escolaNome: escolaData.name || escolaId,
            alunos: alunosAfetados,
            documentos: documentosEscola
          });
        }
      }

      setPreviewRenomear({
        totalEscolas,
        totalAlunos,
        totalDocumentos,
        escolasAfetadas
      });
      setProgresso('');
    } catch (error) {
      console.error('Erro ao fazer preview:', error);
      setErro(`Erro ao analisar: ${error.message}`);
      setProgresso('');
    }
  };

  const handleRenomear = async () => {
    if (!variavelAntiga || !variavelNova || variavelAntiga === variavelNova) {
      return;
    }

    if (!window.confirm(`Tem certeza que deseja renomear "${variavelAntiga}" para "${variavelNova}" em ${previewRenomear.totalDocumentos} documento(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setRenomeando(true);
    setErro('');
    setProgresso('A renomear variáveis...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);
      let batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500; // Limite do Firestore
      let totalAtualizados = 0;

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        setProgresso(`A processar escola: ${schoolDoc.data().name || escolaId}...`);

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let precisaAtualizar = false;
          const novosPagamentos = [];

          // Atualizar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento) => {
              if (pagamento && typeof pagamento === 'object' && variavelAntiga in pagamento) {
                const novoPagamento = { ...pagamento };
                novoPagamento[variavelNova] = novoPagamento[variavelAntiga];
                delete novoPagamento[variavelAntiga];
                novosPagamentos.push(novoPagamento);
                precisaAtualizar = true;
              } else {
                novosPagamentos.push(pagamento);
              }
            });

            if (precisaAtualizar) {
              const alunoRef = doc(db, 'schools', escolaId, 'students', alunoId);
              batch.update(alunoRef, { pagamentos: novosPagamentos, updatedAt: Timestamp.now() });
              batchCount++;
              totalAtualizados++;

              if (batchCount >= maxBatchSize) {
                await batch.commit();
                batch = writeBatch(db); // Criar novo batch
                batchCount = 0;
              }
            }
          }

          // Atualizar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);

            for (const pagamentoDoc of pagamentosSnapshot.docs) {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && variavelAntiga in pagamentoData) {
                const novoPagamento = { ...pagamentoData };
                novoPagamento[variavelNova] = novoPagamento[variavelAntiga];
                delete novoPagamento[variavelAntiga];

                const pagamentoRef = doc(db, 'schools', escolaId, 'students', alunoId, 'pagamentos', pagamentoDoc.id);
                batch.update(pagamentoRef, novoPagamento);
                batchCount++;
                totalAtualizados++;

                if (batchCount >= maxBatchSize) {
                  await batch.commit();
                  batchCount = 0;
                }
              }
            }
          } catch (err) {
            console.log(`Subcoleção não existe para aluno ${alunoId}`);
          }
        }
      }

      // Commit do batch final
      if (batchCount > 0) {
        await batch.commit();
      }

      setProgresso(`Concluído! ${totalAtualizados} documento(s) atualizado(s).`);
      setErro('');
      
      // Limpar formulário e fechar modal após 2 segundos
      setTimeout(() => {
        setShowRenomear(false);
        setVariavelAntiga('');
        setVariavelNova('');
        setPreviewRenomear(null);
        setProgresso('');
        // Recarregar extração se houver resultado
        if (resultado) {
          handleExtrair();
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao renomear:', error);
      setErro(`Erro ao renomear variável: ${error.message}`);
      setProgresso('');
    } finally {
      setRenomeando(false);
    }
  };

  const compararValores = (valor1, valor2) => {
    // Se ambos são null ou undefined
    if ((valor1 === null || valor1 === undefined) && (valor2 === null || valor2 === undefined)) {
      return true;
    }

    // Se um é null/undefined e o outro não
    if (valor1 === null || valor1 === undefined || valor2 === null || valor2 === undefined) {
      return false;
    }

    // Comparar Timestamps do Firestore
    if (valor1.toDate && typeof valor1.toDate === 'function' && valor2.toDate && typeof valor2.toDate === 'function') {
      return valor1.toDate().getTime() === valor2.toDate().getTime();
    }

    if (valor1.seconds && valor2.seconds) {
      return valor1.seconds === valor2.seconds && (valor1.nanoseconds || 0) === (valor2.nanoseconds || 0);
    }

    // Comparar objetos
    if (typeof valor1 === 'object' && typeof valor2 === 'object') {
      return JSON.stringify(valor1) === JSON.stringify(valor2);
    }

    // Comparação simples
    return String(valor1) === String(valor2);
  };

  const handlePreviewRemover = async () => {
    if (!variavel1 || !variavel2 || variavel1 === variavel2) {
      setErro('Por favor, preencha ambos os campos com valores diferentes.');
      return;
    }

    setErro('');
    setPreviewRemover(null);
    setProgresso('A analisar variáveis...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);

      let totalEscolas = 0;
      let totalAlunos = 0;
      let totalDocumentos = 0;
      let valoresIguais = 0;
      let valoresDiferentes = 0;
      const escolasAfetadas = [];

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        const escolaData = schoolDoc.data();
        let alunosAfetados = 0;
        let documentosEscola = 0;
        let iguaisEscola = 0;
        let diferentesEscola = 0;

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let alunoAfetado = false;

          // Verificar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento) => {
              if (pagamento && typeof pagamento === 'object' && variavel1 in pagamento && variavel2 in pagamento) {
                alunoAfetado = true;
                documentosEscola++;
                if (compararValores(pagamento[variavel1], pagamento[variavel2])) {
                  iguaisEscola++;
                } else {
                  diferentesEscola++;
                }
              }
            });
          }

          // Verificar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);
            
            pagamentosSnapshot.forEach((pagamentoDoc) => {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && variavel1 in pagamentoData && variavel2 in pagamentoData) {
                alunoAfetado = true;
                documentosEscola++;
                if (compararValores(pagamentoData[variavel1], pagamentoData[variavel2])) {
                  iguaisEscola++;
                } else {
                  diferentesEscola++;
                }
              }
            });
          } catch (err) {
            // Ignorar se subcoleção não existir
          }

          if (alunoAfetado) {
            alunosAfetados++;
          }
        }

        if (alunosAfetados > 0) {
          totalEscolas++;
          totalAlunos += alunosAfetados;
          totalDocumentos += documentosEscola;
          valoresIguais += iguaisEscola;
          valoresDiferentes += diferentesEscola;
          escolasAfetadas.push({
            escolaId,
            escolaNome: escolaData.name || escolaId,
            alunos: alunosAfetados,
            documentos: documentosEscola,
            iguais: iguaisEscola,
            diferentes: diferentesEscola
          });
        }
      }

      setPreviewRemover({
        totalEscolas,
        totalAlunos,
        totalDocumentos,
        valoresIguais,
        valoresDiferentes,
        escolasAfetadas
      });
      setProgresso('');
    } catch (error) {
      console.error('Erro ao fazer preview:', error);
      setErro(`Erro ao analisar: ${error.message}`);
      setProgresso('');
    }
  };

  const handleRemoverDuplicada = async () => {
    if (!variavel1 || !variavel2 || variavel1 === variavel2) {
      return;
    }

    if (!window.confirm(`Tem certeza que deseja remover "${variavel2}" quando os valores forem iguais a "${variavel1}" em ${previewRemover.valoresIguais} documento(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setRemovendo(true);
    setErro('');
    setProgresso('A remover variáveis duplicadas...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);
      let batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500;
      let totalAtualizados = 0;

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        setProgresso(`A processar escola: ${schoolDoc.data().name || escolaId}...`);

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let precisaAtualizar = false;
          const novosPagamentos = [];

          // Atualizar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento) => {
              if (pagamento && typeof pagamento === 'object' && variavel1 in pagamento && variavel2 in pagamento) {
                // Só remover se os valores forem iguais
                if (compararValores(pagamento[variavel1], pagamento[variavel2])) {
                  const novoPagamento = { ...pagamento };
                  delete novoPagamento[variavel2];
                  novosPagamentos.push(novoPagamento);
                  precisaAtualizar = true;
                } else {
                  // Manter como está se valores diferentes
                  novosPagamentos.push(pagamento);
                }
              } else {
                novosPagamentos.push(pagamento);
              }
            });

            if (precisaAtualizar) {
              const alunoRef = doc(db, 'schools', escolaId, 'students', alunoId);
              batch.update(alunoRef, { pagamentos: novosPagamentos, updatedAt: Timestamp.now() });
              batchCount++;
              totalAtualizados++;

              if (batchCount >= maxBatchSize) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
              }
            }
          }

          // Atualizar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);

            for (const pagamentoDoc of pagamentosSnapshot.docs) {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && variavel1 in pagamentoData && variavel2 in pagamentoData) {
                // Só remover se os valores forem iguais
                if (compararValores(pagamentoData[variavel1], pagamentoData[variavel2])) {
                  const novoPagamento = { ...pagamentoData };
                  delete novoPagamento[variavel2];

                  const pagamentoRef = doc(db, 'schools', escolaId, 'students', alunoId, 'pagamentos', pagamentoDoc.id);
                  batch.update(pagamentoRef, novoPagamento);
                  batchCount++;
                  totalAtualizados++;

                  if (batchCount >= maxBatchSize) {
                    await batch.commit();
                    batch = writeBatch(db);
                    batchCount = 0;
                  }
                }
              }
            }
          } catch (err) {
            console.log(`Subcoleção não existe para aluno ${alunoId}`);
          }
        }
      }

      // Commit do batch final
      if (batchCount > 0) {
        await batch.commit();
      }

      setProgresso(`Concluído! ${totalAtualizados} documento(s) atualizado(s).`);
      setErro('');
      
      // Limpar formulário e fechar modal após 2 segundos
      setTimeout(() => {
        setShowRemoverDuplicada(false);
        setVariavel1('');
        setVariavel2('');
        setPreviewRemover(null);
        setProgresso('');
        // Recarregar extração se houver resultado
        if (resultado) {
          handleExtrair();
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao remover duplicada:', error);
      setErro(`Erro ao remover variável duplicada: ${error.message}`);
      setProgresso('');
    } finally {
      setRemovendo(false);
    }
  };

  const removerNulls = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(item => removerNulls(item)).filter(item => item !== null && item !== undefined);
    }
    
    if (obj !== null && typeof obj === 'object') {
      const cleaned = {};
      for (const key in obj) {
        const value = obj[key];
        if (value !== null && value !== undefined) {
          const cleanedValue = removerNulls(value);
          if (cleanedValue !== null && cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  };

  const handlePreviewRemoverNull = async () => {
    setErro('');
    setPreviewRemoverNull(null);
    setProgresso('A analisar valores null...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);

      let totalEscolas = 0;
      let totalAlunos = 0;
      let totalDocumentos = 0;
      let totalNulls = 0;

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        const escolaData = schoolDoc.data();
        let alunosAfetados = 0;
        let documentosEscola = 0;
        let nullsEscola = 0;

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let alunoAfetado = false;
          let nullsAluno = 0;

          // Verificar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento) => {
              if (pagamento && typeof pagamento === 'object') {
                let temNull = false;
                Object.keys(pagamento).forEach(key => {
                  if (pagamento[key] === null || pagamento[key] === undefined) {
                    temNull = true;
                    nullsAluno++;
                  }
                });
                if (temNull) {
                  alunoAfetado = true;
                  documentosEscola++;
                }
              }
            });
          }

          // Verificar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);
            
            pagamentosSnapshot.forEach((pagamentoDoc) => {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && typeof pagamentoData === 'object') {
                let temNull = false;
                Object.keys(pagamentoData).forEach(key => {
                  if (pagamentoData[key] === null || pagamentoData[key] === undefined) {
                    temNull = true;
                    nullsAluno++;
                  }
                });
                if (temNull) {
                  alunoAfetado = true;
                  documentosEscola++;
                }
              }
            });
          } catch (err) {
            // Ignorar se subcoleção não existir
          }

          if (alunoAfetado) {
            alunosAfetados++;
            nullsEscola += nullsAluno;
          }
        }

        if (alunosAfetados > 0) {
          totalEscolas++;
          totalAlunos += alunosAfetados;
          totalDocumentos += documentosEscola;
          totalNulls += nullsEscola;
        }
      }

      setPreviewRemoverNull({
        totalEscolas,
        totalAlunos,
        totalDocumentos,
        totalNulls
      });
      setProgresso('');
    } catch (error) {
      console.error('Erro ao fazer preview:', error);
      setErro(`Erro ao analisar: ${error.message}`);
      setProgresso('');
    }
  };

  const handleRemoverNull = async () => {
    if (!window.confirm(`Tem certeza que deseja remover todos os valores null de ${previewRemoverNull.totalDocumentos} documento(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setRemovendoNull(true);
    setErro('');
    setProgresso('A remover valores null...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);
      let batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500;
      let totalAtualizados = 0;

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        setProgresso(`A processar escola: ${schoolDoc.data().name || escolaId}...`);

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let precisaAtualizar = false;
          const novosPagamentos = [];

          // Atualizar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento) => {
              if (pagamento && typeof pagamento === 'object') {
                const limpo = removerNulls(pagamento);
                // Verificar se houve mudanças
                const originalKeys = Object.keys(pagamento).length;
                const limpoKeys = Object.keys(limpo).length;
                if (originalKeys !== limpoKeys || JSON.stringify(pagamento) !== JSON.stringify(limpo)) {
                  precisaAtualizar = true;
                }
                novosPagamentos.push(limpo);
              } else {
                novosPagamentos.push(pagamento);
              }
            });

            if (precisaAtualizar) {
              const alunoRef = doc(db, 'schools', escolaId, 'students', alunoId);
              batch.update(alunoRef, { pagamentos: novosPagamentos, updatedAt: Timestamp.now() });
              batchCount++;
              totalAtualizados++;

              if (batchCount >= maxBatchSize) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
              }
            }
          }

          // Atualizar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);

            for (const pagamentoDoc of pagamentosSnapshot.docs) {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && typeof pagamentoData === 'object') {
                const limpo = removerNulls(pagamentoData);
                // Verificar se houve mudanças
                const originalKeys = Object.keys(pagamentoData).length;
                const limpoKeys = Object.keys(limpo).length;
                if (originalKeys !== limpoKeys || JSON.stringify(pagamentoData) !== JSON.stringify(limpo)) {
                  const pagamentoRef = doc(db, 'schools', escolaId, 'students', alunoId, 'pagamentos', pagamentoDoc.id);
                  batch.update(pagamentoRef, limpo);
                  batchCount++;
                  totalAtualizados++;

                  if (batchCount >= maxBatchSize) {
                    await batch.commit();
                    batch = writeBatch(db);
                    batchCount = 0;
                  }
                }
              }
            }
          } catch (err) {
            console.log(`Subcoleção não existe para aluno ${alunoId}`);
          }
        }
      }

      // Commit do batch final
      if (batchCount > 0) {
        await batch.commit();
      }

      setProgresso(`Concluído! ${totalAtualizados} documento(s) atualizado(s).`);
      setErro('');
      
      // Limpar formulário e fechar modal após 2 segundos
      setTimeout(() => {
        setShowRemoverNull(false);
        setPreviewRemoverNull(null);
        setProgresso('');
        // Recarregar extração se houver resultado
        if (resultado) {
          handleExtrair();
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao remover nulls:', error);
      setErro(`Erro ao remover valores null: ${error.message}`);
      setProgresso('');
    } finally {
      setRemovendoNull(false);
    }
  };

  const isTimestamp = (value) => {
    // Verificar se é um Timestamp do Firestore
    return value && 
           typeof value === 'object' && 
           'seconds' in value && 
           typeof value.seconds === 'number' &&
           ('nanoseconds' in value || !('toDate' in value));
  };

  const converterTimestampParaDate = (value) => {
    if (isTimestamp(value)) {
      return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000);
    }
    return value;
  };

  const converterDatasNoObjeto = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(item => converterDatasNoObjeto(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const converted = {};
      for (const key in obj) {
        const value = obj[key];
        if (isTimestamp(value)) {
          // Converter Timestamp para Date, mas depois vamos converter de volta para Timestamp ao guardar
          converted[key] = converterTimestampParaDate(value);
        } else if (value instanceof Date) {
          // Se já é Date, manter como Date (será convertido para Timestamp ao guardar)
          converted[key] = value;
        } else if (Array.isArray(value)) {
          converted[key] = converterDatasNoObjeto(value);
        } else if (value !== null && typeof value === 'object') {
          converted[key] = converterDatasNoObjeto(value);
        } else {
          converted[key] = value;
        }
      }
      return converted;
    }
    
    return obj;
  };

  // Converter objetos Date para Timestamp do Firestore antes de guardar
  const converterDateParaTimestamp = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(item => converterDateParaTimestamp(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const converted = {};
      for (const key in obj) {
        const value = obj[key];
        if (value instanceof Date) {
          // Converter Date para Timestamp do Firestore
          converted[key] = Timestamp.fromDate(value);
        } else if (Array.isArray(value)) {
          converted[key] = converterDateParaTimestamp(value);
        } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
          converted[key] = converterDateParaTimestamp(value);
        } else {
          converted[key] = value;
        }
      }
      return converted;
    }
    
    return obj;
  };

  const handlePreviewConverterDatas = async () => {
    setErro('');
    setPreviewConverterDatas(null);
    setProgresso('A analisar Timestamps...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);

      let totalEscolas = 0;
      let totalAlunos = 0;
      let totalDocumentos = 0;
      let totalTimestamps = 0;

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        const escolaData = schoolDoc.data();
        let alunosAfetados = 0;
        let documentosEscola = 0;
        let timestampsEscola = 0;

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let alunoAfetado = false;
          let timestampsAluno = 0;

          // Verificar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento) => {
              if (pagamento && typeof pagamento === 'object') {
                let temTimestamp = false;
                Object.keys(pagamento).forEach(key => {
                  if (isTimestamp(pagamento[key])) {
                    temTimestamp = true;
                    timestampsAluno++;
                  }
                });
                if (temTimestamp) {
                  alunoAfetado = true;
                  documentosEscola++;
                }
              }
            });
          }

          // Verificar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);
            
            pagamentosSnapshot.forEach((pagamentoDoc) => {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && typeof pagamentoData === 'object') {
                let temTimestamp = false;
                Object.keys(pagamentoData).forEach(key => {
                  if (isTimestamp(pagamentoData[key])) {
                    temTimestamp = true;
                    timestampsAluno++;
                  }
                });
                if (temTimestamp) {
                  alunoAfetado = true;
                  documentosEscola++;
                }
              }
            });
          } catch (err) {
            // Ignorar se subcoleção não existir
          }

          if (alunoAfetado) {
            alunosAfetados++;
            timestampsEscola += timestampsAluno;
          }
        }

        if (alunosAfetados > 0) {
          totalEscolas++;
          totalAlunos += alunosAfetados;
          totalDocumentos += documentosEscola;
          totalTimestamps += timestampsEscola;
        }
      }

      setPreviewConverterDatas({
        totalEscolas,
        totalAlunos,
        totalDocumentos,
        totalTimestamps
      });
      setProgresso('');
    } catch (error) {
      console.error('Erro ao fazer preview:', error);
      setErro(`Erro ao analisar: ${error.message}`);
      setProgresso('');
    }
  };

  const handleConverterDatas = async () => {
    if (!window.confirm(`Tem certeza que deseja converter ${previewConverterDatas.totalTimestamps} campo(s) Timestamp para Date em ${previewConverterDatas.totalDocumentos} documento(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setConvertendoDatas(true);
    setErro('');
    setProgresso('A converter Timestamps para Date...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);
      let batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500;
      let totalAtualizados = 0;

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        setProgresso(`A processar escola: ${schoolDoc.data().name || escolaId}...`);

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let precisaAtualizar = false;
          const novosPagamentos = [];

          // Atualizar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento) => {
              if (pagamento && typeof pagamento === 'object') {
                const convertido = converterDatasNoObjeto(pagamento);
                // Verificar se houve mudanças
                const temTimestamp = Object.keys(pagamento).some(key => isTimestamp(pagamento[key]));
                if (temTimestamp) {
                  precisaAtualizar = true;
                }
                novosPagamentos.push(convertido);
              } else {
                novosPagamentos.push(pagamento);
              }
            });

            if (precisaAtualizar) {
              const alunoRef = doc(db, 'schools', escolaId, 'students', alunoId);
              batch.update(alunoRef, { pagamentos: novosPagamentos, updatedAt: Timestamp.now() });
              batchCount++;
              totalAtualizados++;

              if (batchCount >= maxBatchSize) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
              }
            }
          }

          // Atualizar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);

            for (const pagamentoDoc of pagamentosSnapshot.docs) {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && typeof pagamentoData === 'object') {
                const temTimestamp = Object.keys(pagamentoData).some(key => isTimestamp(pagamentoData[key]));
                if (temTimestamp) {
                  const convertido = converterDatasNoObjeto(pagamentoData);
                  const pagamentoRef = doc(db, 'schools', escolaId, 'students', alunoId, 'pagamentos', pagamentoDoc.id);
                  batch.update(pagamentoRef, convertido);
                  batchCount++;
                  totalAtualizados++;

                  if (batchCount >= maxBatchSize) {
                    await batch.commit();
                    batch = writeBatch(db);
                    batchCount = 0;
                  }
                }
              }
            }
          } catch (err) {
            console.log(`Subcoleção não existe para aluno ${alunoId}`);
          }
        }
      }

      // Commit do batch final
      if (batchCount > 0) {
        await batch.commit();
      }

      setProgresso(`Concluído! ${totalAtualizados} documento(s) atualizado(s).`);
      setErro('');
      
      // Limpar formulário e fechar modal após 2 segundos
      setTimeout(() => {
        setShowConverterDatas(false);
        setPreviewConverterDatas(null);
        setProgresso('');
        // Recarregar extração se houver resultado
        if (resultado) {
          handleExtrair();
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao converter datas:', error);
      setErro(`Erro ao converter datas: ${error.message}`);
      setProgresso('');
    } finally {
      setConvertendoDatas(false);
    }
  };

  const handlePreviewNormalizar = async () => {
    // Validar grupos
    const gruposInvalidos = gruposNormalizacao.filter(g => !g.nomePadrao || g.variaveis.length === 0);
    if (gruposInvalidos.length > 0) {
      setErro('Por favor, defina o nome padrão e adicione variáveis a todos os grupos.');
      return;
    }

    setErro('');
    setPreviewNormalizar(null);
    setConflitos([]);
    setProgresso('A analisar normalização...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);

      const escolasAfetadas = new Set();
      const alunosAfetados = new Set();
      let totalDocumentos = 0;
      let totalRenomeacoes = 0;
      let totalDuplicadas = 0;
      const conflitosEncontrados = [];
      let conflitoIdCounter = 0;

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        setProgresso(`A analisar escola: ${schoolDoc.data().name || escolaId}...`);

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let alunoTemMudancas = false;

          // Verificar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento, index) => {
              if (pagamento && typeof pagamento === 'object') {
                let pagamentoTemMudancas = false;
                gruposNormalizacao.forEach(grupo => {
                  // Encontrar quais variáveis do grupo existem neste pagamento
                  const variaveisPresentes = grupo.variaveis.filter(v => v in pagamento && pagamento[v] !== null && pagamento[v] !== undefined);
                  
                  if (variaveisPresentes.length === 0) {
                    return; // Nenhuma variável do grupo presente
                  }

                  if (variaveisPresentes.length === 1) {
                    // Apenas uma variável → renomear
                    totalRenomeacoes++;
                    pagamentoTemMudancas = true;
                    alunoTemMudancas = true;
                  } else if (variaveisPresentes.length > 1) {
                    // Múltiplas variáveis → verificar se valores são iguais
                    const valores = variaveisPresentes.map(v => pagamento[v]);
                    const todosIguais = valores.every((val, i) => compararValores(val, valores[0]));
                    
                    if (todosIguais) {
                      // Valores iguais → remover duplicadas
                      totalDuplicadas += variaveisPresentes.length - 1;
                      totalRenomeacoes++;
                      pagamentoTemMudancas = true;
                      alunoTemMudancas = true;
                    } else {
                      // Valores diferentes → CONFLITO
                      const conflitoId = `conf_${conflitoIdCounter++}`;
                      conflitosEncontrados.push({
                        id: conflitoId,
                        escolaId,
                        escolaNome: schoolDoc.data().name || escolaId,
                        alunoId,
                        alunoNome: alunoData.name || alunoId,
                        documentoId: `array_${index}`,
                        tipo: 'array',
                        grupo: grupo.nomePadrao,
                        variaveis: variaveisPresentes.map(v => ({
                          nome: v,
                          valor: pagamento[v]
                        }))
                      });
                      pagamentoTemMudancas = true;
                      alunoTemMudancas = true;
                    }
                  }
                });
                
                if (pagamentoTemMudancas) {
                  totalDocumentos++;
                }
              }
            });
          }

          // Verificar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);

            pagamentosSnapshot.forEach((pagamentoDoc) => {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && typeof pagamentoData === 'object') {
                let pagamentoTemMudancas = false;
                gruposNormalizacao.forEach(grupo => {
                  const variaveisPresentes = grupo.variaveis.filter(v => v in pagamentoData && pagamentoData[v] !== null && pagamentoData[v] !== undefined);
                  
                  if (variaveisPresentes.length === 0) return;

                  if (variaveisPresentes.length === 1) {
                    totalRenomeacoes++;
                    pagamentoTemMudancas = true;
                    alunoTemMudancas = true;
                  } else if (variaveisPresentes.length > 1) {
                    const valores = variaveisPresentes.map(v => pagamentoData[v]);
                    const todosIguais = valores.every((val, i) => compararValores(val, valores[0]));
                    
                    if (todosIguais) {
                      totalDuplicadas += variaveisPresentes.length - 1;
                      totalRenomeacoes++;
                      pagamentoTemMudancas = true;
                      alunoTemMudancas = true;
                    } else {
                      const conflitoId = `conf_${conflitoIdCounter++}`;
                      conflitosEncontrados.push({
                        id: conflitoId,
                        escolaId,
                        escolaNome: schoolDoc.data().name || escolaId,
                        alunoId,
                        alunoNome: alunoData.name || alunoId,
                        documentoId: pagamentoDoc.id,
                        tipo: 'subcollection',
                        grupo: grupo.nomePadrao,
                        variaveis: variaveisPresentes.map(v => ({
                          nome: v,
                          valor: pagamentoData[v]
                        }))
                      });
                      pagamentoTemMudancas = true;
                      alunoTemMudancas = true;
                    }
                  }
                });
                
                if (pagamentoTemMudancas) {
                  totalDocumentos++;
                }
              }
            });
          } catch (err) {
            // Ignorar se subcoleção não existir
          }
          
          if (alunoTemMudancas) {
            escolasAfetadas.add(escolaId);
            alunosAfetados.add(`${escolaId}_${alunoId}`);
          }
        }
      }

      setConflitos(conflitosEncontrados);
      setPreviewNormalizar({
        totalEscolas: escolasAfetadas.size,
        totalAlunos: alunosAfetados.size,
        totalDocumentos,
        totalRenomeacoes,
        totalDuplicadas,
        totalConflitos: conflitosEncontrados.length
      });
      setProgresso('');
    } catch (error) {
      console.error('Erro ao fazer preview:', error);
      setErro(`Erro ao analisar: ${error.message}`);
      setProgresso('');
    }
  };

  const handleNormalizar = async () => {
    if (!previewNormalizar || conflitos.length > 0 && Object.keys(resolucoesConflitos).length < conflitos.length) {
      setErro('Por favor, resolva todos os conflitos antes de continuar.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja normalizar ${previewNormalizar.totalDocumentos} documento(s)? Esta ação não pode ser desfeita!`)) {
      return;
    }

    setNormalizando(true);
    setErro('');
    setProgresso('A normalizar pagamentos...');

    try {
      const schoolsRef = collection(db, 'schools');
      const schoolsSnapshot = await getDocs(schoolsRef);
      let batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500;
      let totalAtualizados = 0;

      // Criar mapa de conflitos para acesso rápido
      const conflitosMap = {};
      conflitos.forEach(c => {
        const key = `${c.escolaId}_${c.alunoId}_${c.documentoId}_${c.grupo}`;
        conflitosMap[key] = c;
      });

      for (const schoolDoc of schoolsSnapshot.docs) {
        const escolaId = schoolDoc.id;
        setProgresso(`A processar escola: ${schoolDoc.data().name || escolaId}...`);

        const studentsRef = collection(db, 'schools', escolaId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);

        for (const studentDoc of studentsSnapshot.docs) {
          const alunoId = studentDoc.id;
          const alunoData = studentDoc.data();
          let precisaAtualizar = false;
          const novosPagamentos = [];

          // Normalizar no array do aluno
          if (alunoData.pagamentos && Array.isArray(alunoData.pagamentos)) {
            alunoData.pagamentos.forEach((pagamento, index) => {
              if (pagamento && typeof pagamento === 'object') {
                let normalizado = { ...pagamento };
                
                // Converter Timestamps para Date (temporariamente)
                normalizado = converterDatasNoObjeto(normalizado);
                
                // Aplicar normalização por grupo
                gruposNormalizacao.forEach(grupo => {
                  const variaveisPresentes = grupo.variaveis.filter(v => v in normalizado && normalizado[v] !== null && normalizado[v] !== undefined);
                  
                  if (variaveisPresentes.length === 0) return;

                  if (variaveisPresentes.length === 1) {
                    // Apenas uma variável → renomear
                    const variavelAntiga = variaveisPresentes[0];
                    if (variavelAntiga !== grupo.nomePadrao) {
                      normalizado[grupo.nomePadrao] = normalizado[variavelAntiga];
                      delete normalizado[variavelAntiga];
                    }
                  } else {
                    // Múltiplas variáveis
                    const valores = variaveisPresentes.map(v => normalizado[v]);
                    const todosIguais = valores.every((val, i) => compararValores(val, valores[0]));
                    
                    if (todosIguais) {
                      // Valores iguais → remover duplicadas e manter nome padrão
                      normalizado[grupo.nomePadrao] = normalizado[variaveisPresentes[0]];
                      variaveisPresentes.forEach(v => delete normalizado[v]);
                    } else {
                      // Valores diferentes → usar resolução de conflito
                      const conflitoKey = `${escolaId}_${alunoId}_array_${index}_${grupo.nomePadrao}`;
                      const conflito = conflitosMap[conflitoKey];
                      if (conflito && resolucoesConflitos[conflito.id]) {
                        const resolucao = resolucoesConflitos[conflito.id];
                        if (resolucao.acao === 'manter' && resolucao.variavel) {
                          normalizado[grupo.nomePadrao] = normalizado[resolucao.variavel];
                          variaveisPresentes.forEach(v => delete normalizado[v]);
                        }
                      }
                    }
                  }
                });
                
                // Remover nulls
                normalizado = removerNulls(normalizado);
                
                // Converter Date de volta para Timestamp do Firestore antes de guardar
                normalizado = converterDateParaTimestamp(normalizado);
                
                // Verificar se houve mudanças
                const originalStr = JSON.stringify(pagamento);
                const normalizadoStr = JSON.stringify(normalizado);
                if (originalStr !== normalizadoStr) {
                  precisaAtualizar = true;
                }
                
                novosPagamentos.push(normalizado);
              } else {
                novosPagamentos.push(pagamento);
              }
            });

            if (precisaAtualizar) {
              const alunoRef = doc(db, 'schools', escolaId, 'students', alunoId);
              batch.update(alunoRef, { pagamentos: novosPagamentos, updatedAt: Timestamp.now() });
              batchCount++;
              totalAtualizados++;

              if (batchCount >= maxBatchSize) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
              }
            }
          }

          // Normalizar na subcoleção
          try {
            const pagamentosRef = collection(db, 'schools', escolaId, 'students', alunoId, 'pagamentos');
            const pagamentosSnapshot = await getDocs(pagamentosRef);

            for (const pagamentoDoc of pagamentosSnapshot.docs) {
              const pagamentoData = pagamentoDoc.data();
              if (pagamentoData && typeof pagamentoData === 'object') {
                let normalizado = { ...pagamentoData };
                
                // Converter Timestamps
                normalizado = converterDatasNoObjeto(normalizado);
                
                // Aplicar normalização por grupo
                gruposNormalizacao.forEach(grupo => {
                  const variaveisPresentes = grupo.variaveis.filter(v => v in normalizado && normalizado[v] !== null && normalizado[v] !== undefined);
                  
                  if (variaveisPresentes.length === 0) return;

                  if (variaveisPresentes.length === 1) {
                    const variavelAntiga = variaveisPresentes[0];
                    if (variavelAntiga !== grupo.nomePadrao) {
                      normalizado[grupo.nomePadrao] = normalizado[variavelAntiga];
                      delete normalizado[variavelAntiga];
                    }
                  } else {
                    const valores = variaveisPresentes.map(v => normalizado[v]);
                    const todosIguais = valores.every((val, i) => compararValores(val, valores[0]));
                    
                    if (todosIguais) {
                      normalizado[grupo.nomePadrao] = normalizado[variaveisPresentes[0]];
                      variaveisPresentes.forEach(v => delete normalizado[v]);
                    } else {
                      const conflitoKey = `${escolaId}_${alunoId}_${pagamentoDoc.id}_${grupo.nomePadrao}`;
                      const conflito = conflitosMap[conflitoKey];
                      if (conflito && resolucoesConflitos[conflito.id]) {
                        const resolucao = resolucoesConflitos[conflito.id];
                        if (resolucao.acao === 'manter' && resolucao.variavel) {
                          normalizado[grupo.nomePadrao] = normalizado[resolucao.variavel];
                          variaveisPresentes.forEach(v => delete normalizado[v]);
                        }
                      }
                    }
                  }
                });
                
                normalizado = removerNulls(normalizado);
                
                // Converter Date de volta para Timestamp do Firestore antes de guardar
                normalizado = converterDateParaTimestamp(normalizado);
                
                const originalStr = JSON.stringify(pagamentoData);
                const normalizadoStr = JSON.stringify(normalizado);
                if (originalStr !== normalizadoStr) {
                  const pagamentoRef = doc(db, 'schools', escolaId, 'students', alunoId, 'pagamentos', pagamentoDoc.id);
                  batch.update(pagamentoRef, normalizado);
                  batchCount++;
                  totalAtualizados++;

                  if (batchCount >= maxBatchSize) {
                    await batch.commit();
                    batch = writeBatch(db);
                    batchCount = 0;
                  }
                }
              }
            }
          } catch (err) {
            console.log(`Subcoleção não existe para aluno ${alunoId}`);
          }
        }
      }

      // Commit do batch final
      if (batchCount > 0) {
        await batch.commit();
      }

      setProgresso(`Concluído! ${totalAtualizados} documento(s) normalizado(s).`);
      setErro('');
      
      // Limpar e recarregar
      setTimeout(() => {
        setShowNormalizar(false);
        setPreviewNormalizar(null);
        setGruposNormalizacao([]);
        setConflitos([]);
        setResolucoesConflitos({});
        setProgresso('');
        // Recarregar extração
        if (resultado) {
          handleExtrair();
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao normalizar:', error);
      setErro(`Erro ao normalizar: ${error.message}`);
      setProgresso('');
    } finally {
      setNormalizando(false);
    }
  };

  return (
    <div className="extrair-variaveis-page">
      <button className="extrair-back-button" onClick={() => navigate('/')}>
        ← Voltar
      </button>

      <div className="extrair-header">
        <h1>🔍 Extrair Variáveis de Pagamentos</h1>
        <p>Analisa todos os alunos e pagamentos para descobrir todas as variáveis existentes na base de dados</p>
      </div>

      <div className="extrair-actions">
        <button
          className="extrair-btn-primary"
          onClick={handleExtrair}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="extrair-spinner"></div>
              A processar...
            </>
          ) : (
            '🚀 Iniciar Extração'
          )}
        </button>
        <button
          className="extrair-btn-secondary"
          onClick={() => setShowRenomear(true)}
          disabled={loading}
        >
          🔄 Renomear Variável
        </button>
        <button
          className="extrair-btn-tertiary"
          onClick={() => setShowRemoverDuplicada(true)}
          disabled={loading}
        >
          🗑️ Remover Duplicada
        </button>
        <button
          className="extrair-btn-quaternary"
          onClick={() => setShowRemoverNull(true)}
          disabled={loading}
        >
          🧹 Remover Null
        </button>
        <button
          className="extrair-btn-quinary"
          onClick={() => setShowConverterDatas(true)}
          disabled={loading}
        >
          📅 Converter Datas
        </button>
        <button
          className="extrair-btn-normalize"
          onClick={() => setShowNormalizar(true)}
          disabled={loading}
        >
          🔧 Normalizar Tudo
        </button>
      </div>

      {erro && (
        <div className="extrair-error">
          {erro}
        </div>
      )}

      {loading && progresso && (
        <div className="extrair-progresso">
          {progresso}
        </div>
      )}

      {resultado && (
        <div className="extrair-resultados">
          <div className="resultado-header">
            <h2>📊 Resultados da Extração</h2>
            <div className="resultado-stats">
              <div className="stat-item">
                <span className="stat-label">Escolas analisadas:</span>
                <span className="stat-value">{resultado.totalEscolas}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Variáveis únicas encontradas:</span>
                <span className="stat-value">{resultado.totalVariaveis}</span>
              </div>
            </div>
          </div>

          <div className="resultado-section">
            <h3>🌍 Variáveis Globais (Todas as Escolas)</h3>
            <div className="variaveis-lista">
              {resultado.variaveis.map((variavel, index) => {
                const exemplo = resultado.exemplos[variavel];
                const contagem = resultado.contador[variavel];
                return (
                  <div key={variavel} className="variavel-item">
                    <div className="variavel-header">
                      <span className="variavel-numero">{index + 1}.</span>
                      <span className="variavel-nome">{variavel}</span>
                      <span className="variavel-badge tipo">{exemplo?.tipo || 'desconhecido'}</span>
                      <span className="variavel-badge contagem">{contagem} ocorrência(s)</span>
                    </div>
                    <div className="variavel-detalhes">
                      <div className="detalhe-item">
                        <strong>Exemplo de valor:</strong>
                        <code>{formatarValor(exemplo?.valor)}</code>
                      </div>
                      {exemplo?.aluno && (
                        <div className="detalhe-item">
                          <strong>Encontrado em:</strong>
                          <span>{exemplo.aluno}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="resultado-section">
            <h3>🏫 Resultados por Escola</h3>
            {resultado.resultadosPorEscola.map((escola, idx) => (
              <div key={escola.escolaId} className="escola-resultado">
                <h4>
                  {escola.escolaNome} 
                  <span className="escola-id">({escola.escolaId})</span>
                </h4>
                <div className="escola-stats">
                  <span>Alunos: {escola.totalAlunos}</span>
                  <span>Variáveis: {escola.totalVariaveis}</span>
                </div>
                <div className="escola-variaveis">
                  {escola.variaveis.map((variavel, vIdx) => (
                    <span key={vIdx} className="variavel-tag">
                      {variavel} ({escola.contador[variavel]})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="resultado-section">
            <h3>📋 Lista Simples de Todas as Variáveis</h3>
            <div className="lista-simples">
              {resultado.variaveis.map((variavel, index) => (
                <span key={index} className="variavel-simples">
                  {variavel}
                  {index < resultado.variaveis.length - 1 && ', '}
                </span>
              ))}
            </div>
          </div>

          {/* Seção de Seleção de Variáveis e Valores Únicos */}
          <div className="resultado-section valores-unicos-section">
            <h3>🔍 Extrair Valores Únicos das Variáveis</h3>
            <p className="section-description">
              Selecione as variáveis para ver todos os valores únicos que contêm na base de dados.
            </p>
            
            <div className="variaveis-selecao">
              <div className="selecao-header">
                <h4>Selecionar Variáveis:</h4>
                <div className="selecao-actions">
                  <button
                    className="extrair-btn-small"
                    onClick={() => setVariaveisSelecionadas(resultado.variaveis)}
                    disabled={carregandoValores}
                  >
                    Selecionar Todas
                  </button>
                  <button
                    className="extrair-btn-small"
                    onClick={() => setVariaveisSelecionadas([])}
                    disabled={carregandoValores}
                  >
                    Desmarcar Todas
                  </button>
                  <button
                    className="extrair-btn-primary"
                    onClick={extrairValoresUnicos}
                    disabled={carregandoValores || variaveisSelecionadas.length === 0}
                  >
                    {carregandoValores ? (
                      <>
                        <div className="extrair-spinner"></div>
                        A extrair...
                      </>
                    ) : (
                      '📊 Extrair Valores Únicos'
                    )}
                  </button>
                </div>
              </div>
              
              <div className="variaveis-checkboxes">
                {resultado.variaveis.map((variavel) => (
                  <label key={variavel} className="variavel-checkbox-item">
                    <input
                      type="checkbox"
                      checked={variaveisSelecionadas.includes(variavel)}
                      onChange={() => toggleVariavelSelecionada(variavel)}
                      disabled={carregandoValores}
                    />
                    <span className="checkbox-label">
                      <code>{variavel}</code>
                      <span className="checkbox-count">({resultado.contador[variavel]} ocorrências)</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Exibir Valores Únicos */}
            {Object.keys(valoresUnicos).length > 0 && (
              <div className="valores-unicos-resultados">
                <h4>📊 Valores Únicos Encontrados:</h4>
                {Object.entries(valoresUnicos).map(([variavel, valores]) => (
                  <div key={variavel} className="valores-unicos-item">
                    <div className="valores-unicos-header">
                      <h5>
                        <code>{variavel}</code>
                        <span className="valores-count">({valores.length} valores únicos)</span>
                      </h5>
                    </div>
                    <div className="valores-lista">
                      {valores.map((valor, index) => (
                        <div key={index} className="valor-item">
                          <code>{valor}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Renomear Variável */}
      {showRenomear && (
        <div className="renomear-modal-overlay" onClick={() => !renomeando && setShowRenomear(false)}>
          <div className="renomear-modal" onClick={(e) => e.stopPropagation()}>
            <div className="renomear-modal-header">
              <h2>🔄 Renomear Variável</h2>
              <button 
                className="renomear-modal-close"
                onClick={() => !renomeando && setShowRenomear(false)}
                disabled={renomeando}
              >
                ×
              </button>
            </div>
            <div className="renomear-modal-body">
              <div className="renomear-form-group">
                <label htmlFor="variavelAntiga">Nome da Variável Antiga *</label>
                <input
                  type="text"
                  id="variavelAntiga"
                  value={variavelAntiga}
                  onChange={(e) => setVariavelAntiga(e.target.value)}
                  placeholder="Ex: date"
                  disabled={renomeando}
                  className="renomear-input"
                />
              </div>
              <div className="renomear-form-group">
                <label htmlFor="variavelNova">Nome da Variável Nova *</label>
                <input
                  type="text"
                  id="variavelNova"
                  value={variavelNova}
                  onChange={(e) => setVariavelNova(e.target.value)}
                  placeholder="Ex: data"
                  disabled={renomeando}
                  className="renomear-input"
                />
              </div>

              {erro && (
                <div className="renomear-error">{erro}</div>
              )}

              {previewRenomear && (
                <div className="renomear-preview">
                  <h3>📋 Preview da Alteração</h3>
                  <div className="preview-stats">
                    <div className="preview-stat">
                      <span>Escolas afetadas:</span>
                      <strong>{previewRenomear.totalEscolas}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Alunos afetados:</span>
                      <strong>{previewRenomear.totalAlunos}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Documentos a atualizar:</span>
                      <strong>{previewRenomear.totalDocumentos}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="renomear-actions">
                <button
                  type="button"
                  className="renomear-btn-secondary"
                  onClick={handlePreviewRenomear}
                  disabled={!variavelAntiga || !variavelNova || renomeando || variavelAntiga === variavelNova}
                >
                  👁️ Ver Preview
                </button>
                <button
                  type="button"
                  className="renomear-btn-primary"
                  onClick={handleRenomear}
                  disabled={!variavelAntiga || !variavelNova || renomeando || !previewRenomear || variavelAntiga === variavelNova}
                >
                  {renomeando ? (
                    <>
                      <div className="extrair-spinner"></div>
                      A renomear...
                    </>
                  ) : (
                    '✅ Confirmar Renomeação'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Remover Variável Duplicada */}
      {showRemoverDuplicada && (
        <div className="renomear-modal-overlay" onClick={() => !removendo && setShowRemoverDuplicada(false)}>
          <div className="renomear-modal" onClick={(e) => e.stopPropagation()}>
            <div className="renomear-modal-header">
              <h2>🗑️ Remover Variável Duplicada</h2>
              <button 
                className="renomear-modal-close"
                onClick={() => !removendo && setShowRemoverDuplicada(false)}
                disabled={removendo}
              >
                ×
              </button>
            </div>
            <div className="renomear-modal-body">
              <div className="renomear-info-box">
                <p>Esta ferramenta compara duas variáveis e remove uma delas se os valores forem iguais.</p>
                <p><strong>Exemplo:</strong> Se "date" e "data" têm sempre o mesmo valor, remove uma delas.</p>
              </div>

              <div className="renomear-form-group">
                <label htmlFor="variavel1">Variável 1 (será mantida) *</label>
                <input
                  type="text"
                  id="variavel1"
                  value={variavel1}
                  onChange={(e) => setVariavel1(e.target.value)}
                  placeholder="Ex: data"
                  disabled={removendo}
                  className="renomear-input"
                />
              </div>
              <div className="renomear-form-group">
                <label htmlFor="variavel2">Variável 2 (será removida se valores iguais) *</label>
                <input
                  type="text"
                  id="variavel2"
                  value={variavel2}
                  onChange={(e) => setVariavel2(e.target.value)}
                  placeholder="Ex: date"
                  disabled={removendo}
                  className="renomear-input"
                />
              </div>

              {erro && (
                <div className="renomear-error">{erro}</div>
              )}

              {previewRemover && (
                <div className="renomear-preview">
                  <h3>📋 Preview da Remoção</h3>
                  <div className="preview-stats">
                    <div className="preview-stat">
                      <span>Escolas afetadas:</span>
                      <strong>{previewRemover.totalEscolas}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Alunos afetados:</span>
                      <strong>{previewRemover.totalAlunos}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Documentos a atualizar:</span>
                      <strong>{previewRemover.totalDocumentos}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Valores iguais encontrados:</span>
                      <strong>{previewRemover.valoresIguais}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Valores diferentes encontrados:</span>
                      <strong style={{ color: previewRemover.valoresDiferentes > 0 ? '#ef4444' : '#10b981' }}>
                        {previewRemover.valoresDiferentes}
                      </strong>
                    </div>
                  </div>
                  {previewRemover.valoresDiferentes > 0 && (
                    <div className="preview-warning">
                      ⚠️ Atenção: Foram encontrados {previewRemover.valoresDiferentes} documento(s) onde os valores são diferentes. 
                      Estes documentos não serão alterados.
                    </div>
                  )}
                </div>
              )}

              <div className="renomear-actions">
                <button
                  type="button"
                  className="renomear-btn-secondary"
                  onClick={handlePreviewRemover}
                  disabled={!variavel1 || !variavel2 || removendo || variavel1 === variavel2}
                >
                  👁️ Ver Preview
                </button>
                <button
                  type="button"
                  className="renomear-btn-primary"
                  onClick={handleRemoverDuplicada}
                  disabled={!variavel1 || !variavel2 || removendo || !previewRemover || variavel1 === variavel2 || previewRemover.valoresIguais === 0}
                >
                  {removendo ? (
                    <>
                      <div className="extrair-spinner"></div>
                      A remover...
                    </>
                  ) : (
                    '✅ Confirmar Remoção'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Remover Valores Null */}
      {showRemoverNull && (
        <div className="renomear-modal-overlay" onClick={() => !removendoNull && setShowRemoverNull(false)}>
          <div className="renomear-modal" onClick={(e) => e.stopPropagation()}>
            <div className="renomear-modal-header">
              <h2>🧹 Remover Valores Null</h2>
              <button 
                className="renomear-modal-close"
                onClick={() => !removendoNull && setShowRemoverNull(false)}
                disabled={removendoNull}
              >
                ×
              </button>
            </div>
            <div className="renomear-modal-body">
              <div className="renomear-info-box">
                <p>Esta ferramenta remove todos os campos com valores <code>null</code> ou <code>undefined</code> dos pagamentos.</p>
                <p><strong>Atenção:</strong> Esta ação limpará todos os campos vazios dos pagamentos em todas as escolas.</p>
              </div>

              {erro && (
                <div className="renomear-error">{erro}</div>
              )}

              {previewRemoverNull && (
                <div className="renomear-preview">
                  <h3>📋 Preview da Limpeza</h3>
                  <div className="preview-stats">
                    <div className="preview-stat">
                      <span>Escolas afetadas:</span>
                      <strong>{previewRemoverNull.totalEscolas}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Alunos afetados:</span>
                      <strong>{previewRemoverNull.totalAlunos}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Documentos a atualizar:</span>
                      <strong>{previewRemoverNull.totalDocumentos}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Campos null encontrados:</span>
                      <strong>{previewRemoverNull.totalNulls}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="renomear-actions">
                <button
                  type="button"
                  className="renomear-btn-secondary"
                  onClick={handlePreviewRemoverNull}
                  disabled={removendoNull}
                >
                  👁️ Ver Preview
                </button>
                <button
                  type="button"
                  className="renomear-btn-primary"
                  onClick={handleRemoverNull}
                  disabled={removendoNull || !previewRemoverNull || previewRemoverNull.totalNulls === 0}
                >
                  {removendoNull ? (
                    <>
                      <div className="extrair-spinner"></div>
                      A remover...
                    </>
                  ) : (
                    '✅ Confirmar Remoção'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Converter Datas */}
      {showConverterDatas && (
        <div className="renomear-modal-overlay" onClick={() => !convertendoDatas && setShowConverterDatas(false)}>
          <div className="renomear-modal" onClick={(e) => e.stopPropagation()}>
            <div className="renomear-modal-header">
              <h2>📅 Converter Datas (Timestamp → Date)</h2>
              <button 
                className="renomear-modal-close"
                onClick={() => !convertendoDatas && setShowConverterDatas(false)}
                disabled={convertendoDatas}
              >
                ×
              </button>
            </div>
            <div className="renomear-modal-body">
              <div className="renomear-info-box">
                <p>Esta ferramenta converte campos de data que estão como Timestamp do Firestore (<code>{'{seconds, nanoseconds}'}</code>) para objetos <code>Date</code> normais.</p>
                <p><strong>Problema:</strong> Quando guardas <code>new Date()</code> no Firestore, ele converte para Timestamp. Se depois leres e guardares novamente sem converter, fica como <code>{'{seconds, nanoseconds}'}</code>.</p>
                <p><strong>Solução:</strong> Esta ferramenta converte todos os campos Timestamp de volta para <code>Date</code>.</p>
              </div>

              {erro && (
                <div className="renomear-error">{erro}</div>
              )}

              {previewConverterDatas && (
                <div className="renomear-preview">
                  <h3>📋 Preview da Conversão</h3>
                  <div className="preview-stats">
                    <div className="preview-stat">
                      <span>Escolas afetadas:</span>
                      <strong>{previewConverterDatas.totalEscolas}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Alunos afetados:</span>
                      <strong>{previewConverterDatas.totalAlunos}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Documentos a atualizar:</span>
                      <strong>{previewConverterDatas.totalDocumentos}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Campos Timestamp encontrados:</span>
                      <strong>{previewConverterDatas.totalTimestamps}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="renomear-actions">
                <button
                  type="button"
                  className="renomear-btn-secondary"
                  onClick={handlePreviewConverterDatas}
                  disabled={convertendoDatas}
                >
                  👁️ Ver Preview
                </button>
                <button
                  type="button"
                  className="renomear-btn-primary"
                  onClick={handleConverterDatas}
                  disabled={convertendoDatas || !previewConverterDatas || previewConverterDatas.totalTimestamps === 0}
                >
                  {convertendoDatas ? (
                    <>
                      <div className="extrair-spinner"></div>
                      A converter...
                    </>
                  ) : (
                    '✅ Confirmar Conversão'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Normalização Completa */}
      {showNormalizar && (
        <div className="renomear-modal-overlay" onClick={() => !normalizando && setShowNormalizar(false)}>
          <div className="renomear-modal large-normalize" onClick={(e) => e.stopPropagation()}>
            <div className="renomear-modal-header">
              <h2>🔧 Normalização Completa de Pagamentos</h2>
              <button 
                className="renomear-modal-close"
                onClick={() => !normalizando && setShowNormalizar(false)}
                disabled={normalizando}
              >
                ×
              </button>
            </div>
            <div className="renomear-modal-body">
              <div className="renomear-info-box">
                <p><strong>Define grupos de variáveis que devem ser normalizadas para o mesmo nome padrão.</strong></p>
                <p><strong>Lógica:</strong></p>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  <li>Se houver apenas <strong>1 variável</strong> do grupo → renomeia para o nome padrão</li>
                  <li>Se houver <strong>múltiplas variáveis</strong> com <strong>valores iguais</strong> → remove duplicadas e mantém o nome padrão</li>
                  <li>Se houver <strong>múltiplas variáveis</strong> com <strong>valores diferentes</strong> → mostra conflito para decidir</li>
                </ul>
              </div>

              {!resultado && (
                <div className="renomear-warning">
                  ⚠️ Primeiro execute "Iniciar Extração" para ver todas as variáveis existentes.
                </div>
              )}

              {resultado && (
                <>
                  {/* Lista de todas as variáveis encontradas */}
                  <div className="all-variables-section">
                    <h3>📋 Todas as Variáveis Encontradas ({resultado.variaveis.length})</h3>
                    <div className="all-variables-list">
                      {resultado.variaveis.map((variavel) => (
                        <div key={variavel} className="all-variable-item">
                          <code className="variable-name">{variavel}</code>
                          <span className="variable-count">({resultado.contador[variavel]}x)</span>
                          {resultado.exemplos[variavel] && (
                            <span className="variable-example">
                              Exemplo: {typeof resultado.exemplos[variavel].valor === 'object' 
                                ? JSON.stringify(resultado.exemplos[variavel].valor).substring(0, 50) + '...'
                                : String(resultado.exemplos[variavel].valor).substring(0, 30)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="normalize-groups-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>📋 Grupos de Normalização</h3>
                    <button
                      type="button"
                      className="renomear-btn-secondary"
                      onClick={adicionarGrupoNormalizacao}
                      disabled={normalizando}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      + Adicionar Grupo
                    </button>
                  </div>

                  {gruposNormalizacao.length === 0 && (
                    <div className="renomear-warning" style={{ marginBottom: '1rem' }}>
                      Nenhum grupo criado. Clique em "Adicionar Grupo" para começar.
                    </div>
                  )}

                  {gruposNormalizacao.map((grupo) => (
                    <div key={grupo.id} className="normalize-group-card">
                      <div className="group-header">
                        <input
                          type="text"
                          value={grupo.nomePadrao}
                          onChange={(e) => atualizarNomePadrao(grupo.id, e.target.value)}
                          placeholder="Nome padrão (ex: value)"
                          className="group-nome-input"
                          disabled={normalizando}
                        />
                        <button
                          type="button"
                          onClick={() => removerGrupoNormalizacao(grupo.id)}
                          disabled={normalizando}
                          className="group-remove-btn"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="group-variables">
                        <div className="group-variables-list">
                          {grupo.variaveis.map((variavel) => (
                            <span key={variavel} className="variable-tag">
                              <code>{variavel}</code>
                              <button
                                type="button"
                                onClick={() => removerVariavelDoGrupo(grupo.id, variavel)}
                                disabled={normalizando}
                                className="variable-tag-remove"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              adicionarVariavelAoGrupo(grupo.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          disabled={normalizando}
                          className="group-add-variable-select"
                        >
                          <option value="">+ Adicionar variável...</option>
                          {resultado.variaveis
                            .filter(v => !grupo.variaveis.includes(v))
                            .map(v => (
                              <option key={v} value={v}>
                                {v} ({resultado.contador[v]}x)
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}

              {erro && (
                <div className="renomear-error">{erro}</div>
              )}

              {previewNormalizar && (
                <div className="renomear-preview">
                  <h3>📋 Preview da Normalização</h3>
                  <div className="preview-stats">
                    <div className="preview-stat">
                      <span>Documentos a atualizar:</span>
                      <strong>{previewNormalizar.totalDocumentos}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Variáveis a renomear:</span>
                      <strong>{previewNormalizar.totalRenomeacoes}</strong>
                    </div>
                    <div className="preview-stat">
                      <span>Duplicadas a remover:</span>
                      <strong>{previewNormalizar.totalDuplicadas}</strong>
                    </div>
                    {previewNormalizar.totalConflitos > 0 && (
                      <div className="preview-stat" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                        <span>⚠️ Conflitos encontrados:</span>
                        <strong>{previewNormalizar.totalConflitos}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {conflitos.length > 0 && (
                <div className="conflitos-section">
                  <h3>⚠️ Conflitos Encontrados</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                    Estes documentos têm múltiplas variáveis do mesmo grupo com valores diferentes. Escolha qual variável manter:
                  </p>
                  <div className="conflitos-list">
                    {conflitos.map((conflito) => {
                      const resolucao = resolucoesConflitos[conflito.id] || { acao: 'manter', variavel: '' };
                      return (
                        <div key={conflito.id} className="conflito-item">
                          <div className="conflito-header">
                            <strong>{conflito.alunoNome}</strong> ({conflito.escolaNome})
                          </div>
                          <div className="conflito-info">
                            Grupo: <code>{conflito.grupo}</code>
                          </div>
                          <div className="conflito-variables">
                            {conflito.variaveis.map((v) => (
                              <label key={v.nome} className="conflito-variable-option">
                                <input
                                  type="radio"
                                  name={`conflito_${conflito.id}`}
                                  checked={resolucao.variavel === v.nome}
                                  onChange={() => setResolucoesConflitos(prev => ({
                                    ...prev,
                                    [conflito.id]: { acao: 'manter', variavel: v.nome }
                                  }))}
                                  disabled={normalizando}
                                />
                                <code>{v.nome}</code>: <span className="conflito-value">{JSON.stringify(v.valor)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="renomear-actions">
                <button
                  type="button"
                  className="renomear-btn-secondary"
                  onClick={handlePreviewNormalizar}
                  disabled={normalizando || !resultado || gruposNormalizacao.length === 0}
                >
                  👁️ Ver Preview
                </button>
                <button
                  type="button"
                  className="renomear-btn-primary"
                  onClick={handleNormalizar}
                  disabled={normalizando || !previewNormalizar || !resultado || (conflitos.length > 0 && Object.keys(resolucoesConflitos).length < conflitos.length)}
                >
                  {normalizando ? (
                    <>
                      <div className="extrair-spinner"></div>
                      A normalizar...
                    </>
                  ) : (
                    '✅ Executar Normalização'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtrairVariaveisPagamentos;

