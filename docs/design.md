# Design System — ContatoZap

> Documento autocontido. Qualquer desenvolvedor deve conseguir implementar a UI completa lendo apenas este arquivo, sem consultar código de referência.

---

## 1. Princípios de Design

| # | Princípio | Significado prático |
|---|-----------|---------------------|
| 1 | Clareza sobre decoração | Dados são o produto; ornamentos competem com eles. Cada elemento visual deve justificar sua existência. |
| 2 | Confiança através da consistência | Tokens repetidos criam ritmo previsível. O usuário confia na interface porque ela não surpreende. |
| 3 | Densidade ajustável | Tabelas e listas suportam modos compacto, padrão e confortável via tokens de espaçamento. |
| 4 | Estado sempre visível | Loading, erro, vazio e sucesso têm representação explícita. Nunca há tela "branca" ou ambígua. |
| 5 | Neutro como marca | A paleta é intencionalmente contida. Cor é sinal, não identidade. A marca vive no nome e no tom profissional. |

---

## 2. Tokens de Cor

Todos os valores estão em HSL (sem parênteses). Use `hsl(var(--token))` no consumo.

### 2.1 Light Mode

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg-primary` | `0 0% 100%` | Fundo principal de páginas e cards |
| `--color-bg-secondary` | `210 20% 97%` | Fundo de sidebars, painéis secundários |
| `--color-bg-tertiary` | `210 18% 94%` | Fundo de inputs desabilitados, badges neutras |
| `--color-bg-inverse` | `215 25% 18%` | Fundo de tooltips, elementos invertidos |
| `--color-text-primary` | `215 25% 12%` | Texto principal, títulos |
| `--color-text-secondary` | `215 15% 40%` | Descrições, labels secundários |
| `--color-text-tertiary` | `215 10% 55%` | Placeholders, timestamps, metadados |
| `--color-text-inverse` | `0 0% 100%` | Texto sobre fundos escuros |
| `--color-border-default` | `210 15% 88%` | Bordas sutis, divisores |
| `--color-border-strong` | `210 15% 78%` | Bordas de inputs, separadores fortes |
| `--color-border-focus` | `215 60% 55%` | Ring de foco acessível |
| `--color-primary` | `215 25% 40%` | Botões primários, links, ações principais |
| `--color-primary-hover` | `215 28% 34%` | Hover de primary |
| `--color-primary-active` | `215 30% 28%` | Active/pressed de primary |
| `--color-primary-subtle` | `215 40% 95%` | Backgrounds de destaque suave |
| `--color-success` | `152 55% 38%` | Confirmação, status positivo |
| `--color-success-subtle` | `152 45% 94%` | Fundo de toast/badge success |
| `--color-warning` | `38 90% 48%` | Atenção, dados incompletos |
| `--color-warning-subtle` | `38 80% 94%` | Fundo de toast/badge warning |
| `--color-error` | `0 65% 50%` | Erros, falhas, validação |
| `--color-error-subtle` | `0 55% 95%` | Fundo de toast/badge error |
| `--color-info` | `205 70% 48%` | Informação contextual |
| `--color-info-subtle` | `205 60% 94%` | Fundo de toast/badge info |

### 2.2 Dark Mode

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg-primary` | `215 20% 10%` | Fundo principal |
| `--color-bg-secondary` | `215 18% 14%` | Painéis secundários |
| `--color-bg-tertiary` | `215 16% 18%` | Inputs desabilitados, badges |
| `--color-bg-inverse` | `0 0% 95%` | Tooltips, elementos invertidos |
| `--color-text-primary` | `210 15% 92%` | Texto principal |
| `--color-text-secondary` | `210 12% 65%` | Descrições |
| `--color-text-tertiary` | `210 10% 50%` | Placeholders, metadados |
| `--color-text-inverse` | `215 25% 12%` | Texto sobre fundos claros |
| `--color-border-default` | `215 15% 22%` | Bordas sutis |
| `--color-border-strong` | `215 15% 32%` | Bordas de inputs |
| `--color-border-focus` | `215 55% 60%` | Ring de foco |
| `--color-primary` | `215 45% 60%` | Ações principais |
| `--color-primary-hover` | `215 48% 68%` | Hover de primary |
| `--color-primary-active` | `215 50% 74%` | Active/pressed de primary |
| `--color-primary-subtle` | `215 30% 18%` | Destaque suave |
| `--color-success` | `152 50% 50%` | Sucesso |
| `--color-success-subtle` | `152 35% 16%` | Fundo success |
| `--color-warning` | `38 85% 58%` | Atenção |
| `--color-warning-subtle` | `38 60% 16%` | Fundo warning |
| `--color-error` | `0 60% 60%` | Erro |
| `--color-error-subtle` | `0 45% 16%` | Fundo error |
| `--color-info` | `205 65% 58%` | Informação |
| `--color-info-subtle` | `205 45% 16%` | Fundo info |

### 2.3 Overlay

| Modo | Token | Valor |
|------|-------|-------|
| Light | `--color-overlay` | `hsla(215, 20%, 8%, 0.6)` |
| Dark | `--color-overlay` | `hsla(215, 20%, 4%, 0.7)` |

