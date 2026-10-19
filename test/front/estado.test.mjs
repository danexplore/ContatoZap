import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  carregarPreferencias, iniciarEstado, obterEstado, atualizarEstado, aoMudar, visaoDoGrupo, atualizarVisao,
} from '../../public/js/estado.js';

// localStorage falso sobre um Map
function falso(inicial) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => { dados.set(k, String(v)); },
  };
}

test('carregarPreferencias sem nada salvo devolve os padrões', () => {
  const padrao = carregarPreferencias(falso({}));
  assert.equal(padrao.modo, 'lista'); assert.equal(padrao.tamanhoGrade, 'M'); assert.equal(padrao.tamanhoFotoExcel, 100);
  assert.equal(padrao.tema, 'light'); assert.equal(padrao.buscarFotos, false); assert.equal(padrao.sidebarRecolhida, false);
  assert.deepEqual(padrao.fixados, []); assert.deepEqual(padrao.recentes, []);
  assert.deepEqual(padrao.secoes, { fixados: true, todos: true });
});

test('carregarPreferencias ignora valor corrompido', () => {
  const ruim = carregarPreferencias(falso({
    contatozap_fixados: '{oi', contatozap_recentes: '"oi"', contatozap_secoes: '[1]',
    contatozap_modo: 'tabela', contatozap_tamanho_grade: 'XL', contatozap_tamanho_foto_excel: '9999',
    contatozap_theme: 'azul', contatozap_fetch_photos: 'talvez', contatozap_sidebar_recolhida: 'sim',
  }));
  assert.deepEqual(ruim.fixados, []); assert.deepEqual(ruim.recentes, []);
  assert.deepEqual(ruim.secoes, { fixados: true, todos: true }); assert.equal(ruim.modo, 'lista');
  assert.equal(ruim.tamanhoGrade, 'M'); assert.equal(ruim.tamanhoFotoExcel, 100);
  assert.equal(ruim.tema, 'light'); assert.equal(ruim.buscarFotos, false); assert.equal(ruim.sidebarRecolhida, false);
  for (const v of ['12.5', '19', '501', 'abc', '']) {
    assert.equal(carregarPreferencias(falso({ contatozap_tamanho_foto_excel: v })).tamanhoFotoExcel, 100, v);
  }
  assert.deepEqual(carregarPreferencias(falso({ contatozap_fixados: '"g1"' })).fixados, []);
  assert.deepEqual(carregarPreferencias(falso({ contatozap_secoes: 'null' })).secoes, { fixados: true, todos: true });
});

test('carregarPreferencias não quebra quando o armazenamento falha', () => {
  assert.doesNotThrow(() => carregarPreferencias({ getItem() { throw new Error('bloqueado'); } }));
  assert.equal(carregarPreferencias({ getItem() { throw new Error('bloqueado'); } }).modo, 'lista');
  assert.equal(carregarPreferencias(undefined).tamanhoGrade, 'M');
  assert.equal(carregarPreferencias(null).tamanhoGrade, 'M');
});

test('carregarPreferencias lê valores válidos', () => {
  const ok = carregarPreferencias(falso({
    contatozap_theme: 'dark', contatozap_fetch_photos: '1', contatozap_fixados: '["g1","g1",3,"g2"]',
    contatozap_recentes: JSON.stringify([{ id: 'g1', name: 'G1', usadoEm: 5 }, { id: 'g1', name: 'X' }]),
    contatozap_secoes: '{"fixados":false}', contatozap_sidebar_recolhida: '1', contatozap_modo: 'grade',
    contatozap_tamanho_grade: 'G', contatozap_tamanho_foto_excel: '60',
  }));
  assert.equal(ok.tema, 'dark'); assert.equal(ok.buscarFotos, true);
  assert.deepEqual(ok.fixados, ['g1', 'g2']);
  assert.deepEqual(ok.recentes, [{ id: 'g1', name: 'G1', usadoEm: 5 }]);
  assert.deepEqual(ok.secoes, { fixados: false, todos: true });
  assert.equal(ok.sidebarRecolhida, true); assert.equal(ok.modo, 'grade');
  assert.equal(ok.tamanhoGrade, 'G'); assert.equal(ok.tamanhoFotoExcel, 60);
});

test('tema padrão segue prefers-color-scheme quando há matchMedia', () => {
  globalThis.matchMedia = (q) => ({ matches: q === '(prefers-color-scheme: dark)' });
  try {
    assert.equal(carregarPreferencias(falso({})).tema, 'dark');
    assert.equal(carregarPreferencias(falso({ contatozap_theme: 'light' })).tema, 'light');
  } finally {
    delete globalThis.matchMedia;
  }
});

