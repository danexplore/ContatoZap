# Redesign da interface do ContatoZap — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o `index.html` monolítico por uma interface em `public/` com sidebar de seções e fixados, abas de recentes, grade de participantes, ficha do participante, fotos dos grupos e paleta teal, sem mexer na extração.

**Architecture:** O front vira módulos ES nativos servidos pelo `server.js` (sem build). Funções puras ficam em `public/js/logica/` e são testadas com `node --test`; componentes `criarX(props) → HTMLElement` não guardam estado; `estado.js` centraliza o estado, persiste preferências no localStorage e avisa as áreas quando algo muda. No servidor, a lógica testável sai do `server.js` para `lib/` (CommonJS).

**Tech Stack:** Node ≥22.13 (http puro, CommonJS na raiz), whatsapp-web.js, ExcelJS (global no navegador via `/exceljs.min.js`), HTML/CSS/JS sem framework, `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-10-19-redesign-contatozap-design.md`

## Como executar este plano

- Um implementador por **fase**, um commit por **tarefa**, revisão ao fim de cada fase. Status ao usuário só por fase.
- Modelo sugerido em cada tarefa: **[Opus]** fundação, muitos pontos de chamada ou segurança; **[Sonnet]** mecânica. **[Segurança]** pede revisão própria da tarefa, além da revisão da fase.
- Ninguém sobe servidor. Ao fim da fase, o implementador escreve a "Conferência visual" para o usuário (rota e o que olhar); o usuário roda `npm run watch` e confere.
- Durante o trabalho: `npm test` (ou só o arquivo de teste da tarefa) e `node --check <arquivo>`. Não há tsc nem eslint.
- Todos os commits terminam com a linha em branco + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comandos de shell com prefixo `rtk` (ex.: `rtk npm test`, `rtk git commit ...`).

## Global Constraints

- Nenhuma dependência nova: `dependencies` do `package.json` não muda; testes só com `node:test` e `node:assert/strict`.
- Sem etapa de build: `<script type="module" src="/js/app.js">`; a raiz continua `"type":"commonjs"`; `public/package.json` é exatamente `{"type":"module"}`.
- `npm test` → `node --test "test/**/*.test.js" "test/**/*.test.mjs"`; testes do servidor em `test/servidor/*.test.js` (CJS), do front em `test/front/*.test.mjs` (ESM).
- `GET /`, `/css/*`, `/js/*` com `Cache-Control: no-store`; caminho fora de `public/` → 404; `/exceljs.min.js` continua como está.
- Chaves do localStorage, exatamente: `contatozap_theme`, `contatozap_fetch_photos`, `contatozap_fixados`, `contatozap_recentes`, `contatozap_secoes`, `contatozap_sidebar_recolhida`, `contatozap_modo`, `contatozap_tamanho_grade`, `contatozap_tamanho_foto_excel`. Valor corrompido → ignora a chave e usa o padrão.
- Abas de recentes: no máximo **8**; passando disso sai a usada há mais tempo.
- Grade: `repeat(auto-fill, minmax(<P|M|G>, 1fr))` com **P = 120px, M = 160px, G = 220px**; `< 768px` → 2 colunas.
- Breakpoints: `< 768px`, `768–1023px`, `1024–1279px`, `≥ 1280px` (tabela da seção Responsividade da spec). Trilho = **56px**. Container sem largura máxima.
- Fotos dos grupos: cache em memória `id → { url, timestamp }` por **1h (3.600.000 ms)**, guardando `null`; no máximo **3** consultas simultâneas; `/api/group-photos` aceita até **50** ids; **503** se o WhatsApp não está pronto; o front agrupa os ids visíveis a cada **~150ms**.
- "Também está em" ignora o TTL de **5 minutos** do `participantsCache`.
- Cor primária: teal da marca **`#0D9488`** (`175 84% 32%` em HSL) em `--color-primary`, claro e escuro.
- Alvos de toque ≥ **44px** em `@media (pointer: coarse)`; animações desligadas em `prefers-reduced-motion: reduce`.
- Exportação: mesmo formato de hoje (CSV, Excel, JSON), sempre o grupo inteiro, independente de filtro e busca.
- Componentes: `criarX(props)` devolve `HTMLElement`, não guarda estado, não chama a API; ações saem por callbacks em `props` (`aoClicar`, `aoFixar`…).
- Texto vindo do WhatsApp (nomes de grupo e de pessoa, mensagens de erro) entra no DOM só por `textContent`/atributos, nunca por `innerHTML`.
- Fora do escopo: lógica de extração, conexão/QR, lote, CLI (`extrator-seletor.js`), persistência em disco. `iniciar.bat` e `iniciar.sh` não mudam.
- Gate de fechamento (sem type-check, o projeto é JS puro): `npm test` + `node --check` em `server.js`, `whatsapp-extractor.js`, `lib/*.js` e em cada arquivo de `public/js/**`.

## Review Focus

1. **Nome de grupo ou de pessoa com HTML** (`<img src=x onerror=alert(1)>`, vindo do WhatsApp) — deve aparecer como texto literal em sidebar, abas, lista, grade, ficha e aviso (toast). Teste: `test/front/dom-seguro.test.mjs` na Tarefa 1.3 (varredura estática de `public/js/**`).
2. **localStorage corrompido ou de formato inesperado** (`contatozap_recentes = "oi"`, array de strings, 12 itens, ids repetidos; `getItem` que lança) — o app abre com os padrões, sem tela branca. Testes: `normalizarRecentes` na Tarefa 2.3 e `carregarPreferencias` na Tarefa 2.4.
3. **Mais de 50 grupos visíveis de uma vez** (monitor alto, zoom reduzido, "Marcar todos") — o front divide em chamadas de até 50 ids, nunca leva 400. Teste: `agrupador divide em lotes de 50` na Tarefa 3.2.
4. **Busca com acento, maiúsculas e telefone formatado** ("JOAO" acha "João"; "(11) 98765-4321" e "+55 11 9876" acham `5511987654321`) — vale na busca de membros, no filtro de grupos e no Ctrl+K. Teste: `filtrarParticipantes ignora formatação do telefone` na Tarefa 2.2.
5. **Pessoa sem telefone (LID) na ficha** — "Também está em" não pode casar todos os participantes sem telefone entre si; compara pelo id serializado. Teste: `telefone vazio não casa com outros sem telefone` na Tarefa 6.1.

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Fase |
|---|---|---|
| `lib/estaticos.js` | resolver caminho em `public/`, Content-Type, servir arquivo | 1 |
| `lib/fotos-grupos.js` | cache de fotos de grupo com fila de 3 e TTL 1h; leitura dos ids | 3 |
| `lib/cache-participantes.js` | leitura do `participantsCache` com `extractedAt`; "Também está em" | 5, 6 |
| `whatsapp-extractor.js` | + `getGroupPhoto(client, groupId)` | 3 |
| `server.js` | rotas novas; usa os módulos de `lib/` | 1, 3, 5, 6 |
| `public/index.html` | só a estrutura | 1 |
| `public/css/{tokens,base,layout,sidebar,grupo,grade,ficha}.css` | estilos | 1→6 |
| `public/js/{app,api,estado,conexao,lote,sidebar,abas,busca-rapida,grupo,lista,grade,ficha,exportar}.js` | áreas (spec, seção 1) | 1→6 |
| `public/js/ui.js` | aviso (toast), copiar, baixar arquivo, preview de foto, ícones SVG | 1 |
| `public/js/fotos-grupos.js` | `IntersectionObserver` + agrupador → `estado.fotosGrupos` | 3 |
| `public/js/logica/{texto,recentes,filtros,cor,agrupador}.js` | funções puras | 2, 3 |
| `public/js/componentes/*.js` | `avatar`, `estrela`, `chip-filtro`, `aba`, `menu`, `painel`, `card-participante`, `linha-participante` | 2→6 |

`ui.js`, `fotos-grupos.js` e `logica/agrupador.js` não estão na árvore da spec; são acréscimos deste plano para não espalhar utilitários pelas áreas.

---

## Fase 1 — Fundação (o app fica igual ao de hoje, servido de `public/`)

### Tarefa 1.1: Testes + rota estática segura — [Opus] [Segurança]

**Files:**
- Create: `lib/estaticos.js`, `test/servidor/estaticos.test.js`
- Modify: `package.json` (script `test`), `server.js` (rotas `GET /css/*` e `GET /js/*`, antes do 404 final)

**Interfaces:**
- Produces:
  - `RAIZ_PUBLICA: string` — `path.join(__dirname, '..', 'public')`
  - `resolverArquivoPublico(raiz: string, pathname: string): string | null` — só aceita prefixo `/css/` ou `/js/`; decodifica com `decodeURIComponent` (erro → `null`); recusa `\0`; `path.resolve(raiz, '.' + decodificado)`; aceita só se começar com `raiz + path.sep`.
  - `tipoConteudo(caminho: string): string` — `.js` → `application/javascript; charset=utf-8`, `.css` → `text/css; charset=utf-8`, `.html` → `text/html; charset=utf-8`, `.svg` → `image/svg+xml`, outro → `application/octet-stream`.
  - `servirArquivoPublico(res, raiz: string, pathname: string): void` — 200 com `tipoConteudo` + `Cache-Control: no-store`; caminho recusado, inexistente ou diretório → 404 `text/plain`. Usa `fs.promises.stat` + `isFile()`.

