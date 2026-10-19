# Redesign da interface — ContatoZap

Data: 2026-10-19
Status: aprovado no brainstorming
Mockups de referência: `.superpowers/brainstorm/` (local, fora do git)

## Objetivo

Deixar a interface web mais intuitiva, agradável e responsiva:

- visão em grade dos participantes, além da lista;
- lista ocupando a tela toda;
- fotos dos grupos;
- sidebar com seções recolhíveis;
- recentes acessíveis no topo.

Extras aprovados: ficha do participante com "Também está em", barra de ações enxuta (filtros no lugar das métricas, menu Exportar único), grupos fixados e busca rápida Ctrl+K.

## Fora do escopo

- Lógica de extração, conexão/QR, extração em lote e modo CLI (`extrator-seletor.js`). Só a casca visual delas muda.
- Formato dos arquivos exportados. A exportação continua saindo o grupo inteiro, independente do filtro.
- Persistência em disco dos participantes extraídos. Eles continuam só na memória do servidor.

## Decisões visuais

| Tema | Decisão |
|---|---|
| Estrutura geral | Sidebar com **Fixados** e **Todos**. Os **recentes** viram abas acima do conteúdo. |
| Grade | Galeria: a foto ocupa o card, com nome e telefone embaixo. Tamanho P/M/G. |
| Ficha do participante | Painel lateral que divide a tela (≥1280px). Abaixo disso abre como gaveta por cima. |
| Celular | ☰ abre a sidebar como gaveta. Exportar fica no cabeçalho do grupo. |
| Paleta | Teal da marca (`#0D9488`, do `docs/brand.md`) como cor primária, interface clara. Botões primários com fundo `#0F766E` (texto branco, contraste 5,5:1, WCAG AA). O modo escuro continua. |

O `docs/design.md` passa a usar o teal como `--color-primary` (e as variações hover/active/subtle), nos modos claro e escuro, para acabar com a divergência com o `brand.md`.

## 1. Arquitetura

### Front sem etapa de build

O `index.html` da raiz (HTML + CSS + JS em 2.121 linhas) vira a pasta `public/`:

```
public/
  index.html            só a estrutura da página
  package.json          {"type":"module"} — permite importar os módulos no node --test
  css/
    tokens.css          cores (teal), espaçamentos, raios, sombras, tipografia, claro/escuro
    base.css  layout.css  sidebar.css  grupo.css  grade.css  ficha.css
  js/
    app.js              ponto de entrada; liga as áreas
    api.js              todas as chamadas HTTP e SSE (/api/events)
    estado.js           estado central + preferências no localStorage; emite eventos de mudança
    conexao.js          QR, status, reconexão (código atual migrado)
    lote.js             extração em lote (código atual migrado)
    sidebar.js          filtro, seções recolhíveis, fixados, trilho, gaveta no celular, seleção para lote
    abas.js             abas de recentes
    busca-rapida.js     Ctrl+K / ⌘K
    grupo.js            cabeçalho, chips, busca, alternância lista/grade, P/M/G
    lista.js            tabela de participantes
    grade.js            galeria de participantes
    ficha.js            painel do participante
    exportar.js         menu Exportar (CSV, Excel, JSON) e Copiar telefones
    logica/             funções puras, testáveis no Node
      texto.js          normalização sem acento e minúsculas, busca
      recentes.js       lista de recentes com limite (LRU)
      filtros.js        filtros e contagens dos chips, ordenação
      cor.js            cor fixa do avatar a partir do id
    componentes/        peças reutilizáveis, sem estado próprio
      avatar.js  estrela.js  chip-filtro.js  aba.js
      card-participante.js  linha-participante.js  menu.js  painel.js
```

**Contrato dos componentes**
- Cada componente é uma função `criarX(props)` que devolve um `HTMLElement`.
- Componentes não guardam estado e não chamam a API. As ações saem por callbacks recebidos em `props`, como `aoClicar` ou `aoFixar`.
- Quem guarda o estado é o `estado.js`. As áreas (`sidebar.js`, `grade.js`…) leem o estado, montam os componentes e voltam a renderizar quando chega o evento de mudança.

**`avatar.js`**
- É o componente usado em todo lugar: sidebar, trilho, abas, lista, grade, ficha e cabeçalho.
- Props: `{ id, nome, foto, tamanho, forma }`.
- Mostra as iniciais na cor calculada por `cor.js` enquanto a foto não chega ou se ela falhar (`onerror`). A foto usa `loading="lazy"`.

**Chaves no localStorage**
- Já existentes: `contatozap_theme` e `contatozap_fetch_photos`.
- Novas:
  - `contatozap_fixados`: ids;
  - `contatozap_recentes`: `[{ id, name }]`;
  - `contatozap_secoes`: seções abertas ou fechadas;
  - `contatozap_sidebar_recolhida`;
  - `contatozap_modo`: `lista` ou `grade`;
  - `contatozap_tamanho_grade`: `P`, `M` ou `G`;
  - `contatozap_tamanho_foto_excel`.