---

## 3. Tipografia

### 3.1 Famílias

| Contexto | Família | Fallback |
|----------|---------|----------|
| Interface geral | Inter | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` |
| Dados tabulares, números, código | JetBrains Mono | `"SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace` |

### 3.2 Escala tipográfica

Base: 16px. Razão: major-third (1.25).

| Token | Tamanho | Peso | Line-height | Letter-spacing | Uso |
|-------|---------|------|-------------|----------------|-----|
| `--text-display` | 32px / 2rem | 700 | 1.2 | -0.02em | Títulos de página hero, landing |
| `--text-h1` | 24px / 1.5rem | 600 | 1.3 | -0.015em | Título principal de seção |
| `--text-h2` | 20px / 1.25rem | 600 | 1.35 | -0.01em | Subseção, título de modal |
| `--text-h3` | 16px / 1rem | 600 | 1.4 | 0 | Título de card, header de tabela |
| `--text-body-lg` | 16px / 1rem | 400 | 1.5 | 0 | Corpo destacado, introduções |
| `--text-body` | 14px / 0.875rem | 400 | 1.5 | 0 | Corpo padrão, texto de UI |
| `--text-body-sm` | 13px / 0.8125rem | 400 | 1.45 | 0.005em | Labels, metadados, captions densos |
| `--text-caption` | 12px / 0.75rem | 400 | 1.4 | 0.01em | Timestamps, notas de rodapé, badges |
| `--text-mono` | 13px / 0.8125rem | 400 | 1.5 | 0 | Números em tabelas, telefones, IDs |

### 3.3 Regras de uso tipográfico

- Nunca usar peso maior que 700.
- Nunca usar tamanho menor que 12px (`--text-caption`).
- Textos mono nunca recebem letter-spacing negativo.
- Títulos de seção usam `--text-h1`; dentro de cards, `--text-h3`.
- Números de telefone, contadores e IDs sempre usam `--text-mono`.

---

## 4. Espaçamento e Layout

### 4.1 Escala de espaçamento

Base: 4px. Todos os tokens são múltiplos de 4.

| Token | Valor | px | Uso típico |
|-------|-------|----|------------|
| `--space-1` | 0.25rem | 4px | Gap entre ícone e texto inline |
| `--space-2` | 0.5rem | 8px | Padding interno de badges, gap compacto |
| `--space-3` | 0.75rem | 12px | Padding de inputs sm, gap entre linhas densas |
| `--space-4` | 1rem | 16px | Padding padrão de cards, gap entre elementos |
| `--space-5` | 1.25rem | 20px | Padding de modais, gap entre seções |
| `--space-6` | 1.5rem | 24px | Padding lateral de containers, gap grande |
| `--space-8` | 2rem | 32px | Margem vertical entre seções |
| `--space-10` | 2.5rem | 40px | Padding vertical de páginas |
| `--space-12` | 3rem | 48px | Header height, margem máxima |

> Nota: tokens 7, 9 e 11 existem na escala mas raramente são necessários. Prefira os pares adjacentes para manter ritmo visual.

### 4.2 Breakpoints (mobile-first)

| Token | Largura mínima | Contexto |
|-------|---------------|----------|
| `--bp-sm` | 640px | Mobile landscape, tablets pequenos |
| `--bp-md` | 768px | Tablets portrait, laptops pequenos |
| `--bp-lg` | 1024px | Laptops padrão, sidebar + conteúdo |
| `--bp-xl` | 1280px | Desktops largos, tabelas expandidas |

Regra: estilos base são mobile. Media queries usam `min-width`.

### 4.3 Grid e Containers

| Token | Valor | Uso |
|-------|-------|-----|
| `--container-sm` | 640px | Formulários estreitos, modais |
| `--container-md` | 768px | Listas de cards, conteúdo centralizado |
| `--container-lg` | 1024px | Layout com sidebar colapsada |
| `--container-xl` | 1280px | Layout completo com sidebar fixa |
| `--container-full` | 100% | Tabelas de largura total |

Grid: CSS Grid com 12 colunas em `--bp-lg`+. Gutters: `--space-4` (sm/md), `--space-6` (lg/xl).

### 4.4 Z-index Scale

| Token | Valor | Uso |
|-------|-------|-----|
| `--z-base` | 0 | Elementos estáticos |
| `--z-dropdown` | 10 | Menus dropdown, selects |
| `--z-sticky` | 20 | Headers sticky, breadcrumbs |
| `--z-sidebar` | 30 | Sidebar fixa |
| `--z-overlay` | 40 | Backdrop de modais |
| `--z-modal` | 50 | Modais, dialogs |
| `--z-toast` | 60 | Notificações flutuantes |
| `--z-tooltip` | 70 | Tooltips |

Regra: nunca usar z-index literal fora desta escala. Se precisar de um valor intermediário, adicione um novo token à escala.

### 4.5 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 4px | Badges, tags, checkboxes |
| `--radius-md` | 6px | Buttons, inputs, cards |
| `--radius-lg` | 8px | Modais, containers grandes |
| `--radius-full` | 9999px | Avatares circulares, pills |

