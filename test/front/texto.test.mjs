import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizar, contemTexto, apenasDigitos, formatarTelefone, iniciais, tempoRelativo, textoMembros,
} from '../../public/js/logica/texto.js';

test('normalizar tira acento, espaço das pontas e caixa alta', () => {
  assert.equal(normalizar('  JOÃO Açaí '), 'joao acai');
  assert.equal(normalizar(null), '');
  assert.equal(normalizar(undefined), '');
  assert.equal(normalizar(42), '42');
});

test('contemTexto compara sem acento e sem caixa; termo vazio sempre casa', () => {
  assert.ok(contemTexto('Grupo Família', 'familia'));
  assert.ok(contemTexto('João', 'JOAO'));
  assert.ok(!contemTexto('Ana', 'bia'));
  assert.ok(contemTexto('qualquer', ''));
  assert.ok(contemTexto(null, '  '));
});

test('apenasDigitos', () => {
  assert.equal(apenasDigitos('+55 (11) 98765-4321'), '5511987654321');
  assert.equal(apenasDigitos(null), '');
  assert.equal(apenasDigitos(undefined), '');
});

test('formatarTelefone mantém o formato da tabela', () => {
  assert.equal(formatarTelefone('5511987654321'), '+55 (11) 98765-4321');
  assert.equal(formatarTelefone('551187654321'), '+55 (11) 8765-4321');
  assert.equal(formatarTelefone('14155550123'), '+14 1555 50123');
  assert.equal(formatarTelefone('1234'), '+1234');
  assert.equal(formatarTelefone(''), '—');
  assert.equal(formatarTelefone(null), '—');
});

test('iniciais: primeira letra do primeiro e do último nome', () => {
  assert.equal(iniciais('maria da silva'), 'MS');
  assert.equal(iniciais('João'), 'J');
  assert.equal(iniciais('  ana   bia '), 'AB');
  assert.equal(iniciais(''), '?');
  assert.equal(iniciais(null), '?');
  assert.equal(iniciais('   '), '?');
});

test('iniciais ignoram emoji, bandeira, pontuação e caracteres invisíveis', () => {
  assert.equal(iniciais('🏠 Família'), 'F');
  assert.equal(iniciais('🏠 Família Silva'), 'FS');
  assert.equal(iniciais('🇧🇷 Brasil'), 'B');
  assert.equal(iniciais('\u200EJoão Silva'), 'JS');
  assert.equal(iniciais('(Turma) 2024'), 'T2');
  assert.equal(iniciais('🏠🎉'), '?');
  assert.equal(iniciais('🏠 🎉 !!!'), '?');
});

test('tempoRelativo', () => {
  assert.equal(tempoRelativo(0, 59_000), 'agora mesmo');
  assert.equal(tempoRelativo(0, 5 * 60_000), 'há 5 min');
  assert.equal(tempoRelativo(0, 3 * 3_600_000), 'há 3 h');
  assert.equal(tempoRelativo(0, 86_400_000), 'há 1 dia');
  assert.equal(tempoRelativo(0, 2 * 86_400_000), 'há 2 dias');
  assert.equal(tempoRelativo(0, 60_000), 'há 1 min');
  assert.equal(tempoRelativo(0, 3_600_000), 'há 1 h');
});

test('textoMembros: singular, plural e tamanho ainda desconhecido', () => {
  assert.equal(textoMembros(1), '1 membro');
  assert.equal(textoMembros(2), '2 membros');
  assert.equal(textoMembros(0), 'Membros pendentes');
  assert.equal(textoMembros(undefined), 'Membros pendentes');
});