### Servidor (`server.js`)

- `GET /` serve `public/index.html` com `Cache-Control: no-store`.
- `GET /css/*` e `GET /js/*` servem arquivos de `public/` com o Content-Type correto e `no-store`.
  - O caminho é resolvido com `path.resolve` e recusado (404) se cair fora de `public/`.
- `/exceljs.min.js` continua como está.
- Novos endpoints:
  - `GET /api/group-photos?ids=a,b,c`: responde `{ [id]: url | null }`.
  - `GET /api/contact-groups?phone=<dígitos>` ou `?id=<id serializado>`: responde `[{ id, name }]`.
- O `index.html` da raiz é removido depois da migração. O `iniciar.bat` e o `iniciar.sh` continuam iguais.

## 2. Navegação

### Sidebar (≥1024px)

- No topo, o filtro de grupos (sem acento e sem diferenciar maiúsculas). Abaixo, as seções **Fixados** e **Todos**, cada uma com contador e recolhível pelo título; o estado fica salvo.
- Cada item mostra avatar, nome e número de membros.
  - A estrela aparece ao passar o mouse ou com foco, e fica sempre visível nos fixados.
  - Clicar no item abre o grupo (cria ou ativa a aba).
- **Seleção para lote no estilo Gmail:**
  - o avatar vira checkbox ao passar o mouse;
  - depois que um grupo é marcado, todos os itens mostram checkbox;
  - "Marcar todos" e "Limpar" continuam;
  - a barra "Extrair selecionados" (com a opção Fotos) continua no rodapé da sidebar.
- **Trilho (sidebar recolhida):**
  - o botão « recolhe a sidebar para 56px, só com os avatares e o nome no tooltip;
  - fixados primeiro, depois um divisor e os demais;
  - o botão » expande de novo.
- **Fotos dos grupos:** um `IntersectionObserver` junta os ids que ficam visíveis e, a cada ~150ms, faz uma única chamada `/api/group-photos`. O resultado fica guardado em memória no navegador.

### Abas de recentes

- Abrir um grupo (pela sidebar, pelo Ctrl+K ou por "Também está em") cria a aba no início da faixa. Se a aba já existe, só ativa.
- O limite é de 8 abas; passando disso, sai a usada há mais tempo (`logica/recentes.js`).
- Cada aba mostra avatar, nome e ×. Fecha no × ou com o clique do meio. Fechar a aba ativa ativa a vizinha.
- As abas ficam salvas em `contatozap_recentes` e voltam ao recarregar a página.
- Cada aba guarda na memória da página o filtro, a busca e a rolagem. O modo lista/grade e o tamanho P/M/G valem para todas.
- Quando as abas não cabem, a faixa rola na horizontal.
- Sem nenhuma aba aberta, aparece uma tela inicial com os fixados como atalhos e a dica do Ctrl+K.

### Busca rápida

- Ctrl+K ou ⌘K abre uma caixa central com fundo escurecido.
- Sem nada digitado, lista fixados e recentes. Ao digitar, filtra todos os grupos sem acento.
- ↑/↓ navegam, Enter abre o grupo numa aba, Esc fecha. O foco volta para onde estava.

### Responsividade

| Largura | Comportamento |
|---|---|
| < 768px | ☰ abre a sidebar como gaveta; grade com 2 colunas; ficha como gaveta de tela cheia; botões do cabeçalho podem quebrar linha |
| 768–1023px | ☰ abre a sidebar como gaveta; grade com colunas automáticas; ficha como gaveta |
| 1024–1279px | sidebar fixa (ou trilho); ficha como gaveta por cima |
| ≥ 1280px | sidebar fixa (ou trilho); ficha divide a tela |

- O container da página não tem largura máxima: o conteúdo ocupa todo o espaço ao lado da sidebar.
- Alvos de toque têm no mínimo 44px em telas de toque (`pointer: coarse`).
- As animações respeitam `prefers-reduced-motion`.

## 3. Área do grupo

### Cabeçalho

- À esquerda: avatar do grupo, nome e "N participantes · extraído há X".
  - O "há X" vem de um campo novo `extractedAt` na resposta de `/api/group`, com o timestamp da entrada no `participantsCache`.
- À direita, nesta ordem:
  - **Atualizar** (só ícone, com `aria-label` e tooltip);
  - **Fotos** (checkbox atual);
  - **Copiar telefones**;
  - **Exportar ▾** como botão principal.
- O menu Exportar (componente `menu.js`) tem CSV, Excel e JSON. O campo "Tamanho da foto no Excel (px)" fica dentro do menu, junto do Excel.
- A lógica de exportação atual é reaproveitada sem mudar o formato dos arquivos.

### Barra de filtros

- Chips com contagem: **Todos · Com telefone · Admins · Privados**. Substituem os 4 cards de métricas e as abas de filtro atuais.
- À direita: busca por nome ou número, seletor **Lista | Grade** e, só na grade, o seletor **P | M | G**.

### Lista