### 4.6 Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px hsla(215, 20%, 8%, 0.06)` | Cards em repouso |
| `--shadow-md` | `0 4px 12px hsla(215, 20%, 8%, 0.08)` | Dropdowns, popovers |
| `--shadow-lg` | `0 12px 32px hsla(215, 20%, 8%, 0.12)` | Modais |
| `--shadow-focus` | `0 0 0 3px hsl(var(--color-border-focus) / 0.3)` | Ring de foco |

Dark mode: substituir `8%` por `40%` na opacidade das sombras.

---

## 5. Componentes Atômicos

### 5.1 Button

**Variantes:** primary, secondary, ghost, destructive.
**Tamanhos:** sm, md, lg.

| Propriedade | sm | md | lg |
|-------------|----|----|-----|
| Height | 28px | 36px | 44px |
| Padding horizontal | `--space-3` | `--space-4` | `--space-5` |
| Font size | `--text-body-sm` | `--text-body` | `--text-body-lg` |
| Icon size | 14px | 16px | 20px |
| Gap icon-text | `--space-1` | `--space-2` | `--space-2` |
| Border radius | `--radius-md` | `--radius-md` | `--radius-md` |

**Estados por variante:**

| Variante | Default | Hover | Active | Focus | Disabled |
|----------|---------|-------|--------|-------|----------|
| Primary | bg `--color-primary`, text `--color-text-inverse` | bg `--color-primary-hover` | bg `--color-primary-active` | ring `--shadow-focus` | opacity 0.4, cursor not-allowed |
| Secondary | border `--color-border-strong`, text `--color-text-primary`, bg transparent | bg `--color-bg-tertiary` | bg `--color-bg-secondary` | ring `--shadow-focus` | opacity 0.4 |
| Ghost | text `--color-text-secondary`, bg transparent | bg `--color-bg-tertiary`, text `--color-text-primary` | bg `--color-bg-secondary` | ring `--shadow-focus` | opacity 0.4 |
| Destructive | bg `--color-error`, text `--color-text-inverse` | bg mais escuro 8% | bg mais escuro 14% | ring `--shadow-focus` com cor error | opacity 0.4 |

**Regras:**
- Botão primary é a ação principal da tela; máximo 1 por contexto visual.
- Ghost nunca tem borda.
- Destructive só para ações irreversíveis ou de exclusão.
- Ícone sozinho usa padding quadrado (mesmo valor horizontal e vertical).
- Loading: substitui texto por spinner; mantém largura original.

### 5.2 Input

**Tipos:** text, search, select.
**Tamanhos:** sm, md.

| Propriedade | sm | md |
|-------------|----|-----|
| Height | 28px | 36px |
| Padding horizontal | `--space-3` | `--space-4` |
| Font size | `--text-body-sm` | `--text-body` |
| Border radius | `--radius-md` | `--radius-md` |

**Estados:**

| Estado | Borda | Fundo | Texto | Extra |
|--------|-------|-------|-------|-------|
| Default | `--color-border-default` | `--color-bg-primary` | `--color-text-primary` | — |
| Hover | `--color-border-strong` | `--color-bg-primary` | `--color-text-primary` | — |
| Focus | `--color-border-focus` | `--color-bg-primary` | `--color-text-primary` | ring `--shadow-focus` |
| Error | `--color-error` | `--color-bg-primary` | `--color-text-primary` | Mensagem abaixo em `--text-caption`, cor `--color-error` |
| Disabled | `--color-border-default` | `--color-bg-tertiary` | `--color-text-tertiary` | cursor not-allowed |
| Placeholder | — | — | `--color-text-tertiary` | — |

**Search input:** prefixo com ícone de lupa (16px, cor `--color-text-tertiary`). Sufixo opcional com botão clear (ghost, sm).

**Select:** seta chevron-down à direita (16px, cor `--color-text-tertiary`). Menu dropdown usa `--shadow-md`, border `--color-border-default`, radius `--radius-md`.

**Regras:**
- Label acima do input, usando `--text-body-sm`, cor `--color-text-secondary`, gap `--space-1`.
- Helper text abaixo, `--text-caption`, cor `--color-text-tertiary`.
- Input nunca tem fundo colorido; diferenciação é por borda.

### 5.3 Table

**Contexto:** exibição densa de contatos extraídos.

**Header:**
- Fundo: `--color-bg-secondary`
- Texto: `--text-body-sm`, weight 600, cor `--color-text-secondary`
- Padding: `--space-3` vertical, `--space-4` horizontal
- Borda inferior: `--color-border-default`
- Sortable: ícone seta bidirecional (12px) à direita do texto; ativo usa `--color-primary`

**Row:**
- Altura mínima: 44px (md), 36px (compact)
- Padding: `--space-3` vertical, `--space-4` horizontal
- Borda inferior: `--color-border-default` (1px)
- Hover: fundo `--color-bg-secondary`
- Selected: fundo `--color-primary-subtle`, borda esquerda 3px sólida `--color-primary`
- Zebra striping: opcional, alternar `--color-bg-primary` e `--color-bg-secondary`