- [ ] **Passo 1: Testes que falham** (`test/servidor/estaticos.test.js`, raiz = pasta temporária com `js/a.js`, `css/b.css` e um irmão `<tmp>-mal/x.js`):

```js
assert.equal(resolverArquivoPublico(raiz, '/js/a.js'), path.join(raiz, 'js', 'a.js'));
for (const p of ['/js/../segredo.txt', '/js/%2e%2e/segredo.txt', '/js/..%2fsegredo.txt',
                 '/js/..%5csegredo.txt', '/js/%2e%2e%2f%2e%2e%2fserver.js', '/css/a%00.css',
                 '/js/%E0%A4%A', '/package.json', '/js/../../' + path.basename(raiz) + '-mal/x.js'])
  assert.equal(resolverArquivoPublico(raiz, p), null, p);
assert.equal(tipoConteudo('x.css'), 'text/css; charset=utf-8');
// servirArquivoPublico com res falso { writeHead(code, headers), end(body) }:
//  '/js/a.js' → 200, headers['Cache-Control'] === 'no-store', Content-Type de JS
//  '/js/nao-existe.js' → 404; '/js/' (diretório) → 404; '/js/..%2fsegredo.txt' → 404
```

- [ ] **Passo 2:** `rtk npm test` → FAIL (módulo não existe). Antes, em `package.json`: `"test": "node --test \"test/**/*.test.js\" \"test/**/*.test.mjs\""`.
- [ ] **Passo 3:** Implementar `lib/estaticos.js` e ligar no `server.js`: `if (req.method === 'GET' && (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/'))) { await servirArquivoPublico(res, RAIZ_PUBLICA, url.pathname); return logDone(res.statusCode); }`. Usar `url.pathname` cru (sem decodificar antes). `GET /` continua servindo o `index.html` da raiz até a Tarefa 1.3.
- [ ] **Passo 4:** `rtk npm test` → PASS; `node --check server.js lib/estaticos.js`.
- [ ] **Passo 5:** Commit `feat: rota estática segura para public/ e npm test`.

**Pronto quando:** todos os caminhos maliciosos acima dão `null`/404 e os válidos dão 200 com `no-store`.

### Tarefa 1.2: Tokens com o teal da marca — [Sonnet]

**Files:**
- Create: `public/css/tokens.css`
- Modify: `docs/design.md` (seção 2.1, 2.2 e o foco), `index.html` (só os valores de `--color-primary*` e `--color-border-focus`, para a mudança aparecer já)

**Interfaces:**
- Produces: `tokens.css` com todas as variáveis `:root` e `[data-theme="dark"]` hoje em `index.html` (linhas ~13–130: cores, `--space-*`, `--radius-*`, `--shadow-*`, `--text-*`, z-index), mais:
  - claro: `--color-primary: 175 84% 32%`, `--color-primary-hover: 175 84% 27%`, `--color-primary-active: 175 85% 22%`, `--color-primary-subtle: 170 60% 94%`, `--color-border-focus: 175 84% 32%`
  - escuro: `--color-primary: 172 66% 50%`, `--color-primary-hover: 172 66% 58%`, `--color-primary-active: 172 70% 65%`, `--color-primary-subtle: 175 50% 14%`, `--color-border-focus: 172 66% 50%`
  - novos: `--sidebar-largura: 300px`, `--trilho-largura: 56px`, `--grade-p: 120px`, `--grade-m: 160px`, `--grade-g: 220px`, `--alvo-toque: 44px`.

- [ ] **Passo 1:** Copiar os tokens para `public/css/tokens.css` com os valores teal acima (formato HSL sem `hsl()`, como hoje).
- [ ] **Passo 2:** Atualizar as tabelas de `docs/design.md` §2.1/§2.2 com os mesmos valores e uma nota: "Primária = teal da marca (`#0D9488`, `docs/brand.md` §4)". Corrigir menções a "azul" como primária.
- [ ] **Passo 3:** Commit `feat: teal da marca como cor primária`.

**Pronto quando:** rota `/` (ainda o `index.html` antigo) mostra botões primários, foco e abas ativas em teal no claro e no escuro.

### Tarefa 1.3: Migração do `index.html` para `public/` — [Opus] [Segurança: DOM]

**Files:**
- Create: `public/index.html`, `public/package.json`, `public/css/{base,layout,sidebar,grupo}.css`, `public/js/{app,api,ui,conexao,lote,sidebar,grupo,lista,exportar}.js`, `test/front/dom-seguro.test.mjs`
- Modify: `server.js` (`GET /` lê `public/index.html`)
- Delete: `index.html` (raiz)

**Interfaces:**
- Consumes: `servirArquivoPublico`, `RAIZ_PUBLICA` (1.1); `tokens.css` (1.2).
- Produces (usados pelas fases seguintes):
  - `api.js`: `conectarEventos(handlers: { state, batch_start, batch_progress, batch_item_done, batch_complete, batch_cancelled }): void` (mesma reconexão de `connectSSE`); `buscarEstado(): Promise<object>`; `buscarGrupo(id, { atualizar = false, fotos = false }): Promise<GrupoExtraido>` (lança `Error(data.error)` se `!res.ok`); `iniciarLote(ids, fotos)`, `cancelarLote()`, `recarregarGrupos()`, `reiniciarConexao()`.
    `GrupoExtraido = { id, name, participants: Participante[], durationSec?, extractedAt? }`; `Participante = { id, name, pushname, savedName, phone, admin, hidden, photoUrl }`.
  - `ui.js`: `mostrarAviso(texto, tipo = 'info', duracao = 5000)` (ex-`showToast`), `copiarTexto(texto, msgSucesso)` (ex-`copyToClipboard` + `fallbackCopy`), `baixarArquivo(blob, nome)` (ex-`downloadBlob`), `abrirPreviewFoto(url, nome)` (ex-`openPhotoPreview`), `ICONES` (ex-`ICONS`, só SVG estático).
  - `conexao.js`: `aplicarEstadoConexao(s)` (ex-`handleStateUpdate` + `renderSyncState`), `iniciarConexao()` (botões Reiniciar/Tentar de novo).
  - `lote.js`: `abrirLote(total)`, `atualizarLote(dados)`, `finalizarLote(resultados, cancelado)` + botões do drawer (ex-`openBatchDrawer`, `updateBatchProgress`, `finishBatch`, CSV/Excel consolidados).
  - `exportar.js`: `exportarCsv(grupo)`, `exportarExcel(grupo, botao)`, `exportarJson(grupo)`, `copiarTelefones(grupo)`, `montarPlanilha(nomeAba, linhas, comColunaGrupo)` (ex-`buildContactsWorkbook`), `executarExportacaoExcel(botao, montar)` (ex-`runExcelExport`), `paraLinhaExcel(p)` (ex-`toExcelRow`, sai para a lógica na 2.2).
  - `grupo.js`: `abrirGrupo(grupo: {id, name}, { atualizar = false } = {})` (ex-`openGroup`, com o mesmo cache cliente `${id}:basic|with_photos`), `renderizarGrupoAtivo()`.
  - `lista.js`: `renderizarLista()` (ex-`renderTable`, ainda paginada), `ativarRedimensionamentoFoto()` (ex-`initPhotoColResize`).
  - `sidebar.js`: `renderizarSidebar()` (ex-`renderGroupList` + seleção para lote).
  - `app.js`: ponto de entrada; tema (`initTheme`/`applyTheme`), liga `conectarEventos` às áreas.

- [ ] **Passo 1: Teste que falha** — `test/front/dom-seguro.test.mjs` lê recursivamente `public/js/**/*.js` e afirma, por arquivo:

