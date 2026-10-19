# Marca — Extrator de Grupos do WhatsApp

Especificação de identidade verbal e visual para o aplicativo local de visualização e exportação de contatos de grupos do WhatsApp. Este documento define nome, tom de voz, conceito do logo e regras de aplicação. Não contém código nem design system atômico (este está em `docs/design.md`).

---

## 1. Nome e tagline

O nome atual "Extrator de Grupos do WhatsApp" é descritivo demais para funcionar como marca: soa como um script, não como um produto. As opções abaixo mantêm a clareza funcional mas adicionam identidade própria.

### Opção A (recomendada): ContatoZap

- **Tagline:** Seus grupos, organizados.
- **Racional:** "Contato" comunica a função principal sem jargão técnico. "Zap" é o apelido universal do WhatsApp no Brasil — todo usuário entende imediatamente. O sufixo cria uma palavra curta, memorável e digitável. Soa como ferramenta, não como rede social.
- **Domínio potencial:** contatozap.com.br / .app

### Opção B: GrupoFácil

- **Tagline:** Gerencie seus grupos sem complicação.
- **Racional:** Foca na dor resolvida (facilidade) em vez da mecânica (extração). "Grupo" ancora no contexto do WhatsApp sem precisar nomear a plataforma. Mais genérico que a opção A, funciona se o app expandir para outras plataformas no futuro.
- **Domínio potencial:** grupofacil.com.br

### Opção C: ListaZap

- **Tagline:** De grupo para planilha em segundos.
- **Racional:** "Lista" é mais específico que "contato" — remete diretamente ao resultado tangível (uma lista exportável). A tagline é mais concreta e orientada a ação. Funciona bem se o diferencial competitivo for a velocidade da exportação.
- **Domínio potencial:** listazap.com.br

### Critério de escolha

Se o app permanecer focado exclusivamente em WhatsApp e contatos: **ContatoZap**. Se houver ambição de multi-plataforma: **GrupoFácil**. Se a exportação for o carro-chefe absoluto: **ListaZap**.

Para o restante deste documento, usa-se **ContatoZap** como nome de trabalho. Substitua pelo escolhido antes da implementação.

---

## 2. Personalidade da marca

Quatro adjetivos definem como a marca se comporta. Cada um vem com exemplos concretos de tradução em texto de interface.

### Direta

A marca diz o que precisa dizer, sem rodeios. O usuário está aqui para resolver uma tarefa, não para ser entretido.

- **Sim:** "347 contatos exportados."
- **Não:** "Parabéns! Sua exportação foi concluída com sucesso! 🎉"
- **Microcopy:** Botão diz "Exportar Excel", não "Baixar minha lista agora".

### Confiável

A marca transmite segurança técnica sem parecer corporativa. O usuário confia dados pessoais (contatos, fotos); a comunicação deve reforçar que nada vaza, nada fica retido.

- **Sim:** "Os dados ficam apenas no seu computador. Nada é enviado para servidores externos."
- **Não:** "Utilizamos criptografia de ponta a ponta com protocolo TLS 1.3 e armazenamento zero-knowledge..."
- **Microcopy:** Status bar diz "Processando 12/89 grupos...", não "Otimizando sua experiência de extração...".

### Prática

A marca valoriza o resultado sobre o processo. Não explica como funciona internamente; mostra o que o usuário ganha.

- **Sim:** "Filtrar por cidade" (label do campo).
- **Não:** "Aplicar filtro regex personalizado ao campo de metadados geográficos".
- **Microcopy:** Empty state diz "Nenhum grupo encontrado. Verifique se o WhatsApp Web está conectado.", não "Erro 404: recurso não localizado na base de dados local".

### Brasileira

A marca fala português natural do Brasil, sem traduções literais de termos em inglês nem formalidade desnecessária. Usa vocabulário que o público-alvo já usa no dia a dia.

- **Sim:** "Foto de perfil", "Grupos", "Planilha".
- **Não:** "Avatar", "Channels", "Spreadsheet".
- **Microcopy:** Toast diz "Copiado!", não "Item copiado para a área de transferência com sucesso.".

---

## 3. Voz e tom

### Como a marca fala