**Cell:**
- Texto: `--text-body`, cor `--color-text-primary`
- Números e telefones: `--text-mono`
- Overflow: ellipsis com title nativo ou tooltip
- Alinhamento: texto à esquerda, números à direita

**Estados especiais:**
- Row disabled: opacity 0.5, pointer-events none
- Row loading: skeleton em cada cell

**Responsividade:**
- Abaixo de `--bp-md`: tabela horizontal scrollável com sticky first column
- Colunas opcionais escondidas progressivamente: priorizar nome > telefone > grupo > data

### 5.4 Card

**Variantes:** group-card (lista de grupos), contact-card (detalhe de contato).

| Propriedade | Group Card | Contact Card |
|-------------|-----------|--------------|
| Padding | `--space-4` | `--space-5` |
| Border | `--color-border-default` | `--color-border-default` |
| Radius | `--radius-md` | `--radius-lg` |
| Shadow | `--shadow-sm` | `--shadow-sm` |
| Max-width | 100% | `--container-sm` |

**Estados:**
- Default: shadow `--shadow-sm`
- Hover: shadow `--shadow-md`, border `--color-border-strong`
- Selected: border `--color-primary`, fundo `--color-primary-subtle`
- Active/pressed: shadow `--shadow-sm`

**Estrutura group-card:**
```
+------------------------------------------+
| [Avatar]  Nome do Grupo        [Badge]   |
|           XX contatos                     |
|           Última extração: DD/MM          |
+------------------------------------------+
```

**Estrutura contact-card:**
```
+------------------------------------------+
| [Avatar LG]  Nome                         |
|              +55 XX XXXXX-XXXX            |
|              Grupo: Nome do Grupo         |
|              Adicionado em: DD/MM/YYYY    |
|                                          |
|              [Ação 1]  [Ação 2]           |
+------------------------------------------+
```

### 5.5 Badge / Tag

**Tamanhos:** sm, md.

| Propriedade | sm | md |
|-------------|----|-----|
| Height | 18px | 22px |
| Padding horizontal | `--space-2` | `--space-2` |
| Font size | `--text-caption` | `--text-body-sm` |
| Radius | `--radius-full` | `--radius-full` |

**Variantes de cor:**

| Variante | Fundo | Texto | Uso |
|----------|-------|-------|-----|
| Neutral | `--color-bg-tertiary` | `--color-text-secondary` | Contadores genéricos |
| Primary | `--color-primary-subtle` | `--color-primary` | Status ativo, seleção |
| Success | `--color-success-subtle` | `--color-success` | Extração concluída |
| Warning | `--color-warning-subtle` | `--color-warning` | Parcial, pendente |
| Error | `--color-error-subtle` | `--color-error` | Falha |
| Info | `--color-info-subtle` | `--color-info` | Informativo |

**Regras:**
- Badge de contador: mínimo "0", nunca esconder zero.
- Badge de status: sempre acompanhada de label textual acessível.
- Nunca usar cor como único diferenciador (acessibilidade).

### 5.6 Toast / Notification

**Posição:** canto superior direito, fixo, z-index `--z-toast`.
**Largura:** 360px fixa, max-width 90vw em mobile.
**Padding:** `--space-4`.
**Radius:** `--radius-md`.
**Shadow:** `--shadow-md`.
**Auto-dismiss:** 5 segundos (success/info), manual (error/warning).

| Variante | Barra lateral | Fundo | Ícone |
|----------|--------------|-------|-------|
| Success | `--color-success` | `--color-bg-primary` | Check circle |
| Error | `--color-error` | `--color-bg-primary` | Alert circle |
| Warning | `--color-warning` | `--color-bg-primary` | Alert triangle |
| Info | `--color-info` | `--color-bg-primary` | Info circle |

**Estrutura:**
```
+--[cor]-----------------------------------+
| [Ícone]  Título (--text-body, 600)       |
|          Mensagem (--text-body-sm)       |
|                              [Fechar X]  |
+------------------------------------------+
```

**Barra lateral esquerda:** 4px sólida na cor da variante.

**Múltiplos toasts:** empilhar verticalmente com gap `--space-2`, máximo 3 visíveis; restantes em fila.

### 5.7 Modal / Dialog

**Overlay:** `--color-overlay`, z-index `--z-overlay`.
**Container:** z-index `--z-modal`, radius `--radius-lg`, shadow `--shadow-lg`, fundo `--color-bg-primary`.
**Padding:** `--space-6`.
**Max-width:** `--container-sm` (default), `--container-md` (wide).
**Animação:** fade-in overlay + scale-up container (150ms ease-out). Respeitar `prefers-reduced-motion`.

**Estrutura:**
```
+------------------------------------------+
| Título (--text-h2)              [X]      |
|                                          |
| Conteúdo                                 |
|                                          |
|                    [Cancelar] [Confirmar] |
+------------------------------------------+
```