```js
assert.doesNotMatch(src, /\.(innerHTML|outerHTML)\s*\+?=\s*`[^`]*\$\{/, arquivo);   // template com interpolação
assert.doesNotMatch(src, /insertAdjacentHTML\s*\(/, arquivo);
assert.doesNotMatch(src, /\.innerHTML\s*\+?=\s*(?!ICONES\b|['"`])/, arquivo);       // só ICONES.x/ICONES[k] ou literal fixo
```
Falha hoje porque `public/js` não existe (o teste exige ao menos `app.js`).
- [ ] **Passo 2:** `rtk npm test` → FAIL.
- [ ] **Passo 3:** Migrar. CSS: tokens já em `tokens.css`; o resto do `<style>` dividido em `base.css` (reset, tipografia, botões, inputs, badges, toast, spinner, `@media` de reduced-motion e pointer coarse), `layout.css` (topo, `grid-layout`, status hero, banner de sincronização, drawer do lote), `sidebar.css`, `grupo.css` (cabeçalho, métricas, abas de filtro, tabela, paginação). Markup: o `<body>` atual, com os mesmos ids, em `public/index.html`, que carrega os CSS em ordem, `<script src="/exceljs.min.js">` e `<script type="module" src="/js/app.js">`. JS: cada trecho para o módulo da lista acima; `onclick` em atributos HTML vira `addEventListener` no módulo dono. O toast monta título e mensagem com `textContent` (hoje usa `innerHTML` com `${text}`). `server.js`: `GET /` lê `path.join(RAIZ_PUBLICA, 'index.html')`. Apagar o `index.html` da raiz.
- [ ] **Passo 4:** `rtk npm test` → PASS; `node --check` em `server.js` e em cada `public/js/*.js`.
- [ ] **Passo 5:** Commit `refactor: interface migrada para public/ em módulos`.

**Pronto quando:** rota `/` faz tudo que fazia antes: QR/status, lista de grupos com filtro, abrir grupo, métricas, abas de filtro, ordenação, redimensionar a coluna Foto, paginação, preview de foto, Copiar telefones, CSV/Excel (com tamanho da foto)/JSON, lote com drawer e consolidados, tema claro/escuro, banner de sincronização. Console sem erros. `git ls-files index.html` vazio.

**Conferência visual da Fase 1:** rota `/` → conectar, abrir um grupo, exportar CSV e Excel e comparar com um arquivo gerado antes (mesmas colunas); rodar um lote de 2 grupos; alternar tema; cor primária em teal.

---

## Fase 2 — Lógica pura, estado central e avatar

### Tarefa 2.1: `logica/texto.js` e `logica/cor.js` — [Sonnet]

**Files:**
- Create: `public/js/logica/texto.js`, `public/js/logica/cor.js`, `test/front/texto.test.mjs`, `test/front/cor.test.mjs`

**Interfaces:**
- Produces:
  - `normalizar(texto: unknown): string` — `String(texto ?? '')`, NFD, remove `\p{Diacritic}`, minúsculas, `trim`.
  - `contemTexto(alvo: unknown, termo: string): boolean` — `normalizar(alvo).includes(normalizar(termo))`; termo vazio → `true`.
  - `apenasDigitos(v: unknown): string`.
  - `formatarTelefone(phone): string` — corpo de `formatPhoneDisplay` atual.
  - `iniciais(nome: string): string` — até 2 letras maiúsculas (primeira do primeiro e do último nome); vazio → `'?'`.
  - `tempoRelativo(timestamp: number, agora: number): string` — `< 60s` → `'agora mesmo'`; `< 60min` → `'há N min'`; `< 24h` → `'há N h'`; senão `'há 1 dia'` / `'há N dias'`.
  - `PALETA_AVATAR: string[]` (8 cores HSL fixas, contraste ≥ 4.5:1 com texto branco) e `corDoId(id: string): string` (hash djb2 de `id` mod 8).

- [ ] **Passo 1: Testes que falham:**

```js
assert.equal(normalizar('  JOÃO Açaí '), 'joao acai');
assert.ok(contemTexto('Grupo Família', 'familia'));
assert.equal(apenasDigitos('+55 (11) 98765-4321'), '5511987654321');
assert.equal(iniciais('maria da silva'), 'MS'); assert.equal(iniciais(''), '?');
assert.equal(tempoRelativo(0, 59_000), 'agora mesmo');
assert.equal(tempoRelativo(0, 5 * 60_000), 'há 5 min');
assert.equal(tempoRelativo(0, 3 * 3_600_000), 'há 3 h');
assert.equal(tempoRelativo(0, 2 * 86_400_000), 'há 2 dias');
assert.equal(corDoId('120363@g.us'), corDoId('120363@g.us'));
assert.ok(PALETA_AVATAR.includes(corDoId(''))); assert.equal(PALETA_AVATAR.length, 8);
```
- [ ] **Passo 2:** `node --test test/front/texto.test.mjs test/front/cor.test.mjs` → FAIL.
- [ ] **Passo 3:** Implementar; `lista.js`/`exportar.js` passam a importar `apenasDigitos` e `formatarTelefone` (remover `cleanDigits`/`formatPhoneDisplay` locais).
- [ ] **Passo 4:** → PASS. **Passo 5:** Commit `feat: lógica de texto e cor do avatar`.

### Tarefa 2.2: `logica/filtros.js` — [Sonnet]

**Files:**
- Create: `public/js/logica/filtros.js`, `test/front/filtros.test.mjs`
- Modify: `public/js/exportar.js`, `public/js/lista.js` (usar as funções novas; remover `getFilteredAndSortedMembers`)

**Interfaces:**
- Consumes: `normalizar`, `contemTexto`, `apenasDigitos` (2.1).
- Produces:
  - `FILTROS = ['todos', 'telefone', 'admins', 'privados']`.
  - `contarFiltros(ps): { todos, telefone, admins, privados }` — telefone = `phone && !hidden`; admins = `admin`; privados = `hidden`.
  - `filtrarParticipantes(ps, { filtro = 'todos', busca = '' }): Participante[]` — busca casa `pushname`, `name`, `savedName` por `contemTexto`, **ou**, se `apenasDigitos(busca)` não é vazio, `apenasDigitos(phone).includes(apenasDigitos(busca))`.
  - `linhaExportacao(p): { preview: '', nome_whatsapp, nome_agenda, telefone, admin, status }` — ex-`toExcelRow`, valores idênticos.
  - `ordenarParticipantes(ps, coluna: string | null, asc: boolean): Participante[]` — `coluna === null` devolve a ordem original; senão `localeCompare('pt-BR', { numeric: true })` sobre `linhaExportacao(p)[coluna]`; não muta a entrada.
  - `filtrarGrupos(grupos, termo): Grupo[]` (`Grupo = { id, name, size }`, `contemTexto` no nome).
  - `separarSecoes(grupos, fixados: string[]): { fixados: Grupo[], todos: Grupo[] }` — `fixados` na ordem do array, ignorando ids que não estão em `grupos`; `todos` = todos os grupos (incluindo fixados), na ordem recebida.
  - `resultadosBuscaRapida(grupos, termo, fixados, recentes): Grupo[]` — termo vazio: fixados existentes, depois recentes existentes, sem repetir; com termo: `filtrarGrupos`.
  - `vizinhoNaLista(ps, idAtual, direcao: 1 | -1): string | null` — `null` nas pontas e se `idAtual` não está na lista.

- [ ] **Passo 1: Testes que falham** (fixture de 5 participantes: João admin `5511987654321`; Ana `hidden` sem telefone; Bia `5521911112222` com `savedName: 'Beatriz Açaí'`; Caio `5531933334444`; Dani admin `hidden` sem telefone; `gs` = grupos `g1`, `g2`, `g3`):

```js
assert.deepEqual(contarFiltros(ps), { todos: 5, telefone: 3, admins: 2, privados: 2 });
assert.deepEqual(filtrarParticipantes(ps, { busca: 'JOAO' }).map(p => p.pushname), ['João']);
// filtrarParticipantes ignora formatação do telefone
for (const b of ['(11) 98765-4321', '+55 11 9876', '987654321'])
  assert.equal(filtrarParticipantes(ps, { busca: b }).length, 1, b);
assert.equal(filtrarParticipantes(ps, { filtro: 'admins', busca: 'dani' }).length, 1);   // filtro + busca
assert.equal(filtrarParticipantes(ps, { filtro: 'telefone', busca: 'ana' }).length, 0);
assert.deepEqual(linhaExportacao(ps[1]).status, 'ID de privacidade (LID)');
assert.equal(linhaExportacao(ps[0]).telefone, '+5511987654321'); assert.equal(linhaExportacao(ps[0]).admin, 'sim');
assert.deepEqual(ordenarParticipantes(ps, null, true), ps);
assert.notStrictEqual(ordenarParticipantes(ps, 'nome_whatsapp', false), ps);
assert.deepEqual(separarSecoes(gs, ['g3', 'sumiu', 'g1']).fixados.map(g => g.id), ['g3', 'g1']);
assert.equal(separarSecoes(gs, ['g1']).todos.length, gs.length);
assert.deepEqual(resultadosBuscaRapida(gs, '', ['g2'], [{ id: 'g2' }, { id: 'g3' }]).map(g => g.id), ['g2', 'g3']);
assert.equal(vizinhoNaLista(ps, ps[0].id, -1), null); assert.equal(vizinhoNaLista(ps, ps[0].id, 1), ps[1].id);
```
- [ ] **Passo 2:** → FAIL. **Passo 3:** Implementar; `exportar.js` usa `linhaExportacao` (apaga `toExcelRow`/`paraLinhaExcel`); `lista.js` usa `filtrarParticipantes` + `ordenarParticipantes` com os ids de filtro novos (`data-filter` do markup passa a `todos|telefone|admins|privados`).
- [ ] **Passo 4:** → PASS. **Passo 5:** Commit `feat: filtros, ordenação e seções em funções puras`.

**Pronto quando:** testes passam; na rota `/`, busca "joao" acha "João" e a ordenação por coluna continua igual.

### Tarefa 2.3: `logica/recentes.js` — [Sonnet]

**Files:**
- Create: `public/js/logica/recentes.js`, `test/front/recentes.test.mjs`

**Interfaces:**
- Produces (`Recente = { id: string, name: string, usadoEm: number }`; `usadoEm` é acréscimo ao formato `[{ id, name }]` da spec, necessário para saber qual aba foi usada há mais tempo sem mudar a posição dela):
  - `LIMITE_RECENTES = 8`.
  - `abrirRecente(lista, { id, name }, agora: number, limite = 8): Recente[]` — existe → atualiza `usadoEm` e `name`, **mesma posição**; não existe → entra no índice 0; se passar do limite, remove o de menor `usadoEm` (nunca o recém-aberto).
  - `fecharRecente(lista, id, abaAtiva: string | null): { lista: Recente[], proximaAtiva: string | null }` — fechando a ativa: vizinha da direita, senão a da esquerda, senão `null`; fechando outra: `proximaAtiva = abaAtiva`.
  - `normalizarRecentes(valor: unknown): Recente[]` — aceita só array de objetos com `id` e `name` string; `usadoEm` ausente/inválido → 0; remove ids repetidos (fica o primeiro); corta em 8; qualquer outra coisa → `[]`.

- [ ] **Passo 1: Testes que falham:**

```js
let l = []; for (let i = 1; i <= 8; i++) l = abrirRecente(l, { id: `g${i}`, name: `G${i}` }, i);
assert.deepEqual(l.map(r => r.id), ['g8','g7','g6','g5','g4','g3','g2','g1']);          // inserção no início
l = abrirRecente(l, { id: 'g1', name: 'G1' }, 100);                                        // reativação
assert.equal(l.length, 8); assert.equal(l[7].id, 'g1'); assert.equal(l[7].usadoEm, 100);
l = abrirRecente(l, { id: 'g9', name: 'G9' }, 101);                                        // limite de 8
assert.equal(l.length, 8); assert.equal(l[0].id, 'g9'); assert.ok(!l.some(r => r.id === 'g2'));
assert.deepEqual(fecharRecente(l, 'g9', 'g9').proximaAtiva, 'g8');                         // vizinha da direita
assert.deepEqual(fecharRecente(l, 'g1', 'g1').proximaAtiva, l[6].id);                       // última → esquerda
assert.deepEqual(fecharRecente([l[0]], l[0].id, l[0].id), { lista: [], proximaAtiva: null });
for (const ruim of ['oi', null, 42, ['g1'], [{ id: 1 }], { id: 'x' }]) assert.deepEqual(normalizarRecentes(ruim), []);
assert.equal(normalizarRecentes(Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, name: 'x' }))).length, 8);
assert.equal(normalizarRecentes([{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }]).length, 1);
```
- [ ] **Passo 2:** → FAIL. **Passo 3:** Implementar (sem mutar a entrada). **Passo 4:** → PASS.
- [ ] **Passo 5:** Commit `feat: lista de recentes com limite de 8`.

### Tarefa 2.4: `estado.js` com preferências — [Opus]

**Files:**
- Create: `public/js/estado.js`, `test/front/estado.test.mjs`
- Modify: `public/js/{app,conexao,sidebar,grupo,lista,lote,exportar}.js` (trocar as variáveis globais `appState`, `selectedGroupIds`, `activeGroup`, `activeFilter`, `memberSearchTerm`, `sortColumn`, `sortAsc`, `batchResults` pelo estado)

**Interfaces:**
- Consumes: `normalizarRecentes` (2.3), `FILTROS` (2.2).
- Produces — formato do estado (Maps e Sets são **substituídos**, nunca mutados no lugar):

| Chave | Tipo | Padrão | localStorage |
|---|---|---|---|
| `conexao` | objeto do evento SSE `state` | `{ status: 'starting', groups: [] }` | — |
| `tema` | `'light' \| 'dark'` | `prefers-color-scheme` | `contatozap_theme` (texto) |
| `buscarFotos` | boolean | `false` | `contatozap_fetch_photos` (`'1'`/`'0'`) |
| `fixados` | `string[]` | `[]` | `contatozap_fixados` (JSON) |
| `recentes` | `Recente[]` | `[]` | `contatozap_recentes` (JSON, via `normalizarRecentes`) |
| `secoes` | `{ fixados: boolean, todos: boolean }` (true = aberta) | `{ fixados: true, todos: true }` | `contatozap_secoes` (JSON) |
| `sidebarRecolhida` | boolean | `false` | `contatozap_sidebar_recolhida` (`'1'`/`'0'`) |
| `modo` | `'lista' \| 'grade'` | `'lista'` | `contatozap_modo` (texto) |
| `tamanhoGrade` | `'P' \| 'M' \| 'G'` | `'M'` | `contatozap_tamanho_grade` (texto) |
| `tamanhoFotoExcel` | inteiro 20–500 | `100` | `contatozap_tamanho_foto_excel` (texto) |
| `abaAtiva` | `string \| null` | `null` | — |
| `grupos` | `Map<id, { status: 'carregando' \| 'pronto' \| 'erro', dados?: GrupoExtraido, erro?: string }>` | vazio | — |
| `visoes` | `Map<id, { filtro, busca, rolagem, ordenacao: { coluna: string \| null, asc: boolean } }>` | vazio | — |
| `selecionados` | `Set<string>` | vazio | — |
| `fichaAberta` | `string \| null` (id do participante) | `null` | — |
| `fotosGrupos` | `Map<id, string \| null>` | vazio | — |
| `lote` | `{ ativo: boolean, resultados: GrupoExtraido[] }` | `{ ativo: false, resultados: [] }` | — |

  - `carregarPreferencias(armazenamento = globalThis.localStorage): object` — lê as 9 chaves; valor inválido, JSON quebrado ou `getItem` que lança → padrão da chave.
  - `iniciarEstado(armazenamento?)`, `obterEstado()`, `atualizarEstado(patch)` (merge raso; grava as chaves persistidas que vieram no patch, engolindo erro de `setItem`; avisa os ouvintes uma vez com `chaves = Object.keys(patch)`), `aoMudar(fn: (estado, chaves: string[]) => void): () => void`.
  - `visaoDoGrupo(id)` (cria a padrão `{ filtro: 'todos', busca: '', rolagem: 0, ordenacao: { coluna: null, asc: true } }`) e `atualizarVisao(id, patch)` (avisa com `['visoes']`).

- [ ] **Passo 1: Testes que falham** (armazenamento falso `{ getItem, setItem }` sobre um `Map`):

```js
const padrao = carregarPreferencias(falso({}));
assert.equal(padrao.modo, 'lista'); assert.equal(padrao.tamanhoGrade, 'M'); assert.equal(padrao.tamanhoFotoExcel, 100);
const ruim = carregarPreferencias(falso({ contatozap_fixados: '{oi', contatozap_recentes: '"oi"', contatozap_secoes: '[1]',
  contatozap_modo: 'tabela', contatozap_tamanho_grade: 'XL', contatozap_tamanho_foto_excel: '9999' }));
assert.deepEqual(ruim.fixados, []); assert.deepEqual(ruim.recentes, []);
assert.deepEqual(ruim.secoes, { fixados: true, todos: true }); assert.equal(ruim.modo, 'lista');
assert.equal(ruim.tamanhoGrade, 'M'); assert.equal(ruim.tamanhoFotoExcel, 100);
assert.doesNotThrow(() => carregarPreferencias({ getItem() { throw new Error('bloqueado'); } }));
// persistência e aviso
const arm = falso({}); iniciarEstado(arm); const vistos = []; aoMudar((_, c) => vistos.push(c));
atualizarEstado({ modo: 'grade', abaAtiva: 'g1' });
assert.equal(arm.getItem('contatozap_modo'), 'grade'); assert.deepEqual(vistos, [['modo', 'abaAtiva']]);
atualizarEstado({ fixados: ['g1'] }); assert.equal(arm.getItem('contatozap_fixados'), '["g1"]');
```
- [ ] **Passo 2:** → FAIL. **Passo 3:** Implementar `estado.js` sem tocar em `document` (para rodar no Node; `prefers-color-scheme` só se `globalThis.matchMedia` existir). Religar as áreas: `app.js` chama `iniciarEstado()`, SSE `state` → `atualizarEstado({ conexao })`; cada área assina `aoMudar` e renderiza só quando `chaves` traz o que ela usa.
- [ ] **Passo 4:** → PASS; `node --check` nos módulos tocados. **Passo 5:** Commit `feat: estado central com preferências no localStorage`.

**Pronto quando:** testes passam; na rota `/`, tema, Fotos e tamanho da foto do Excel sobrevivem ao recarregar; trocar filtro/busca continua funcionando.

### Tarefa 2.5: Componente `avatar` na sidebar e na lista — [Sonnet]

**Files:**
- Create: `public/js/componentes/avatar.js`
- Modify: `public/js/sidebar.js`, `public/js/lista.js` (remover `createFallbackAvatar`), `public/css/base.css` (`.avatar`)

**Interfaces:**
- Consumes: `iniciais` (2.1), `corDoId` (2.1).
- Produces: `criarAvatar({ id, nome, foto = null, tamanho = 32, forma = 'circulo' }): HTMLElement` — `tamanho` em px ou `'preencher'` (100% do pai); `forma`: `'circulo' | 'quadrado'`. Sempre renderiza as iniciais com fundo `corDoId(id)`; com `foto`, põe um `<img loading="lazy" alt="">` por cima que se remove no `onerror` (sem aviso). `aria-hidden="true"` (o nome está ao lado).

- [ ] **Passo 1:** Implementar `criarAvatar` e usar na lista (coluna Foto, mantendo o clique que abre `abrirPreviewFoto`) e em cada item da sidebar (sem foto por enquanto).
- [ ] **Passo 2:** `rtk npm test` (o `dom-seguro` continua passando) e `node --check`.
- [ ] **Passo 3:** Commit `feat: componente de avatar com iniciais coloridas`.

**Pronto quando:** rota `/` → itens da sidebar com iniciais coloridas; no grupo, participante com foto quebrada mostra as iniciais; mesmo grupo sempre com a mesma cor.

**Conferência visual da Fase 2:** rota `/` → avatares coloridos na sidebar e na lista; buscar "joao" e "(11) 9" num grupo; recarregar e ver tema e Fotos preservados.

---

## Fase 3 — Sidebar nova e fotos dos grupos

### Tarefa 3.1: Fotos dos grupos no servidor — [Opus]

**Files:**
- Create: `lib/fotos-grupos.js`, `test/servidor/fotos-grupos.test.js`
- Modify: `whatsapp-extractor.js` (+ `getGroupPhoto`, exportado), `server.js` (rota `GET /api/group-photos`; `/api/clear-cache` chama `cacheFotos.limpar()`)

**Interfaces:**
- Produces:
  - `getGroupPhoto(client, groupId: string): Promise<string | null>` — `pupPage.evaluate` com `ProfilePicThumb.find(wid)` e depois `WAWebContactProfilePicThumbBridge.requestProfilePicFromServer(chat)` (mesmo `getPhotoFromModel` e timeout de 2500ms de `getGroupParticipants`); sem URL → `client.getProfilePicUrl(groupId)`; qualquer erro → `null`.
  - `TTL_FOTO_MS = 3_600_000`, `MAX_SIMULTANEAS = 3`, `MAX_IDS = 50`.
  - `criarCacheFotos({ buscar: (id) => Promise<string|null>, ttlMs = TTL_FOTO_MS, maxSimultaneas = MAX_SIMULTANEAS, agora = Date.now }): { obter(ids: string[]): Promise<Record<string, string|null>>, limpar(): void }` — entrada válida (`agora() - timestamp < ttlMs`) responde sem chamar `buscar`, inclusive `null`; o mesmo id já em andamento reaproveita a mesma promessa; `buscar` que lança → `null` na resposta, **sem** guardar no cache.
  - `lerIdsFotos(param: string | null): { ids: string[] } | { erro: string }` — separa por vírgula, `trim`, descarta vazios, remove repetidos; mais de 50 → `{ erro: 'Máximo de 50 ids por chamada.' }`.
  - Rota: `GET /api/group-photos?ids=a,b` → `state.status !== 'ready'` ou sem `client` → 503 `{ error: 'O WhatsApp ainda não está conectado.' }`; `erro` → 400 `{ error }`; ok → 200 `{ [id]: url | null }` (`ids` vazio → `{}`).

- [ ] **Passo 1: Testes que falham** (`buscar` falso com contador, atraso controlado e relógio injetado):

```js
// acerto
await cache.obter(['a']); await cache.obter(['a']); assert.equal(chamadas.a, 1);
// guarda do null
buscarRetorna.b = null; await cache.obter(['b']); await cache.obter(['b']); assert.equal(chamadas.b, 1);
// expiração
relogio += 3_600_000; await cache.obter(['a']); assert.equal(chamadas.a, 2);
// limite de concorrência: 10 ids pendurados → no máximo 3 em andamento ao mesmo tempo
assert.equal(picoSimultaneo, 3);
// mesmo id em andamento → uma chamada só
await Promise.all([cache.obter(['c']), cache.obter(['c'])]); assert.equal(chamadas.c, 1);
// erro não é guardado
falha.d = true; assert.deepEqual(await cache.obter(['d']), { d: null }); falha.d = false; await cache.obter(['d']); assert.equal(chamadas.d, 2);
// limpar
cache.limpar(); await cache.obter(['a']); assert.equal(chamadas.a, 3);
assert.deepEqual(lerIdsFotos(' a, b,,a '), { ids: ['a', 'b'] });
assert.ok('erro' in lerIdsFotos(Array.from({ length: 51 }, (_, i) => i).join(',')));
assert.deepEqual(lerIdsFotos(Array.from({ length: 50 }, (_, i) => i).join(',')).ids.length, 50);
```
- [ ] **Passo 2:** `node --test test/servidor/fotos-grupos.test.js` → FAIL.
- [ ] **Passo 3:** Implementar `lib/fotos-grupos.js` (fila própria; nada de `p-limit`), `getGroupPhoto` e a rota. No `server.js`: `const cacheFotos = criarCacheFotos({ buscar: (id) => getGroupPhoto(client, id) })`.
- [ ] **Passo 4:** → PASS; `node --check server.js whatsapp-extractor.js lib/fotos-grupos.js`.
- [ ] **Passo 5:** Commit `feat: fotos dos grupos com cache de 1h e fila de 3`.

**Pronto quando:** testes passam; com o WhatsApp conectado, `curl 'localhost:3000/api/group-photos?ids=<id>'` devolve URL ou `null`; desconectado devolve 503.

### Tarefa 3.2: Fotos dos grupos no front — [Sonnet]

**Files:**
- Create: `public/js/logica/agrupador.js`, `public/js/fotos-grupos.js`, `test/front/agrupador.test.mjs`
- Modify: `public/js/api.js` (+ `buscarFotosGrupos`)

**Interfaces:**
- Consumes: `estado.fotosGrupos`, `atualizarEstado` (2.4); rota de 3.1.
- Produces:
  - `criarAgrupador({ esperaMs = 150, maximo = 50, enviar: (ids: string[]) => void, agendar = setTimeout }): { adicionar(id: string): void, esquecer(id: string): void }` — ignora id já adicionado antes (pendente ou enviado); depois de `esperaMs` sem novo disparo agendado, envia os pendentes em pedaços de até `maximo`. `esquecer(id)` libera o id para nova tentativa.
  - `api.buscarFotosGrupos(ids): Promise<Record<string, string|null>>` (lança em `!res.ok`).
  - `fotos-grupos.js`: `observarFotoGrupo(elemento: HTMLElement, id: string): void` — `IntersectionObserver` único; id visível sem entrada em `estado.fotosGrupos` → `agrupador.adicionar(id)`; resposta → `atualizarEstado({ fotosGrupos: novoMap })`; falha (inclusive 503) → `esquecer` os ids, ficam as iniciais.

- [ ] **Passo 1: Testes que falham** (com `mock.timers` do `node:test`):

```js
const envios = []; const ag = criarAgrupador({ enviar: (ids) => envios.push(ids) });
ag.adicionar('a'); ag.adicionar('b'); ag.adicionar('a');
mock.timers.tick(149); assert.equal(envios.length, 0);
mock.timers.tick(1);  assert.deepEqual(envios, [['a', 'b']]);
// agrupador divide em lotes de 50
for (let i = 0; i < 120; i++) ag.adicionar(`g${i}`); mock.timers.tick(150);
assert.deepEqual(envios.slice(1).map(l => l.length), [50, 50, 20]);
ag.adicionar('a'); mock.timers.tick(150); assert.equal(envios.length, 4);       // já enviado
ag.esquecer('a'); ag.adicionar('a'); mock.timers.tick(150); assert.deepEqual(envios.at(-1), ['a']);
```
- [ ] **Passo 2:** → FAIL. **Passo 3:** Implementar os três. **Passo 4:** → PASS.
- [ ] **Passo 5:** Commit `feat: fotos dos grupos carregadas em lote conforme aparecem`.

### Tarefa 3.3: Sidebar com seções, fixados e filtro — [Sonnet]

**Files:**
- Create: `public/js/componentes/estrela.js`
- Modify: `public/js/sidebar.js`, `public/index.html` (estrutura da sidebar), `public/css/sidebar.css`

**Interfaces:**
- Consumes: `separarSecoes`, `filtrarGrupos` (2.2); `criarAvatar` (2.5); `observarFotoGrupo` (3.2); estado `fixados`, `secoes`, `fotosGrupos`, `conexao.groups`, `abaAtiva`; `abrirGrupo` (1.3 — trocado pelo de `abas.js` na 4.1).
- Produces: `criarEstrela({ ativa: boolean, rotulo: string, aoAlternar: () => void }): HTMLElement` — `<button aria-pressed>`, `aria-label` "Fixar <nome>"/"Desafixar <nome>"; `alternarFixado(id)` em `sidebar.js` (adiciona no fim / remove de `fixados`).

- [ ] **Passo 1:** Montar: filtro no topo (`filtrarGrupos`, sem acento); seções **Fixados** e **Todos** com título-botão (`aria-expanded`), contador (quantidade exibida após o filtro) e corpo recolhível salvo em `secoes`; item = avatar (com `observarFotoGrupo`) + nome + "N membros" + estrela (visível em `:hover`/`:focus-within`, sempre visível quando fixado); clique ou Enter no item → `abrirGrupo`; item ativo destacado. Fixado cujo grupo não existe some (via `separarSecoes`), sem apagar de `fixados`. Seção vazia de Fixados: "Clique na ☆ para fixar um grupo."
- [ ] **Passo 2:** `rtk npm test` e `node --check`. **Passo 3:** Commit `feat: sidebar com seções recolhíveis e grupos fixados`.

**Pronto quando:** rota `/` → fixar 2 grupos, recolher "Todos", recarregar: fixados e seção recolhida voltam; filtro "familia" acha "Família"; fotos dos grupos aparecem ao rolar (aba Network: chamadas `/api/group-photos` com ≤ 50 ids).

### Tarefa 3.4: Seleção para lote estilo Gmail, trilho e gaveta — [Sonnet]

**Files:**
- Modify: `public/js/sidebar.js`, `public/index.html` (botões « » e ☰), `public/css/sidebar.css`, `public/css/layout.css`

**Interfaces:**
- Consumes: estado `selecionados`, `sidebarRecolhida`, `fixados`; `iniciarLote` (1.3).
- Produces: `abrirGavetaSidebar()`, `fecharGavetaSidebar()` (exportados; usados pela ficha e pela busca rápida para fechar a gaveta ao navegar).

- [ ] **Passo 1:** Seleção: avatar vira checkbox (`<input type="checkbox" aria-label="Selecionar <nome>">`) em `:hover`/`:focus-within`; com `selecionados.size > 0`, todos os itens mostram checkbox (classe no contêiner). "Marcar todos" (grupos filtrados) e "Limpar" continuam; barra "Extrair selecionados" + "Fotos" no rodapé, só com seleção.
- [ ] **Passo 2:** Trilho (≥1024px): « recolhe para `var(--trilho-largura)` com só avatares (`title` e `aria-label` = nome), fixados primeiro, `<hr>` e os não fixados; » expande. Estado em `sidebarRecolhida`.
- [ ] **Passo 3:** Gaveta (<1024px): ☰ no topo abre a sidebar por cima com fundo escurecido; fecha no fundo, Esc ou ao abrir um grupo; foco vai para o filtro ao abrir e volta ao ☰ ao fechar.
- [ ] **Passo 4:** `node --check`; commit `feat: seleção estilo Gmail, trilho e gaveta da sidebar`.

**Pronto quando:** rota `/` em 1440px → passar o mouse num avatar mostra checkbox; marcar um faz todos mostrarem; extrair 2 em lote funciona; « vira trilho de 56px com fixados acima do divisor; em 800px o ☰ abre e fecha a gaveta.

**Conferência visual da Fase 3:** os quatro critérios acima, nos dois temas.

---

## Fase 4 — Abas de recentes, tela inicial e Ctrl+K

### Tarefa 4.1: Abas de recentes — [Opus]

**Files:**
- Create: `public/js/abas.js`, `public/js/componentes/aba.js`
- Modify: `public/js/grupo.js` (`abrirGrupo` sai daqui; fica `carregarGrupo`), `public/js/sidebar.js` (importa `abrirGrupo` de `abas.js`), `public/js/app.js`, `public/index.html` (faixa de abas acima do conteúdo), `public/css/layout.css`

**Interfaces:**
- Consumes: `abrirRecente`, `fecharRecente` (2.3); estado `recentes`, `abaAtiva`, `grupos`, `visoes`, `conexao.groups`, `fotosGrupos`; `criarAvatar`.
- Produces:
  - `abas.js`: `abrirGrupo({ id, name }): void` — **único ponto de entrada** para abrir grupo (sidebar, Ctrl+K, tela inicial, "Também está em"): `abrirRecente(recentes, grupo, Date.now())`, `abaAtiva = id`, e `carregarGrupo(id)` se não há entrada em `grupos`. `fecharAba(id): void` (usa `fecharRecente`; apaga `grupos`/`visoes` do id). `renderizarAbas()`.
  - `grupo.js`: `carregarGrupo(id, { atualizar = false } = {}): Promise<void>` — grava `grupos.set(id, { status: 'carregando' })`, chama `buscarGrupo(id, { atualizar, fotos: estado.buscarFotos })` e grava `pronto`/`erro`. Mantém o cache cliente `${id}:basic|with_photos` de hoje.
  - `criarAba({ id, nome, foto, ativa, aoAtivar, aoFechar }): HTMLElement` — `role="tab"`, `aria-selected`; × com `aria-label="Fechar <nome>"`; clique do meio (`auxclick`, `button === 1`) → `aoFechar`.

- [ ] **Passo 1:** Faixa de abas (`role="tablist"`, `overflow-x: auto`, a ativa rola para a vista); clique ativa; × e clique do meio fecham; fechar a ativa ativa a vizinha. Trocar de aba: salvar `rolagem` da área de conteúdo em `visoes` antes, restaurar depois de renderizar; filtro e busca vêm de `visaoDoGrupo(id)`; `modo` e `tamanhoGrade` são globais.
- [ ] **Passo 2:** Ao recarregar: abas voltam de `recentes`, a primeira fica ativa e só ela carrega. Quando `conexao.groups` chega e o id da aba ativa não está lá: área mostra "Grupo não encontrado" + botão "Fechar aba" (`fecharAba`). Erro de carga: estado de erro atual com "Tentar novamente" (`carregarGrupo(id, { atualizar: true })`).
- [ ] **Passo 3:** `rtk npm test` e `node --check`; commit `feat: abas de grupos recentes`.

**Pronto quando:** rota `/` → abrir 9 grupos pela sidebar: ficam 8 abas, sai a usada há mais tempo; reabrir um grupo já aberto só ativa (não muda de lugar); buscar "ana" na aba A, ir à aba B e voltar: busca e rolagem mantidas; recarregar: abas voltam.

### Tarefa 4.2: Tela inicial — [Sonnet]

**Files:**
- Modify: `public/js/grupo.js` (estado vazio), `public/css/grupo.css`

**Interfaces:**
- Consumes: `separarSecoes` (2.2), `abrirGrupo` (4.1), `criarAvatar`.
- Produces: `renderizarTelaInicial(contêiner: HTMLElement): void`.

- [ ] **Passo 1:** Sem aba aberta: título "Escolha um grupo", fixados como botões-atalho (avatar + nome + membros) que chamam `abrirGrupo`; sem fixados, "Fixe grupos na barra lateral para vê-los aqui."; dica "Pressione Ctrl K para buscar um grupo" (`⌘ K` quando `navigator.platform` contém `Mac`), com `<kbd>`.
- [ ] **Passo 2:** Commit `feat: tela inicial com atalhos dos fixados`.

**Pronto quando:** rota `/` → fechar todas as abas mostra a tela inicial com os fixados; clicar num atalho abre a aba.

### Tarefa 4.3: Busca rápida Ctrl+K — [Sonnet]

**Files:**
- Create: `public/js/busca-rapida.js`
- Modify: `public/js/app.js`, `public/index.html` (`<dialog id="buscaRapida">`), `public/css/layout.css`

**Interfaces:**
- Consumes: `resultadosBuscaRapida` (2.2), `abrirGrupo` (4.1), `fecharGavetaSidebar` (3.4), `criarAvatar`.
- Produces: `iniciarBuscaRapida(): void` (registra o atalho), `abrirBuscaRapida(): void`.

- [ ] **Passo 1:** `keydown` global: `(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'` → `preventDefault` e abre `dialog.showModal()` (fundo via `::backdrop`), guardando `document.activeElement`. Campo com `role="combobox"`, lista `role="listbox"`, opção ativa por `aria-activedescendant`. Vazio: fixados e recentes; digitando: todos os grupos filtrados sem acento. ↑/↓ navegam (sem passar das pontas), Enter → `abrirGrupo` + fecha, Esc fecha; ao fechar, foco volta ao elemento guardado. Só funciona com `conexao.status === 'ready'`.
- [ ] **Passo 2:** Commit `feat: busca rápida de grupos com Ctrl+K`.

**Pronto quando:** rota `/` → Ctrl+K abre; digitar "familia" + ↓ + Enter abre o grupo numa aba; Esc devolve o foco ao botão que estava focado.

**Conferência visual da Fase 4:** critérios das três tarefas.

---

## Fase 5 — Área do grupo

### Tarefa 5.1: `extractedAt` em `/api/group` — [Sonnet]

**Files:**
- Create: `lib/cache-participantes.js`, `test/servidor/cache-participantes.test.js`
- Modify: `server.js` (`getParticipants` usa o módulo)

**Interfaces:**
- Produces:
  - `TTL_PARTICIPANTES_MS = 300_000`.
  - `lerCacheParticipantes(cache: Map, id: string, comFotos: boolean, agora: number): (GrupoExtraido & { extractedAt: number }) | null` — mesma regra de hoje (chave `${id}:with_photos|basic`; sem fotos aceita a entrada `with_photos`); devolve **cópia rasa** de `data` com `extractedAt = entry.timestamp`; vencida → `null`.
  - `getParticipants` grava a entrada como hoje e devolve `{ ...data, extractedAt: timestamp }`; a rota segue somando `totalDurationMs`/`durationSec` na cópia, sem mexer no objeto do cache.

- [ ] **Passo 1: Testes que falham:**

```js
cache.set('g1:basic', { data: { id: 'g1', name: 'G', participants: [] }, timestamp: 1000 });
assert.equal(lerCacheParticipantes(cache, 'g1', false, 1000 + 299_999).extractedAt, 1000);
assert.equal(lerCacheParticipantes(cache, 'g1', false, 1000 + 300_000), null);
cache.set('g2:with_photos', { data: { id: 'g2', participants: [] }, timestamp: 5 });
assert.equal(lerCacheParticipantes(cache, 'g2', false, 10).extractedAt, 5);       // sem fotos aceita com fotos
assert.equal(lerCacheParticipantes(cache, 'g1', true, 1001), null);                // com fotos não aceita básico
lerCacheParticipantes(cache, 'g1', false, 1001).durationSec = 'x';
assert.equal(cache.get('g1:basic').data.durationSec, undefined);                   // não muta o cache
```
- [ ] **Passo 2:** → FAIL. **Passo 3:** Implementar e ligar. **Passo 4:** → PASS; `node --check server.js lib/cache-participantes.js`.
- [ ] **Passo 5:** Commit `feat: horário da extração na resposta do grupo`.

### Tarefa 5.2: Cabeçalho do grupo e menu Exportar — [Sonnet]

**Files:**
- Create: `public/js/componentes/menu.js`
- Modify: `public/js/grupo.js`, `public/js/exportar.js`, `public/index.html` (cabeçalho novo; sai a linha de botões antiga e `activeGroupDuration`), `public/css/grupo.css`

**Interfaces:**
- Consumes: `tempoRelativo` (2.1), `criarAvatar`, estado `buscarFotos`, `tamanhoFotoExcel`, `fotosGrupos`; `carregarGrupo` (4.1); `exportarCsv`, `exportarExcel`, `exportarJson`, `copiarTelefones` (1.3).
- Produces:
  - `criarMenu({ rotulo: string, principal = false, itens: Array<{ rotulo: string, aoEscolher: () => void } | { elemento: HTMLElement }> }): HTMLElement` — botão `aria-haspopup="menu"`, `aria-expanded`; Enter/Espaço/↓ abrem e focam o 1º item; ↑/↓ circulam entre itens clicáveis; Esc e clique fora fecham e devolvem o foco ao botão; `elemento` é inserido como está (não fecha o menu ao interagir).
  - `exportar.js`: `criarMenuExportar(grupo): HTMLElement` — itens "CSV", "Excel", `{ elemento: campo "Tamanho da foto no Excel (px)" }` logo abaixo do Excel (`type=number`, 20–500, passo 10, grava `tamanhoFotoExcel`), "JSON". `exportarExcel` lê o tamanho de `estado.tamanhoFotoExcel` (fim do `getExcelImageSize` lendo o DOM).

- [ ] **Passo 1:** Cabeçalho: à esquerda avatar do grupo, nome (`<h2>`) e "N participantes · extraído <tempoRelativo(extractedAt, Date.now())>" (sem `extractedAt`: só "N participantes"), atualizado a cada 60s enquanto visível; à direita, nesta ordem: Atualizar (só ícone, `aria-label="Atualizar participantes"` + `title`), checkbox Fotos (muda `buscarFotos` e recarrega a aba ativa), Copiar telefones, Exportar ▾ (`criarMenuExportar`, `principal: true`). Durante sincronização os botões seguem desativados como hoje (`EXPORT_BUTTON_IDS` → seletor por classe).
- [ ] **Passo 2:** `rtk npm test`; commit `feat: cabeçalho do grupo com menu Exportar`.

**Pronto quando:** rota `/`, abrir um grupo → "N participantes · extraído agora mesmo"; Exportar ▾ abre com teclado e mouse; CSV, Excel (com o tamanho escolhido, que persiste ao recarregar) e JSON geram arquivos iguais aos da Fase 1.

### Tarefa 5.3: Barra de filtros com chips e seletores — [Sonnet]

**Files:**
- Create: `public/js/componentes/chip-filtro.js`
- Modify: `public/js/grupo.js`, `public/index.html` (sai o bloco de métricas e as abas de filtro), `public/css/grupo.css`

**Interfaces:**
- Consumes: `contarFiltros`, `FILTROS` (2.2); `visaoDoGrupo`, `atualizarVisao`, estado `modo`, `tamanhoGrade` (2.4).
- Produces: `criarChipFiltro({ rotulo, contagem, ativo, aoClicar }): HTMLElement` — `<button aria-pressed>` com "Rótulo · N".

- [ ] **Passo 1:** Chips **Todos · Com telefone · Admins · Privados** com `contarFiltros` (grupo inteiro); clique grava `filtro` na visão da aba. À direita: busca "Buscar nome ou número…" (grava `busca`, com debounce de 150ms), seletor **Lista | Grade** (`role="radiogroup"`, grava `modo`) e, só com `modo === 'grade'`, **P | M | G** (grava `tamanhoGrade`). Em <768px a barra quebra linha, chips com rolagem horizontal.
- [ ] **Passo 2:** Commit `feat: chips de filtro no lugar das métricas`.

**Pronto quando:** rota `/` → chips mostram as mesmas contagens que os cards antigos; combinar "Admins" + busca filtra as duas coisas; o seletor P|M|G só aparece na Grade.

### Tarefa 5.4: Lista sem paginação com cabeçalho fixo — [Sonnet]

**Files:**
- Create: `public/js/componentes/linha-participante.js`
- Modify: `public/js/lista.js`, `public/index.html` (sai a paginação), `public/css/grupo.css`

**Interfaces:**
- Consumes: `filtrarParticipantes`, `ordenarParticipantes` (2.2), `criarAvatar`, `formatarTelefone`, `abrirPreviewFoto`, visão da aba (`filtro`, `busca`, `ordenacao`), estado `fichaAberta`.
- Produces:
  - `criarLinhaParticipante({ participante, indice, selecionada, aoAbrir, aoVerFoto }): HTMLTableRowElement` — `tabIndex = 0`; clique ou Enter → `aoAbrir(participante.id)`; clique na foto → `aoVerFoto` (com `stopPropagation`); `selecionada` → classe + `aria-selected="true"`; botão de copiar telefone como hoje.
  - `lista.js`: `renderizarLista(contêiner, participantes, { aoAbrir })`.

- [ ] **Passo 1:** Mesmas colunas e ordem: # · Foto · Nome WhatsApp · Nome agenda · Telefone · Admin · Status. Todas as linhas renderizadas (montar num `DocumentFragment`), sem paginação. `thead th { position: sticky; top: 0 }` dentro da área rolável. Ordenação por clique no cabeçalho grava `ordenacao` da visão (3º clique volta a `coluna: null`, como hoje). Redimensionamento da coluna Foto continua (`ativarRedimensionamentoFoto`, agora sobre o `th` fixo). `aoAbrir` grava `fichaAberta` (a ficha vem na 6.2; até lá só destaca a linha). Vazio: "Nenhum participante com esse filtro."
- [ ] **Passo 2:** Commit `feat: lista inteira com cabeçalho fixo`.

**Pronto quando:** rota `/`, grupo grande (~1.000) → rolagem com o cabeçalho visível; fotos só baixam ao aparecer (Network); ordenar e redimensionar Foto funcionam; Tab chega às linhas e Enter destaca a linha.

### Tarefa 5.5: Grade, esqueletos e aviso de grupos grandes — [Sonnet]

**Files:**
- Create: `public/js/grade.js`, `public/js/componentes/card-participante.js`, `public/css/grade.css`
- Modify: `public/js/grupo.js` (alterna lista/grade; esqueleto no carregamento), `public/index.html` (link do `grade.css`), `public/css/grupo.css`

**Interfaces:**
- Consumes: os mesmos de 5.4; estado `modo`, `tamanhoGrade`.
- Produces:
  - `criarCardParticipante({ participante, selecionado, aoAbrir }): HTMLElement` — `tabIndex = 0`, `role="button"`, `aria-label` com nome e telefone; foto quadrada via `criarAvatar({ tamanho: 'preencher', forma: 'quadrado' })` (sem foto: iniciais grandes); etiquetas "Admin" e "Privado" sobre a foto; nome e telefone (`font-family` mono) embaixo; clique ou Enter → `aoAbrir(participante.id)`.
  - `grade.js`: `renderizarGrade(contêiner, participantes, { tamanho, aoAbrir })` — `grid-template-columns: repeat(auto-fill, minmax(var(--grade-<p|m|g>), 1fr))`; `< 768px`: `repeat(2, 1fr)`.
  - `grupo.js`: `renderizarEsqueleto(contêiner, modo)` — cabeçalho + 12 cards ou 10 linhas cinza com pulso (`@keyframes` desligado em reduced-motion), mais o texto "Grupos com mais de 500 membros podem levar alguns segundos."

- [ ] **Passo 1:** Implementar; trocar o spinner de `loadingDetail` pelo esqueleto; `modo` decide `renderizarLista` ou `renderizarGrade` com a mesma lista filtrada/ordenada.
- [ ] **Passo 2:** `rtk npm test` e `node --check`; commit `feat: grade de participantes com tamanhos P, M e G`.

**Pronto quando:** rota `/` → Grade com P/M/G mudando a largura mínima dos cards (120/160/220px); Admin/Privado sobre a foto; sem foto, iniciais grandes; ao abrir grupo novo aparece o esqueleto com o aviso de 500 membros; preferências de modo e tamanho persistem.

**Conferência visual da Fase 5:** critérios das tarefas 5.2–5.5, nos dois temas, em 1440px e 375px.

---

## Fase 6 — Ficha do participante, responsividade e acessibilidade

### Tarefa 6.1: `/api/contact-groups` — [Sonnet]

**Files:**
- Modify: `lib/cache-participantes.js`, `test/servidor/cache-participantes.test.js`, `server.js`, `public/js/api.js`

**Interfaces:**
- Produces:
  - `gruposDoContato(cache: Map, { phone?: string, id?: string, exclude?: string }): Array<{ id, name }>` — percorre **todas** as entradas, sem olhar o TTL; se `apenasDigitos(phone)` não é vazio, casa participantes com os mesmos dígitos; senão, se `id`, casa por `participant.id === id`; sem nenhum dos dois → `[]`. Sem grupos repetidos (`basic` e `with_photos` do mesmo grupo contam uma vez), sem `exclude`, ordenado por nome (`localeCompare('pt-BR')`). Usa um `apenasDigitos` local (CJS; o do front é ESM).
  - Rota `GET /api/contact-groups?phone=<dígitos>|id=<serializado>[&exclude=<id>]` → 200 `[{ id, name }]`; sem `phone` e sem `id` → 400 `{ error: 'Informe phone ou id.' }`.
  - `api.buscarGruposDoContato({ phone, id, exclude }): Promise<Array<{ id, name }>>`.

- [ ] **Passo 1: Testes que falham** (cache com `g1:basic` e `g1:with_photos` contendo `5511999` e o LID `x@lid` sem telefone; `g2:basic` com `+55 11 999` e outro LID `y@lid` sem telefone; `g3:basic` velho, timestamp 0, com `5511999`; nomes `A`, `B`, `C`):

```js
assert.deepEqual(gruposDoContato(cache, { phone: '5511999' }).map(g => g.id), ['g1', 'g2', 'g3']);  // por telefone, ignora TTL, sem repetidos
assert.deepEqual(gruposDoContato(cache, { phone: '5511999', exclude: 'g1' }).map(g => g.id), ['g2', 'g3']);
assert.deepEqual(gruposDoContato(cache, { id: 'x@lid' }).map(g => g.id), ['g1']);                     // por id
// telefone vazio não casa com outros sem telefone
assert.deepEqual(gruposDoContato(cache, { phone: '', id: 'x@lid' }).map(g => g.id), ['g1']);
assert.deepEqual(gruposDoContato(cache, { phone: '' }), []);
assert.deepEqual(gruposDoContato(new Map(), { phone: '5511999' }), []);
```
- [ ] **Passo 2:** → FAIL. **Passo 3:** Implementar. **Passo 4:** → PASS; `node --check`.
- [ ] **Passo 5:** Commit `feat: grupos em comum de um contato`.

### Tarefa 6.2: Painel e ficha do participante — [Sonnet]

**Files:**
- Create: `public/js/componentes/painel.js`, `public/js/ficha.js`, `public/css/ficha.css`
- Modify: `public/js/grupo.js`, `public/js/lista.js`, `public/js/grade.js` (passar `aoAbrir` e foco de origem), `public/index.html`, `public/css/layout.css`

**Interfaces:**
- Consumes: `buscarGruposDoContato` (6.1), `vizinhoNaLista`, `filtrarParticipantes`, `ordenarParticipantes` (2.2), `apenasDigitos`, `formatarTelefone`, `criarAvatar`, `abrirPreviewFoto`, `copiarTexto`, `abrirGrupo` (4.1); estado `fichaAberta`, `abaAtiva`, `grupos`, `visoes`.
- Produces:
  - `criarPainel({ titulo, conteudo: HTMLElement, aoFechar }): HTMLElement` — `<aside role="dialog" aria-labelledby>` com ✕ (`aria-label="Fechar"`) e fundo próprio (`.painel-fundo`) que só aparece abaixo de 1280px; Esc e clique no fundo → `aoFechar`.
  - `ficha.js`: `abrirFicha(participanteId, origem: HTMLElement)`, `fecharFicha()`, `renderizarFicha()`.

- [ ] **Passo 1:** Conteúdo: foto grande (`criarAvatar` 160px; clique abre `abrirPreviewFoto(photoUrl)` quando há foto), nome do WhatsApp, nome na agenda, telefone (`formatarTelefone`), etiquetas Admin/Privado, botões **Copiar** (telefone) e **Abrir no WhatsApp** (`<a href="https://wa.me/<dígitos>" target="_blank" rel="noopener">`; sem telefone vira botão `disabled` com `title="Sem telefone visível"`).
- [ ] **Passo 2:** "Também está em": `buscarGruposDoContato({ phone: hidden ? '' : phone, id, exclude: abaAtiva })` → avatar + nome, clique → `abrirGrupo`; carregando: 3 linhas esqueleto; vazio ou erro: "Nenhum outro grupo extraído com essa pessoa."; resposta atrasada de outra pessoa é descartada (compara o id pedido com `fichaAberta`).
- [ ] **Passo 3:** Comportamento: clicar em outra pessoa troca o conteúdo sem fechar; ↑/↓ (fora de campos de texto) → `vizinhoNaLista` sobre a lista filtrada e ordenada da aba, rolando o card/linha para a vista; Esc/✕ fecham e devolvem o foco ao card/linha de origem (procurado por `data-id` se re-renderizado). Trocar de aba fecha a ficha. Layout: ≥1280px divide a tela (grid de duas colunas, ficha 360px); abaixo é gaveta por cima com fundo; <768px gaveta em tela cheia.
- [ ] **Passo 4:** `rtk npm test` e `node --check`; commit `feat: ficha do participante com grupos em comum`.

**Pronto quando:** rota `/` em 1440px → clicar numa linha abre a ficha ao lado sem cobrir a lista; ↓ passa para a próxima pessoa do filtro atual; "Também está em" lista outro grupo já extraído com a mesma pessoa e clicar abre a aba; Esc fecha e o foco volta à linha. Em 1100px a ficha cobre o conteúdo com fundo escuro.

### Tarefa 6.3: Responsividade final e acessibilidade — [Sonnet]

**Files:**
- Modify: `public/css/{base,layout,sidebar,grupo,grade,ficha}.css`, `public/js/grupo.js` (botões do cabeçalho), `README.md` (seção de estrutura: `public/`, `lib/`, `npm test`)

**Interfaces:**
- Consumes: tudo das fases anteriores; nenhuma interface nova.

- [ ] **Passo 1:** Conferir e ajustar contra a tabela da spec: `< 768px` (☰ + gaveta, grade 2 colunas, ficha tela cheia, botões do cabeçalho quebram linha, Exportar no cabeçalho); `768–1023px` (☰ + gaveta, grade automática, ficha gaveta); `1024–1279px` (sidebar fixa ou trilho, ficha gaveta por cima); `≥ 1280px` (ficha divide a tela). Nenhum `max-width` no container da página.
- [ ] **Passo 2:** `@media (pointer: coarse)`: botões, chips, abas, itens da sidebar, estrela, ×, checkbox e itens de menu com `min-height`/`min-width: var(--alvo-toque)`. `@media (prefers-reduced-motion: reduce)`: sem transições de gaveta/painel e sem pulso dos esqueletos. `:focus-visible` com anel `--color-border-focus` em todos os interativos novos (aba, chip, card, linha, item da sidebar, opção do Ctrl+K).
- [ ] **Passo 3:** Gate de fechamento: `rtk npm test` → tudo PASS; `node --check` em `server.js`, `whatsapp-extractor.js`, `lib/*.js` e em cada arquivo de `public/js/**` (ex.: `for f in $(git ls-files 'public/js/*.js' 'public/js/**/*.js'); do node --check "$f" || exit 1; done`).
- [ ] **Passo 4:** Commit `feat: ajustes finais de responsividade e acessibilidade`.

**Pronto quando:** DevTools em 375, 800, 1100 e 1440px batem com a tabela; emulação de toque mostra alvos ≥ 44px; "Emular prefers-reduced-motion" desliga as animações; dá para abrir grupo, trocar filtro, abrir ficha e exportar só com teclado.

**Conferência visual da Fase 6:** critérios de 6.2 e 6.3 nos dois temas.
