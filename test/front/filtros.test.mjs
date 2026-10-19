import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FILTROS, contarFiltros, filtrarParticipantes, linhaExportacao, ordenarParticipantes,
  filtrarGrupos, separarSecoes, resultadosBuscaRapida, vizinhoNaLista,
} from '../../public/js/logica/filtros.js';

const ps = [
  { id: '5511987654321@c.us', pushname: 'João', name: 'João', savedName: '', phone: '5511987654321', admin: true, hidden: false, photoUrl: '' },
  { id: '111@lid', pushname: 'Ana', name: 'Ana', savedName: '', phone: '', admin: false, hidden: true, photoUrl: '' },
  { id: '5521911112222@c.us', pushname: 'Bia', name: 'Bia', savedName: 'Beatriz Açaí', phone: '5521911112222', admin: false, hidden: false, photoUrl: '' },
  { id: '5531933334444@c.us', pushname: 'Caio', name: 'Caio', savedName: '', phone: '5531933334444', admin: false, hidden: false, photoUrl: '' },
  { id: '222@lid', pushname: 'Dani', name: 'Dani', savedName: '', phone: '', admin: true, hidden: true, photoUrl: '' },
];
const gs = [
  { id: 'g1', name: 'Família Silva', size: 10 },
  { id: 'g2', name: 'Trabalho', size: 5 },
  { id: 'g3', name: 'Futebol de Quinta', size: 22 },
];

test('FILTROS tem os quatro ids', () => {
  assert.deepEqual(FILTROS, ['todos', 'telefone', 'admins', 'privados']);
});

test('contarFiltros', () => {
  assert.deepEqual(contarFiltros(ps), { todos: 5, telefone: 3, admins: 2, privados: 2 });
  assert.deepEqual(contarFiltros([]), { todos: 0, telefone: 0, admins: 0, privados: 0 });
});

test('filtrarParticipantes busca nome sem acento e sem caixa', () => {
  assert.deepEqual(filtrarParticipantes(ps, { busca: 'JOAO' }).map((p) => p.pushname), ['João']);
  assert.deepEqual(filtrarParticipantes(ps, { busca: 'acai' }).map((p) => p.pushname), ['Bia']);
  assert.equal(filtrarParticipantes(ps, {}).length, 5);
});

test('filtrarParticipantes ignora formatação do telefone', () => {
  for (const b of ['(11) 98765-4321', '+55 11 9876', '987654321', '(11) 9']) {
    assert.deepEqual(filtrarParticipantes(ps, { busca: b }).map((p) => p.pushname), ['João'], b);
  }
});

test('filtrarParticipantes exige que cada palavra bata em algum campo', () => {
  const nomes = (busca) => filtrarParticipantes(ps, { busca }).map((p) => p.pushname);
  assert.deepEqual(nomes('joao 98765'), ['João']);
  assert.deepEqual(nomes('joao 2222'), []);
  assert.deepEqual(nomes('bia 9876'), []);
  assert.deepEqual(nomes('beatriz acai'), ['Bia']);
  assert.deepEqual(nomes('  joao   '), ['João']);
});

test('filtrarGrupos exige todas as palavras, em qualquer ordem', () => {
  const grupos = [{ id: '1@g.us', name: 'Condomínio Ed. Sol' }, { id: '2@g.us', name: 'Sol Nascente' }];
  assert.deepEqual(filtrarGrupos(grupos, 'sol condominio').map((g) => g.id), ['1@g.us']);
  assert.deepEqual(filtrarGrupos(grupos, 'SOL').map((g) => g.id), ['1@g.us', '2@g.us']);
});

test('filtrarParticipantes combina filtro e busca', () => {
  assert.equal(filtrarParticipantes(ps, { filtro: 'admins', busca: 'dani' }).length, 1);
  assert.equal(filtrarParticipantes(ps, { filtro: 'telefone', busca: 'ana' }).length, 0);
  assert.equal(filtrarParticipantes(ps, { filtro: 'privados' }).length, 2);
  assert.equal(filtrarParticipantes(ps, { filtro: 'telefone' }).length, 3);
});

test('linhaExportacao tem os valores da planilha', () => {
  assert.deepEqual(linhaExportacao(ps[1]).status, 'ID de privacidade (LID)');
  assert.equal(linhaExportacao(ps[0]).telefone, '+5511987654321');
  assert.equal(linhaExportacao(ps[0]).admin, 'sim');
  assert.deepEqual(linhaExportacao(ps[2]), {
    preview: '', nome_whatsapp: 'Bia', nome_agenda: 'Beatriz Açaí', telefone: '+5521911112222', admin: 'não', status: 'Normal',
  });
});

test('ordenarParticipantes', () => {
  assert.deepEqual(ordenarParticipantes(ps, null, true), ps);
  const copia = [...ps];
  const desc = ordenarParticipantes(ps, 'nome_whatsapp', false);
  assert.notStrictEqual(desc, ps);
  assert.deepEqual(ps, copia, 'não muta a entrada');
  assert.deepEqual(desc.map((p) => p.pushname), ['João', 'Dani', 'Caio', 'Bia', 'Ana']);
  assert.deepEqual(ordenarParticipantes(ps, 'telefone', true).map((p) => p.pushname), ['Ana', 'Dani', 'João', 'Bia', 'Caio']);
});

test('filtrarGrupos sem acento', () => {
  assert.deepEqual(filtrarGrupos(gs, 'familia').map((g) => g.id), ['g1']);
  assert.equal(filtrarGrupos(gs, '').length, 3);
});

test('separarSecoes', () => {
  assert.deepEqual(separarSecoes(gs, ['g3', 'sumiu', 'g1']).fixados.map((g) => g.id), ['g3', 'g1']);
  assert.equal(separarSecoes(gs, ['g1']).todos.length, gs.length);
  assert.deepEqual(separarSecoes(gs, []).todos.map((g) => g.id), ['g1', 'g2', 'g3']);
});

test('resultadosBuscaRapida', () => {
  assert.deepEqual(resultadosBuscaRapida(gs, '', ['g2'], [{ id: 'g2' }, { id: 'g3' }]).map((g) => g.id), ['g2', 'g3']);
  assert.deepEqual(resultadosBuscaRapida(gs, '', ['sumiu'], [{ id: 'outro' }, { id: 'g1' }]).map((g) => g.id), ['g1']);
  assert.deepEqual(resultadosBuscaRapida(gs, 'QUINTA', ['g2'], []).map((g) => g.id), ['g3']);
});

test('vizinhoNaLista', () => {
  assert.equal(vizinhoNaLista(ps, ps[0].id, -1), null);
  assert.equal(vizinhoNaLista(ps, ps[0].id, 1), ps[1].id);
  assert.equal(vizinhoNaLista(ps, ps[4].id, 1), null);
  assert.equal(vizinhoNaLista(ps, 'nao-existe', 1), null);
});