**Regras:**
- Fechar com Escape, clique no overlay ou botão X.
- Focus trap: Tab cicla dentro do modal.
- Ao abrir, focus vai para o primeiro elemento interativo ou título.
- Ao fechar, focus retorna ao elemento que abriu o modal.
- Botão confirmatório: primary. Cancelamento: secondary ou ghost.
- Modal de confirmação destrutiva: botão primary torna-se destructive.

### 5.8 Avatar

**Tamanhos:** xs (24px), sm (32px), md (40px), lg (56px), xl (80px).
**Forma:** círculo (`--radius-full`).
**Borda:** 2px sólida `--color-bg-primary` (para sobreposição em listas).

**Fallback (sem foto):**
- Fundo: `--color-primary-subtle`
- Texto: iniciais do nome (máximo 2 caracteres), `--text-body-sm` (sm/md), `--text-h3` (lg/xl), cor `--color-primary`
- Se nome desconhecido: ícone de pessoa genérico, cor `--color-text-tertiary`

**Foto de perfil:**
- Object-fit: cover
- Carregamento: lazy loading
- Erro de carregamento: transição suave para fallback

### 5.9 Checkbox

**Tamanhos:** sm (16px), md (20px).
**Radius:** `--radius-sm`.
**Borda:** 2px sólida `--color-border-strong`.
**Transição:** 150ms ease.

**Estados:**

| Estado | Borda | Fundo | Checkmark |
|--------|-------|-------|-----------|
| Unchecked default | `--color-border-strong` | transparent | — |
| Unchecked hover | `--color-primary` | transparent | — |
| Checked | `--color-primary` | `--color-primary` | Branco, ícone check |
| Indeterminate | `--color-primary` | `--color-primary` | Branco, traço horizontal |
| Focus | ring `--shadow-focus` | — | — |
| Disabled | `--color-border-default` | `--color-bg-tertiary` | opacity 0.4 |

**Label:** à direita, gap `--space-2`, `--text-body`, cor `--color-text-primary`. Clickável (label associado).

**Uso em tabela:** checkbox na primeira coluna, alinhado verticalmente ao centro da row. Header com checkbox indeterminate para seleção parcial.

### 5.10 Tooltip

**Posicionamento:** top (default), bottom, left, right. Auto-flip se sair da viewport.
**Delay:** 300ms para mostrar, 0ms para esconder.
**Padding:** `--space-2` vertical, `--space-3` horizontal.
**Radius:** `--radius-sm`.
**Fundo:** `--color-bg-inverse`.
**Texto:** `--text-caption`, cor `--color-text-inverse`.
**Z-index:** `--z-tooltip`.
**Seta:** 6px, mesma cor do fundo, apontando para o trigger.
**Max-width:** 240px.

**Regras:**
- Nunca colocar informação crítica apenas em tooltip.
- Não usar em elementos touch-only.
- Acessível via aria-describedby.

### 5.11 Empty State

**Layout centralizado:** ícone/ilustração + título + descrição + ação opcional.
**Padding vertical:** `--space-10`.
**Max-width:** 400px, centralizado.

**Estrutura:**
```
            [Ícone 48px, --color-text-tertiary]

         Título (--text-h2, --color-text-primary)

     Descrição (--text-body, --color-text-secondary)

              [Botão de ação (opcional)]
```

**Variantes:**
- Lista vazia (nenhum grupo): ícone de pasta vazia, título "Nenhum grupo encontrado", descrição "Extraia grupos do WhatsApp para começar", botão "Extrair grupos".
- Busca sem resultados: ícone de lupa, título "Nenhum resultado", descrição "Tente ajustar os filtros ou termos de busca".
- Erro de extração: ícone de alerta, título "Falha na extração", descrição com motivo, botão "Tentar novamente".

### 5.12 Loading / Skeleton

**Skeleton line:**
- Height: corresponde ao token tipográfico do conteúdo esperado
- Radius: `--radius-sm`
- Fundo: gradiente linear animado `--color-bg-tertiary` → `--color-bg-secondary` → `--color-bg-tertiary`
- Animação: shimmer 1.5s infinite linear
- Largura: varia para simular texto natural (60%-100%)

**Spinner circular:**
- Tamanhos: sm (16px), md (24px), lg (32px)
- Cor: `--color-primary`
- Stroke: 2px (sm), 3px (md/lg)
- Animação: rotação 0.8s linear infinite

**Loading de página inteira:**
- Spinner centralizado + texto "Carregando..." (`--text-body`, `--color-text-secondary`)
- Se > 3 segundos, mostrar progresso estimado ou dica

**Respeitar prefers-reduced-motion:** substituir shimmer por pulso suave (opacity 0.5 ↔ 1, 2s).

### 5.13 Header / App Bar

**Height:** 56px (`--space-12` + ajuste).
**Fundo:** `--color-bg-primary`.
**Borda inferior:** `--color-border-default`.
**Z-index:** `--z-sticky`.
**Padding horizontal:** `--space-4` (mobile), `--space-6` (desktop).
**Sticky:** sim, top 0.

**Estrutura:**
```
+--------------------------------------------------+
| [Logo]  ContatoZap    [Busca...]     [User/Menu] |
+--------------------------------------------------+
```