- Mesmas colunas e ordem de hoje: # · Foto · Nome WhatsApp · Nome agenda · Telefone · Admin · Status.
- Mantém a ordenação por coluna e o redimensionamento da coluna Foto.
- O cabeçalho da tabela fica fixo ao rolar.
- A paginação sai: todos os participantes são renderizados (o máximo de um grupo é ~1.000) e as fotos usam `loading="lazy"`.
- Clicar numa linha, ou Enter com ela em foco, abre a ficha. A linha aberta fica destacada.

### Grade

- `card-participante.js`: foto quadrada ocupando o card, com nome e telefone (em fonte mono) embaixo.
- As etiquetas "Admin" e "Privado" ficam sobre a foto. Sem foto, aparecem as iniciais grandes.
- A grade usa `repeat(auto-fill, minmax(<P|M|G>, 1fr))`, com P = 120px, M = 160px e G = 220px.
- Os cards recebem foco pelo teclado. Clique ou Enter abre a ficha.

### Ficha do participante (`ficha.js` + `painel.js`)

- **Conteúdo:**
  - foto grande (clicar abre a original, como no preview atual);
  - nome do WhatsApp, nome na agenda e telefone;
  - etiquetas Admin e Privado;
  - botões **Copiar** (telefone) e **Abrir no WhatsApp** (`https://wa.me/<dígitos>`, em nova aba). O segundo fica desativado, com dica, quando não há telefone.
- **Também está em:** chama `/api/contact-groups` e lista avatar e nome de cada grupo. Clicar abre o grupo numa aba. Sem resultado: "Nenhum outro grupo extraído com essa pessoa."
- **Comportamento:**
  - Clicar em outra pessoa troca o conteúdo sem fechar o painel.
  - ↑/↓ passam para a pessoa anterior ou a seguinte, na ordem filtrada atual.
  - Esc ou ✕ fecham e devolvem o foco ao card ou à linha de origem.

### Carregamento

- Esqueletos (cabeçalho e cards ou linhas cinza com pulso suave) no lugar do spinner.
- O aviso de grupos com mais de 500 membros continua.

## 4. Servidor

### Fotos dos grupos

- `getGroupPhoto(client, groupId)` no `whatsapp-extractor.js`:
  - reaproveita o caminho já usado para os participantes (`ProfilePicThumb.find` e, em seguida, `requestProfilePicFromServer`);
  - se não achar, tenta `client.getProfilePicUrl(groupId)`;
  - devolve `string | null`.
- O cache fica na memória do servidor: `id → { url, timestamp }`, por 1h, guardando também o `null`.
- Fila com no máximo 3 consultas simultâneas ao WhatsApp.
- `/api/group-photos` aceita até 50 ids por chamada e responde 503 se o WhatsApp não está pronto.
- `/api/clear-cache` limpa também esse cache.

### "Também está em"

- Percorre todas as entradas do `participantsCache`, ignorando o TTL de 5 minutos (os dados valem como retrato de quando foram extraídos).
- Compara pelos dígitos do telefone; quando não há telefone, compara pelo id serializado.
- Responde `[{ id, name }]` sem grupos repetidos e sem o grupo de origem (parâmetro opcional `exclude`).

## 5. Erros e casos de borda

| Situação | Comportamento |
|---|---|
| Foto do grupo ou do participante falha ou expira | Iniciais, sem aviso |
| Fixado ou aba de um grupo que não existe mais | Fixado escondido quando a lista de grupos carrega; aba mostra "Grupo não encontrado" com o botão "Fechar aba" |
| Caminho fora de `public/` | 404 |
| Erro ao carregar o grupo | Estado de erro atual, com "Tentar novamente" |
| WhatsApp desconectado | Fluxo atual de status e QR, sem mudança |
| `/api/contact-groups` sem cache | Lista vazia e a mensagem de vazio |
| localStorage corrompido | Ignora a chave e usa o padrão |

## 6. Testes

- Comando `npm test` → `node --test`, sem dependência nova. Os testes ficam em `test/`.
- **Servidor:**
  - resolução de caminho dos arquivos estáticos, incluindo `../` e caminhos codificados;
  - cache de fotos (acerto, expiração, guarda do `null`, limite de concorrência), com o cliente simulado;
  - busca de "Também está em" (por telefone, por id, sem repetidos, excluindo o grupo de origem).
  - Para isso, as funções puras saem do `server.js` para um módulo testável.
- **Front, só `public/js/logica/`:**
  - `texto.js`: sem acento e sem diferenciar maiúsculas;
  - `recentes.js`: inserção, reativação, limite de 8, remoção;
  - `filtros.js`: contagens dos chips e combinação de filtro com busca;
  - `cor.js`: a mesma entrada gera sempre a mesma cor.
- **Visual:** o usuário confere no app ao fim de cada fase, com a rota e o que olhar informados. O servidor de desenvolvimento quem sobe é o usuário.
- **Lint:** o projeto não tem eslint configurado. A checagem é `node --check` nos arquivos JS do servidor.
