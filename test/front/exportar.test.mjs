import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { montarDom } from '../helpers/dom.mjs';
import { executarExportacaoExcel } from '../../public/js/exportar.js';

beforeEach(() => {
  globalThis.document = montarDom('<div id="toastContainer"></div>');
  globalThis.ExcelJS = {};
});
afterEach(() => {
  delete globalThis.document;
  delete globalThis.ExcelJS;
});

test('exporta o Excel pelo menu, que não passa botão', async () => {
  let montou = false;
  await executarExportacaoExcel(null, async () => { montou = true; });
  assert.equal(montou, true);
});

test('com botão, mostra "Gerando..." durante a montagem e devolve o rótulo depois', async () => {
  const botao = document.createElement('button');
  botao.textContent = 'Excel';
  let rotuloDurante;
  await executarExportacaoExcel(botao, async () => { rotuloDurante = botao.textContent; });
  assert.equal(rotuloDurante, 'Gerando...');
  assert.equal(botao.textContent, 'Excel');
});