- Logo: altura 28px, gap `--space-3` do texto
- Nome do app: `--text-h3`, cor `--color-text-primary`
- Área de busca: input search md, max-width 320px, flex-grow
- Menu do usuário: avatar sm + dropdown

**Mobile:** busca colapsa em ícone; logo e menu permanecem.

### 5.14 Sidebar / Navigation

**Largura:** 240px expandida, 64px colapsada.
**Fundo:** `--color-bg-secondary`.
**Borda direita:** `--color-border-default`.
**Z-index:** `--z-sidebar`.
**Padding:** `--space-4` vertical, `--space-3` horizontal.
**Transição:** width 200ms ease.

**Itens de navegação:**
- Height: 40px
- Padding: `--space-3` horizontal
- Radius: `--radius-md`
- Gap ícone-texto: `--space-2`
- Ícone: 20px, cor `--color-text-secondary`
- Texto: `--text-body`, cor `--color-text-secondary`

**Estados:**

| Estado | Fundo | Texto | Ícone |
|--------|-------|-------|-------|
| Default | transparent | `--color-text-secondary` | `--color-text-secondary` |
| Hover | `--color-bg-tertiary` | `--color-text-primary` | `--color-text-primary` |
| Active | `--color-primary-subtle` | `--color-primary` | `--color-primary` |
| Focus | ring `--shadow-focus` | — | — |

**Colapsada:** mostra apenas ícones; tooltip ao hover mostra label.

**Mobile:** overlay lateral, z-index `--z-modal`, backdrop `--color-overlay`. Toggle via hamburger no header.

---

## 6. Padrões de Composição

### 6.1 Lista de Contatos

**Modo tabela (default em desktop):**
- Tabela full-width com header sticky
- Primeira coluna: checkbox (seleção em massa)
- Colunas fixas: Nome, Telefone, Grupo
- Colunas opcionais: Data de entrada, Status
- Ações por linha: botões ghost sm (ver detalhes, copiar telefone)
- Footer: contador "XX de YY selecionados" + ações em massa

**Modo cards (mobile ou preferência):**
- Grid responsivo: 1 coluna (mobile), 2 colunas (md), 3 colunas (lg+)
- Cada card: contact-card com ações no rodapé
- Seleção: checkbox no canto superior direito do card

**Alternância:** toggle tabela/cards salvo em preferência local.

### 6.2 Header de Grupo com Ações

```
+----------------------------------------------------------+
| [Avatar MD]  Nome do Grupo                               |
|               1.234 contatos · Extraído em DD/MM/YYYY    |
|                                                          |
| [Exportar CSV] [Exportar Excel] [Atualizar] [⋮ Mais]     |
+----------------------------------------------------------+
```

- Avatar + nome: `--text-h1`
- Metadados: `--text-body-sm`, `--color-text-secondary`
- Ações: button secondary sm, gap `--space-2`
- Menu "Mais": dropdown com opções menos frequentes (renomear, excluir)

### 6.3 Filtros e Busca

**Barra de filtros (abaixo do header):**
```
+----------------------------------------------------------+
| [🔍 Busca...]  [Grupo ▼]  [Data ▼]  [Status ▼]  [Limpar]|
+----------------------------------------------------------+
```

- Input search: flex-grow, max-width 320px
- Selects: secondary sm, largura automática
- Botão "Limpar filtros": ghost sm, aparece apenas quando há filtros ativos
- Gap entre elementos: `--space-2`
- Padding vertical da barra: `--space-3`
- Borda inferior: `--color-border-default`

**Contador de resultados:** `--text-body-sm`, `--color-text-secondary`, alinhado à direita. Exemplo: "Mostrando 45 de 1.234 contatos".

### 6.4 Export Actions

**Fluxo:**
1. Usuário clica "Exportar CSV" ou "Exportar Excel"
2. Se há seleção ativa: exporta apenas selecionados
3. Se não há seleção: exporta todos (com confirmação se > 1000 registros)
4. Feedback: toast success "XX contatos exportados com sucesso"
5. Download automático inicia

**Modal de confirmação (exportação grande):**
- Título: "Exportar XX contatos?"
- Descrição: "A exportação pode levar alguns instantes."
- Ações: [Cancelar] [Exportar]

### 6.5 Feedback de Progresso (Extração)

**Barra de progresso:**
- Container: height 4px, fundo `--color-bg-tertiary`, radius `--radius-full`
- Fill: fundo `--color-primary`, transição width 300ms ease
- Acima da barra: texto "Extraindo... XX%" (`--text-body-sm`, `--color-text-secondary`)

**Durante extração:**
- Header mostra barra de progresso no lugar das ações
- Toast info persistente: "Extração em andamento..."
- Botões de exportar ficam disabled
- Ao concluir: barra desaparece, toast success, lista atualiza

**Erro durante extração:**
- Barra fica `--color-error`
- Toast error com mensagem específica
- Botão "Tentar novamente" habilitado

---

## 7. Estados da Aplicação

### 7.1 Loading Inicial

- Tela inteira: spinner lg centralizado
- Texto: "Carregando ContatoZap..."
- Após 5 segundos: adicionar "Verificando conexão..."
- Timeout (> 15s): transicionar para estado de erro

