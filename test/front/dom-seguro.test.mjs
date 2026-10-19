// Varredura estática: texto vindo do WhatsApp (nomes, mensagens de erro) só pode entrar no DOM
// por textContent/atributos. innerHTML fica restrito a ICONES (SVG fixo) ou a literal sem concatenação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'js');

function listarJs(pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = path.join(pasta, item.name);
    if (item.isDirectory()) return listarJs(caminho);
    return item.name.endsWith('.js') ? [caminho] : [];
  });
}

test('public/js existe e tem o ponto de entrada app.js', () => {
  assert.ok(fs.existsSync(path.join(RAIZ_JS, 'app.js')), 'public/js/app.js não existe');
});

test('nenhum módulo de public/js monta HTML com dados', () => {
  const arquivos = fs.existsSync(RAIZ_JS) ? listarJs(RAIZ_JS) : [];
  assert.ok(arquivos.length > 0, 'nenhum arquivo em public/js');
  for (const caminho of arquivos) {
    const arquivo = path.relative(RAIZ_JS, caminho);
    const src = fs.readFileSync(caminho, 'utf8');
    assert.doesNotMatch(src, /\.(innerHTML|outerHTML)\s*\+?=\s*`[^`]*\$\{/, arquivo);
    assert.doesNotMatch(src, /insertAdjacentHTML\s*\(/, arquivo);
    // espaço dentro do lookahead: com `=\s*(?!...)` o \s* recua e o lookahead vê o espaço, não o ICONES
    assert.doesNotMatch(src, /\.innerHTML\s*\+?=(?!\s*(?:ICONES\b|['"`]))/, arquivo);
    assert.doesNotMatch(src, /\.outerHTML\s*\+?=/, arquivo);
    // literal fixo concatenado com variável também é HTML montado com dados
    assert.doesNotMatch(src, /\.innerHTML\s*\+?=\s*(['"])[^'"\n]*\1\s*\+/, arquivo);
  }
});