- **Segunda pessoa implícita.** Textos falam *para* o usuário sem tutear nem tratar por "senhor/senhora". Verbos no imperativo ou infinitivo: "Exportar", "Filtrar", "Buscar". Nunca "Você pode exportar" nem "O usuário deve exportar".
- **Frases curtas.** Máximo de 15 palavras em labels e botões. Até 25 em mensagens de status e ajuda. Se precisar de mais, divida em duas frases.
- **Vocabulário concreto.** Nomes de coisas que o usuário vê e toca: "grupo", "contato", "foto", "planilha", "filtro". Evitar abstrações: "dado", "recurso", "entidade", "informação".
- **Zero jargão técnico.** Nada de "endpoint", "payload", "cache", "renderizar", "parsear". Se um termo técnico for inevitável em mensagem de erro, acompanhe de explicação em linguagem comum.
- **Sem exclamações.** Ponto final. A empolgação é incompatível com utilitário confiável. A única exceção aceitável é confirmação de ação irreversível ("Tem certeza?").

### O que evitar

| Evitar | Motivo | Usar em vez disso |
|--------|--------|-------------------|
| Emojis em UI | Incompatível com tom utilitário; distrai | Ícones SVG funcionais quando necessário |
| Humor, trocadilhos, gírias | Envelhece mal; aliena parte do público | Linguagem neutra e clara |
| Termos em inglês não aportuguesados | Público-alvo pode não dominar inglês técnico | Tradução consolidada no uso brasileiro |
| Superlativos ("melhor", "mais rápido", "incrível") | Promessa vazia em utilitário local | Descrever o que faz, sem julgamento |
| Copywriting de SaaS ("unlock", "boost", "empower") | Tom de venda; este é um tool pessoal | Verbos de ação direta |
| Mensagens de erro genéricas ("Algo deu errado") | Não ajuda o usuário a resolver | Dizer o que falhou e o que tentar |

### Exemplos antes/depois

| Contexto | Antes (evitar) | Depois (usar) |
|----------|----------------|---------------|
| Botão principal | "Começar Extração Agora!" | "Listar grupos" |
| Loading | "Carregando seus dados incríveis..." | "Lendo grupos..." |
| Sucesso | "Tudo pronto! ✅" | "Concluído. 214 contatos." |
| Erro | "Oops! Algo inesperado aconteceu 😅" | "Não foi possível conectar ao WhatsApp Web. Reabra o QR Code." |
| Empty state | "Parece que não há nada aqui ainda!" | "Nenhum grupo carregado. Clique em 'Listar grupos' para começar." |
| Tooltip | "Esta funcionalidade permite exportar os dados selecionados" | "Exportar contatos filtrados para Excel" |
| Header secundário | "Bem-vindo ao Extrator de Grupos!" | (sem texto — o header mostra apenas o logo e a navegação) |

---

## 4. Conceito visual do logo

### Símbolo

O símbolo do ContatoZap é uma **silhueta humana estilizada dentro de um balão de conversa arredondado**, formando uma unidade indivisível. A silhueta é genérica (cabeça e ombros, sem gênero, etnia ou idade), posicionada no centro óptico do balão. O balão tem cantos suavemente arredondados (border-radius ~20% da largura) e um pequeno triângulo indicativo na base esquerda, apontando para baixo-esquerda em 45 graus — referência sutil ao formato de balão de mensagem sem replicar o ícone do WhatsApp.

A composição comunica "pessoa + conversa" numa leitura instantânea, mesmo em tamanhos mínimos (16x16px favicon). Não há elementos decorativos, linhas extras, sombras ou gradientes.

### Cores