### 7.2 Lista Vazia (Nenhum Grupo Extraído)

- Empty state centralizado
- Ícone: pasta/grupo vazio (48px)
- Título: "Nenhum grupo encontrado"
- Descrição: "Conecte-se ao WhatsApp Web e extraia seus grupos para visualizar os contatos."
- Ação: Button primary "Extrair grupos"

### 7.3 Erro de Conexão / Extração

- Empty state de erro
- Ícone: alerta/error (48px, cor `--color-error`)
- Título: variável conforme erro
  - "Conexão perdida" → "Verifique sua internet e tente novamente."
  - "Sessão expirada" → "Reconecte-se ao WhatsApp Web."
  - "Falha na extração" → "Algo deu errado. Tente novamente."
- Ação: Button primary "Tentar novamente" + Button ghost "Ver detalhes" (abre modal com log técnico)

### 7.4 Sucesso Pós-Exportação

- Toast success no canto superior direito
- Texto: "XX contatos exportados com sucesso"
- Auto-dismiss após 5 segundos
- Sem bloqueio de interação

### 7.5 Progresso de Extração

- Barra de progresso no header (ver 6.5)
- Contador numérico atualizado em tempo real
- Log de atividade opcional (expandível): "Processando grupo X...", "XX contatos encontrados"
- Cancelamento: botão ghost "Cancelar" aparece durante extração

---

## 8. Acessibilidade

### 8.1 Contraste

- Todas as combinações texto/fundo devem atingir WCAG AA (4.5:1 para texto normal, 3:1 para texto grande ≥ 18px ou bold ≥ 14px).
- Cores semânticas (success, warning, error) nunca são o único indicador de estado; sempre acompanhadas de ícone ou texto.
- Ferramenta de verificação: axe-core ou similar em CI.

### 8.2 Focus Visible

- Todo elemento interativo tem ring de foco visível: `--shadow-focus`.
- Nunca usar `outline: none` sem substituto.
- Focus order segue ordem visual/DOM.
- Skip link no topo da página: "Pular para o conteúdo principal".

### 8.3 Keyboard Navigation

| Tecla | Ação |
|-------|------|
| Tab / Shift+Tab | Navegar entre elementos interativos |
| Enter / Space | Ativar botão, link, checkbox |
| Escape | Fechar modal, dropdown, tooltip |
| Arrow Up/Down | Navegar em dropdowns, selects, listas |
| Arrow Left/Right | Navegar entre tabs, abas |
| Home / End | Ir ao início/fim de lista |

- Modal: focus trap ativo.
- Dropdown: abre com Enter/Space/ArrowDown, fecha com Escape.
- Tabela: navegação por setas entre cells (role="grid").

### 8.4 Screen Reader Labels

- Todo ícone sem texto tem `aria-label` descritivo.
- Ícones decorativos: `aria-hidden="true"`.
- Badges de status: `aria-label` inclui significado ("Status: ativo", não apenas "verde").
- Tabelas: `<caption>` ou `aria-label` descrevendo o conteúdo.
- Inputs: `<label>` associado ou `aria-labelledby`.
- Regiões da página: landmarks (`<nav>`, `<main>`, `<header>`).
- Live regions: toasts usam `role="alert"` ou `aria-live="polite"`.

### 8.5 Reduced Motion

- Respeitar `prefers-reduced-motion: reduce`.
- Quando ativo:
  - Animações de transição: duration 0ms ou crossfade instantâneo
  - Shimmer/skeleton: pulso suave de opacity
  - Spinner: rotação lenta (3s) ou substituição por texto "Carregando..."
  - Modal: sem scale/fade, aparição instantânea
  - Toast: sem slide, aparição instantânea

---

## 9. Logo e Branding

### 9.1 Arquivo do Logo

- Caminho: `docs/brand/logo-contatozap.png`
- Formato master: PNG com transparência, resolução mínima 512x512px
- Versões necessárias:
  - `logo-contatozap.png` — versão completa (símbolo + texto)
  - `logo-contatozap-icon.png` — apenas o símbolo (para favicon e avatar)
  - `logo-contatozap-dark.png` — versão invertida para fundos escuros

### 9.2 Uso no Header

- Altura: 28px (símbolo + texto lado a lado)
- Gap entre símbolo e texto: `--space-2`
- Alinhamento vertical: centro do header
- Em mobile colapsado: apenas símbolo, 24px

### 9.3 Favicon

| Contexto | Tamanho | Arquivo |
|----------|---------|---------|
| Browser tab | 32x32 | favicon-32.png |
| Retina / high-DPI | 64x64 | favicon-64.png |
| Apple Touch Icon | 180x180 | apple-touch-icon.png |
| Android Chrome | 192x192 | android-chrome-192.png |
| Manifest | 512x512 | android-chrome-512.png |

Todos derivados de `logo-contatozap-icon.png`.

### 9.4 Clear Space e Tamanho Mínimo