test('iniciarEstado monta o estado com os padrões do que não é persistido', () => {
  iniciarEstado(falso({ contatozap_modo: 'grade' }));
  const e = obterEstado();
  assert.equal(e.modo, 'grade');
  assert.deepEqual(e.conexao, { status: 'starting', groups: [] });
  assert.equal(e.abaAtiva, null); assert.equal(e.fichaAberta, null);
  assert.ok(e.grupos instanceof Map); assert.equal(e.grupos.size, 0);
  assert.ok(e.visoes instanceof Map); assert.ok(e.fotosGrupos instanceof Map);
  assert.ok(e.selecionados instanceof Set); assert.equal(e.selecionados.size, 0);
  assert.deepEqual(e.lote, { ativo: false, resultados: [] });
});

test('atualizarEstado persiste e avisa uma vez com as chaves do patch', () => {
  const arm = falso({}); iniciarEstado(arm); const vistos = []; aoMudar((_, c) => vistos.push(c));
  atualizarEstado({ modo: 'grade', abaAtiva: 'g1' });
  assert.equal(arm.getItem('contatozap_modo'), 'grade'); assert.deepEqual(vistos, [['modo', 'abaAtiva']]);
  atualizarEstado({ fixados: ['g1'] }); assert.equal(arm.getItem('contatozap_fixados'), '["g1"]');
  atualizarEstado({ buscarFotos: true, sidebarRecolhida: false, tamanhoFotoExcel: 60, tema: 'dark' });
  assert.equal(arm.getItem('contatozap_fetch_photos'), '1');
  assert.equal(arm.getItem('contatozap_sidebar_recolhida'), '0');
  assert.equal(arm.getItem('contatozap_tamanho_foto_excel'), '60');
  assert.equal(arm.getItem('contatozap_theme'), 'dark');
  atualizarEstado({ abaAtiva: 'g2' });
  assert.equal(arm.getItem('abaAtiva'), null, 'chave não persistida não vai para o armazenamento');
  assert.equal(obterEstado().abaAtiva, 'g2');
});

test('o que foi gravado é lido de volta igual', () => {
  const arm = falso({}); iniciarEstado(arm);
  const recentes = [{ id: 'g1', name: 'G1', usadoEm: 9 }];
  atualizarEstado({ recentes, secoes: { fixados: false, todos: true }, tamanhoGrade: 'P' });
  const lido = carregarPreferencias(arm);
  assert.deepEqual(lido.recentes, recentes);
  assert.deepEqual(lido.secoes, { fixados: false, todos: true });
  assert.equal(lido.tamanhoGrade, 'P');
});

test('atualizarEstado engole erro de setItem e ainda avisa', () => {
  iniciarEstado({ getItem: () => null, setItem() { throw new Error('cheio'); } });
  let avisos = 0; aoMudar(() => { avisos++; });
  assert.doesNotThrow(() => atualizarEstado({ modo: 'grade' }));
  assert.equal(obterEstado().modo, 'grade'); assert.equal(avisos, 1);
});

test('aoMudar devolve a função de cancelar; ouvinte com erro não impede os outros', () => {
  iniciarEstado(falso({}));
  const erroOriginal = console.error; console.error = () => {};
  try {
    let a = 0; let b = 0;
    aoMudar(() => { throw new Error('quebrou'); });
    const cancelar = aoMudar(() => { a++; });
    aoMudar(() => { b++; });
    atualizarEstado({ abaAtiva: 'x' });
    cancelar();
    atualizarEstado({ abaAtiva: 'y' });
    assert.equal(a, 1); assert.equal(b, 2);
  } finally {
    console.error = erroOriginal;
  }
});

test('iniciarEstado de novo descarta os ouvintes anteriores', () => {
  iniciarEstado(falso({})); let chamadas = 0; aoMudar(() => { chamadas++; });
  iniciarEstado(falso({})); atualizarEstado({ abaAtiva: 'z' });
  assert.equal(chamadas, 0);
});

test('visaoDoGrupo devolve a padrão; atualizarVisao troca o Map e avisa com visoes', () => {
  iniciarEstado(falso({}));
  assert.deepEqual(visaoDoGrupo('g1'), { filtro: 'todos', busca: '', rolagem: 0, ordenacao: { coluna: null, asc: true } });
  const vistos = []; aoMudar((_, c) => vistos.push(c));
  const mapaAntes = obterEstado().visoes;
  atualizarVisao('g1', { busca: 'joao' });
  assert.notStrictEqual(obterEstado().visoes, mapaAntes);
  assert.equal(mapaAntes.size, 0, 'Map anterior não é mutado');
  assert.deepEqual(vistos, [['visoes']]);
  atualizarVisao('g1', { filtro: 'admins', ordenacao: { coluna: 'telefone', asc: false } });
  assert.deepEqual(visaoDoGrupo('g1'), { filtro: 'admins', busca: 'joao', rolagem: 0, ordenacao: { coluna: 'telefone', asc: false } });
  atualizarVisao('g1', { filtro: 'inexistente' });
  assert.equal(visaoDoGrupo('g1').filtro, 'admins', 'filtro fora de FILTROS é ignorado');
  assert.equal(visaoDoGrupo('g2').busca, '', 'visões são por grupo');
});