A paleta de marca usa dois tons de verde-teal e um cinza escuro, escolhidos para evocar confiança e funcionalidade sem copiar a identidade do WhatsApp (verde puro #25D366).

| Papel | Cor | Hex | Uso |
|-------|-----|-----|-----|
| Primária | Verde-teal | `#0D9488` | Símbolo, links, estados ativos |
| Escura | Cinza-grafite | `#1F2937` | Texto principal, símbolo monocromático |
| Clara | Branco | `#FFFFFF` | Fundo, símbolo em versão invertida |
| Neutra | Cinza-médio | `#6B7280` | Texto secundário, bordas sutis |

O verde-teal (`#0D9488`) é deliberadamente mais azulado que o verde WhatsApp. Isso cria associação temática (mensagens, comunicação) sem confusão visual ou risco de parecer produto oficial da Meta.

### Proporções e espaço de respiro

- **Símbolo isolado:** quadrado perfeito. A silhueta ocupa ~60% da altura interna do balão; o balão ocupa ~85% da caixa delimitadora. Margem interna uniforme de ~7.5% em cada lado.
- **Lockup horizontal:** símbolo à esquerda, wordmark à direita. Altura do símbolo = altura das letras maiúsculas do wordmark. Espaço entre símbolo e wordmark = 25% da altura do símbolo.
- **Lockup vertical:** símbolo centralizado acima do wordmark. Espaço entre símbolo e wordmark = 40% da altura do símbolo.
- **Zona de exclusão:** nenhum elemento gráfico ou texto pode entrar num raio igual a 25% da altura do símbolo, medido a partir de qualquer borda externa.

### Versões

| Versão | Quando usar |
|--------|-------------|
| Horizontal (símbolo + wordmark) | Header da interface web, assinaturas de e-mail, materiais impressos horizontais |
| Vertical (símbolo sobre wordmark) | Telas de loading, splash screens, cartões de visita |
| Símbolo isolado | Favicon, avatar de rede social, botão de app mobile, watermark em exportações |
| Monocromática escura | Fundos claros onde cor primária não é adequada, impressão P&B |
| Monocromática clara (branca) | Fundos escuros, overlays sobre imagens |
| Invertida (fundo verde-teal, símbolo branco) | Destaque em banners, badges, selos de confirmação |

---

## 5. Especificações do logo SVG

Descrição geométrica para implementação fiel em SVG puro, sem dependência de fontes externas ou imagens rasterizadas.

### ViewBox e grade

- ViewBox: `0 0 100 100` para o símbolo isolado.
- Grade subjacente: divisões em múltiplos de 5 para alinhamento consistente.

### Balão de conversa

- Retângulo arredondado: x=10, y=8, width=80, height=70, rx=14, ry=14.
- Triângulo indicador: polígono com vértices em (22,78), (30,78), (18,90). Integrado ao corpo do balão (mesma cor, sem stroke).

### Silhueta humana

- Cabeça: círculo cx=50, cy=32, r=12.
- Ombros/tronco: elipse cx=50, cy=62, rx=22, ry=16, cortada na base pelo limite inferior do balão (clipPath no contorno interno do balão).
- A silhueta é preenchida com a mesma cor do balão na versão monocromática, ou com cor contrastante (branco sobre fundo verde-teal) na versão colorida invertida. Na versão padrão, o balão é verde-teal e a silhueta é branca.

### Wordmark

- Fonte: sistema sans-serif geométrica (Inter, Segoe UI, Roboto, fallback para sans-serif). Peso 600 (semi-bold).
- Tamanho relativo: altura das maiúsculas = 100 unidades no lockup horizontal (mesma altura do símbolo).
- Tracking: +0.02em para legibilidade em tamanhos pequenos.
- Cor: cinza-grafite `#1F2937` em fundos claros; branco `#FFFFFF` em fundos escuros.
- O wordmark nunca usa a cor verde-teal; a cor primária é exclusiva do símbolo.

### Variações monocromáticas

- **Escura:** balão + silhueta em `#1F2937`, fundo transparente. Para fundos brancos ou muito claros.
- **Clara:** balão + silhueta em `#FFFFFF`, fundo transparente. Para fundos escuros ou coloridos.
- Ambas mantêm as mesmas proporções e formas; apenas o fill muda. Sem outline/stroke em nenhuma variação.

### Regras técnicas

- Nenhum gradiente, sombra, blur ou filtro SVG. Tudo é flat fill.
- Nenhum texto convertido em path no símbolo; apenas o wordmark usa `<text>` ou path de fonte.
- O SVG deve renderizar corretamente de 16x16px a 512x512px sem perda de legibilidade.
- Testar em fundo claro e escuro antes de aprovar qualquer variação.

---

## 6. Aplicações

### Header da interface web

- Lockup horizontal, altura fixa de 32px (símbolo) + wordmark proporcional.
- Alinhado à esquerda, com margem esquerda de 16px.
- Fundo do header: branco ou cinza muito claro (`#F9FAFB`). Sem borda inferior; separação por espaçamento.
- O logo no header é link para a página inicial/reload da lista de grupos.

### Favicon

- Símbolo isolado em 32x32px e 16x16px.
- Versão colorida (verde-teal + branco) como padrão.
- Gerar também apple-touch-icon em 180x180px com a mesma versão.
- Manter zona de exclusão respeitada mesmo no tamanho mínimo.

### Loading screen / Splash

- Lockup vertical centralizado.
- Símbolo em 64x64px, wordmark abaixo.
- Animação opcional: pulso suave (scale 1.0 → 1.05 → 1.0, duração 1.5s, ease-in-out) apenas no símbolo. Sem spinner separado.
- Fundo branco ou cinza muito claro. Sem texto adicional ("Carregando..." é redundante; o símbolo pulsando já indica estado).

### Exportações Excel

- Watermark discreto no rodapé da planilha: símbolo isolado em 24x24px + texto "Gerado por ContatoZap" em cinza-médio, fonte 9pt.
- Posição: célula A{última linha + 2}, alinhado à esquerda.
- Nunca interfere nos dados exportados. É informação de proveniência, não propaganda.
- Em PDFs gerados a partir da exportação, manter o mesmo watermark no rodapé da primeira página.

### Redes sociais / Avatar

- Símbolo isolado em formato quadrado, com fundo verde-teal sólido e símbolo branco (versão invertida).
- Tamanhos: 400x400px (OG image), 200x200px (avatar perfil), 100x100px (thumbnail).
- Sem wordmark no avatar; o símbolo sozinho é reconhecível.
- OG image para compartilhamento de link: lockup horizontal sobre fundo verde-teal, com tagline abaixo em branco, dimensões 1200x630px.

### Documentação e README

- Lockup horizontal no topo do README, seguido da tagline.
- Em documentação técnica, usar apenas o símbolo como marcador de seção quando a marca aparecer repetidamente.

---

## 7. O que NÃO é

Anti-padrões explícitos. Se algo se encaixa aqui, está errado independentemente de quão bonito ou criativo pareça.

### Tom e comunicação

- **Não é divertido.** Sem mascotes, sem copy engraçadinha, sem referências pop. O usuário está trabalhando, não se entretendo.
- **Não é enterprise.** Sem "solução", "plataforma", "ecossistema", "sinergia". É uma ferramenta pessoal que roda no computador do usuário.
- **Não é minimalismo estético vazio.** Simplicidade serve à clareza, não ao estilo. Se remover um elemento prejudica a compreensão, ele fica. Forma segue função, não tendência.
- **Não é tutorial permanente.** A interface deve ser autoexplicativa. Tooltips existem para casos excepcionais, não para compensar má arquitetura de informação.

### Visual

- **Não copia o WhatsApp.** Nada de verde #25D366, nada de balão de fala idêntico, nada de silhueta de telefone. A associação temática é intencional; a cópia visual é proibida.
- **Não usa ilustrações decorativas.** Sem desenhos de pessoas celebrando, sem gráficos abstratos de conexão, sem padrões geométricos de fundo. Se não comunica função, não entra.
- **Não usa gradientes, glassmorphism ou efeitos de profundidade.** Flat design funcional. Sombras são aceitáveis apenas para hierarquia de camadas (dropdowns, modais), nunca como decoração.
- **Não mistura estilos.** Sem serifas, sem hand-lettering, sem ícones skeuomórficos. Consistência absoluta entre todos os pontos de contato.

### Posicionamento

- **Não compete com CRM.** Não se posiciona como "CRM grátis" nem "gestão de relacionamentos". É um extrator/visualizador. Escopo definido.
- **Não promete automação.** Não sugere envio em massa, scraping agressivo ou violação de termos de serviço. É uma ferramenta de leitura e organização, não de spam.
- **Não finge ser oficial.** Nada de "WhatsApp®" no nome, nada de "parceiro oficial", nada de cores e tipografia que sugiram endosso da Meta. A marca é independente e transparente sobre isso.
- **Não é global-first.** O público é brasileiro. A marca fala português do Brasil, usa convenções locais (formato de data DD/MM/AAAA, moeda R$ quando relevante), e não tenta soar internacional. Traduções futuras podem existir, mas a identidade nasce local.

---

## Notas finais

- Este documento é a fonte única de verdade para decisões de marca. Conflitos entre este e outros materiais são resolvidos a favor deste.
- Alterações exigem atualização explícita deste arquivo. Não faça ajustes ad-hoc em código ou design sem refletir aqui primeiro.
- O design system atômico (cores funcionais, tipografia, espaçamento, componentes) vive em `docs/design.md` e deriva desta especificação, não o contrário.
- Para dúvidas de interpretação, o critério é sempre: "Isso ajuda o usuário brasileiro a gerenciar seus grupos de WhatsApp com confiança e eficiência?" Se a resposta não for claramente sim, descarte.