- Clear space: área livre ao redor do logo igual à altura do símbolo (X). Nenhum elemento gráfico ou texto invade essa área.
- Tamanho mínimo impresso: símbolo ≥ 8mm de altura.
- Tamanho mínimo digital: símbolo ≥ 16px de altura.
- Nunca esticar, rotacionar, recolorir arbitrariamente ou adicionar efeitos ao logo.

### 9.5 Cores da Marca

O logo usa exclusivamente as cores da paleta definida na seção 2:
- Símbolo: `--color-primary`
- Texto "ContatoZap": `--color-text-primary`
- Em fundo escuro: versões inverse correspondentes

Nenhuma cor fora da paleta é permitida no branding.

---

## 10. Regras Anti-Padrão

O que **NUNCA** fazer ao implementar a UI do ContatoZap:

| # | Regra | Motivo |
|---|-------|--------|
| 1 | Usar valores hex literais (#RRGGBB) | Quebra o sistema de tokens; impede dark mode |
| 2 | Usar emoji como ícone de UI | Inconsistência visual entre plataformas; sem controle de tamanho/cor |
| 3 | Criar novos tamanhos de fonte fora da escala | Quebra o ritmo tipográfico |
| 4 | Usar z-index literal (ex: z-index: 999) | Conflitos de empilhamento; usar tokens da escala |
| 5 | Hardcoded pixel values para espaçamento | Usar tokens `--space-*` |
| 6 | Cor como único indicador de estado | Inacessível para daltônicos; sempre combinar com ícone/texto |
| 7 | Outline:none sem substituto de foco | Viola WCAG; usar `--shadow-focus` |
| 8 | Animações sem prefers-reduced-motion | Desrespeito a usuários sensíveis |
| 9 | Texto menor que 12px | Ilegível; `--text-caption` é o piso |
| 10 | Fonte peso > 700 | Fora da família Inter disponível; causa FOUT |
| 11 | Gradientes decorativos | Viola princípio "clareza sobre decoração" |
| 12 | Bordas arredondadas inconsistentes | Usar tokens `--radius-*` |
| 13 | Sombras inventadas | Usar tokens `--shadow-*` |
| 14 | Cores de status fora da paleta semântica | Confusão visual; usar success/warning/error/info |
| 15 | Tabelas sem tratamento responsivo | Mobile inutilizável; ver regra 5.3 |
| 16 | Modal sem focus trap | Acessibilidade quebrada |
| 17 | Toast sem role="alert" ou aria-live | Screen readers ignoram |
| 18 | Loading sem estimativa ou feedback | Usuário não sabe se travou |
| 19 | Empty state sem call-to-action | Beco sem saída para o usuário |
| 20 | Alterar tokens de cor por componente | Tokens são globais; criar variante se necessário |

---

## Apêndice A: Referência Rápida de Tokens

Para consulta rápida durante implementação, todos os tokens em ordem alfabética:

```
--bp-lg: 1024px
--bp-md: 768px
--bp-sm: 640px
--bp-xl: 1280px
--color-bg-inverse: (ver seção 2)
--color-bg-primary: (ver seção 2)
--color-bg-secondary: (ver seção 2)
--color-bg-tertiary: (ver seção 2)
--color-border-default: (ver seção 2)
--color-border-focus: (ver seção 2)
--color-border-strong: (ver seção 2)
--color-error: (ver seção 2)
--color-error-subtle: (ver seção 2)
--color-info: (ver seção 2)
--color-info-subtle: (ver seção 2)
--color-overlay: (ver seção 2)
--color-primary: (ver seção 2)
--color-primary-active: (ver seção 2)
--color-primary-hover: (ver seção 2)
--color-primary-subtle: (ver seção 2)
--color-success: (ver seção 2)
--color-success-subtle: (ver seção 2)
--color-text-inverse: (ver seção 2)
--color-text-primary: (ver seção 2)
--color-text-secondary: (ver seção 2)
--color-text-tertiary: (ver seção 2)
--color-warning: (ver seção 2)
--color-warning-subtle: (ver seção 2)
--container-full: 100%
--container-lg: 1024px
--container-md: 768px
--container-sm: 640px
--container-xl: 1280px
--radius-full: 9999px
--radius-lg: 8px
--radius-md: 6px
--radius-sm: 4px
--shadow-focus: (ver seção 4.6)
--shadow-lg: (ver seção 4.6)
--shadow-md: (ver seção 4.6)
--shadow-sm: (ver seção 4.6)
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-10: 2.5rem (40px)
--space-12: 3rem (48px)
--text-body: 14px/0.875rem, 400
--text-body-lg: 16px/1rem, 400
--text-body-sm: 13px/0.8125rem, 400
--text-caption: 12px/0.75rem, 400
--text-display: 32px/2rem, 700
--text-h1: 24px/1.5rem, 600
--text-h2: 20px/1.25rem, 600
--text-h3: 16px/1rem, 600
--text-mono: 13px/0.8125rem, 400
--z-base: 0
--z-dropdown: 10
--z-modal: 50
--z-overlay: 40
--z-sidebar: 30
--z-sticky: 20
--z-toast: 60
--z-tooltip: 70
```

---

*Documento versionado junto ao código-fonte. Alterações exigem revisão de design antes de merge.*