// Varredura estática: texto vindo do WhatsApp (nomes, mensagens de erro) só pode entrar no DOM
// por textContent/atributos. Lista de permissão: innerHTML só aceita, como lado direito inteiro,
// ICONES.<nome> (ou ICONES[nome], para o molde dinâmico de ui.js) ou literal de string vazia.
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

const ATRIBUICAO_INNER_HTML_PERMITIDA = /^\.innerHTML\s*=\s*(?:ICONES(?:\.\w+|\[\w+\])|''|""|``)\s*(?:;|$|\/\/)/;

const OCORRENCIA_INNER_HTML = /\.innerHTML\b|\[\s*['"`]innerHTML['"`]\s*\]|\binnerHTML\s*:/g;

const PROIBIDOS = [
  [/\bouterHTML\b/, 'outerHTML'],
  [/\binsertAdjacentHTML\b/, 'insertAdjacentHTML'],
  [/\bsetHTMLUnsafe\b/, 'setHTMLUnsafe'],
  [/\bparseHTMLUnsafe\b/, 'parseHTMLUnsafe'],
  [/\bcreateContextualFragment\b/, 'createContextualFragment'],
  [/\bDOMParser\b/, 'DOMParser'],
  [/\bsrcdoc\b/, 'srcdoc'],
  [/\bdocument\s*\.\s*write(?:ln)?\b/, 'document.write'],
];

// Devolve a lista de violações ("linha N: motivo"); vazia quando o código é seguro.
export function verificarDomSeguro(src) {
  const violacoes = [];
  src.split('\n').forEach((linha, indice) => {
    const onde = `linha ${indice + 1}`;
    for (const [regex, nome] of PROIBIDOS) {
      if (regex.test(linha)) violacoes.push(`${onde}: ${nome} é proibido`);
    }
    for (const ocorrencia of linha.matchAll(OCORRENCIA_INNER_HTML)) {
      const resto = linha.slice(ocorrencia.index);
      if (!ATRIBUICAO_INNER_HTML_PERMITIDA.test(resto)) {
        violacoes.push(`${onde}: innerHTML só aceita ICONES.<nome> ou string vazia (${linha.trim()})`);
      }
    }
  });
  return violacoes;
}

test('o verificador reprova HTML montado com dados', () => {
  const reprovados = [
    'el.innerHTML = `<b>${nome}</b>`;',
    'el.innerHTML = `<b>` + nome;',
    'el.innerHTML = ICONES.x + nome;',
    'el.innerHTML = nome + ICONES.x;',
    `el.innerHTML = "<b class='x'>" + nome;`,
    'el.innerHTML = "<b>".concat(nome);',
    'el.innerHTML += ICONES.x;',
    'el.innerHTML = ICONES.x.concat(nome);',
    'el.innerHTML = nome;',
    `el['innerHTML'] = nome;`,
    'el["innerHTML"] = nome;',
    'Object.assign(el, { innerHTML: nome });',
    'el.outerHTML = ICONES.x;',
    'el.outerHTML = `<b>${nome}</b>`;',
    'el.insertAdjacentHTML("beforeend", nome);',
    'el.setHTMLUnsafe(nome);',
    'Document.parseHTMLUnsafe(nome);',
    'document.write(nome);',
    'range.createContextualFragment(nome);',
    'new DOMParser().parseFromString(nome, "text/html");',
    'frame.srcdoc = nome;',
    'toast.innerHTML = `<span class="toast-icon">${icone}</span><span>${text}</span>`;',
  ];
  for (const codigo of reprovados) {
    assert.ok(verificarDomSeguro(codigo).length > 0, `deveria reprovar: ${codigo}`);
  }
});

test('o verificador aprova atribuições fixas', () => {
  const aprovados = [
    'el.innerHTML = ICONES.copiar;',
    'el.innerHTML = ICONES.x',
    'molde.innerHTML = ICONES[nome];',
    "el.innerHTML = '';",
    'el.innerHTML = "";',
    'el.innerHTML = ``;',
    'el.innerHTML = ICONES.x; // ícone fixo',
    'el.textContent = nome;',
    'el.setAttribute("title", nome);',
  ];
  for (const codigo of aprovados) {
    assert.deepEqual(verificarDomSeguro(codigo), [], `deveria aprovar: ${codigo}`);
  }
});

test('nenhum módulo de public/js monta HTML com dados', () => {
  const arquivos = fs.existsSync(RAIZ_JS) ? listarJs(RAIZ_JS) : [];
  assert.ok(arquivos.length > 0, 'nenhum arquivo em public/js');
  for (const caminho of arquivos) {
    const arquivo = path.relative(RAIZ_JS, caminho);
    const violacoes = verificarDomSeguro(fs.readFileSync(caminho, 'utf8'));
    assert.deepEqual(violacoes, [], arquivo);
  }
});
