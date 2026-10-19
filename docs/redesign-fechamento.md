# Redesign do ContatoZap — fechamento

## Implementação

A interface foi separada em módulos ES nativos em `public/`, sem build ou novas dependências. Inclui sidebar com fixados, seções recolhíveis, fotos carregadas em lotes e trilho de avatares; até oito abas recentes; busca rápida com Ctrl+K; lista completa, grade P/M/G e filtros por participante.

A fase de ficha do participante foi concluída com foto ampliável, nomes, telefone, etiquetas e ações de copiar/abrir WhatsApp. “Também está em” consulta os grupos extraídos no cache, excluindo a origem e ignorando seu TTL; pessoas sem telefone são identificadas pelo id. A ficha fica ao lado em telas a partir de 1280px, em gaveta abaixo disso e em tela cheia abaixo de 768px. Setas percorrem o resultado filtrado e ordenado; Esc fecha e restaura o foco. A gaveta isola o fundo com `inert` e contém a navegação por Tab.

## Correções da revisão e integração

- O horário relativo da extração atualiza a cada 60 segundos e ao voltar à página, sem reconstruir a lista.
- O menu de exportação verifica o destino do foco, preserva as setas no campo numérico e restaura foco após escolher um formato.
- A inicialização da tabela antiga foi desligada: ela tentava acessar elementos removidos e interrompia o ponto de entrada.
- Controles de lista/grade e P/M/G foram ligados às preferências; alterações de filtro, busca, ordenação e seleção atualizam o conteúdo.
- A busca adiada é cancelada ao trocar de aba; respostas antigas de grupos em comum não substituem outra ficha.
- A sincronização bloqueia os novos botões de exportação, preservando a proteção contra dados incompletos.
- Estilos usam os tokens existentes em ambos os temas. Foram completados alvos de toque, foco visível e desativação de animações quando o sistema pede movimento reduzido.

## Validação

- `npm test`: 132 testes aprovados, zero falhas.
- Dez testes novos integram os módulos reais com um DOM mínimo em Node: inicialização, controles, filtros, ficha, teclado, telefone ausente, gaveta, respostas atrasadas, relógio, menu, sincronização e busca adiada.
- `node --check`: 34 arquivos aprovados, incluindo `server.js`, `whatsapp-extractor.js`, `lib/*.js` e todos os módulos de `public/js/`.
- `git diff --check`: aprovado.

Os testes de DOM não verificam geometria CSS nem equivalem a um teste com WhatsApp conectado. Conforme o plano, nenhum servidor ou navegador foi iniciado nesta finalização. A conferência visual e o fluxo com dados reais permanecem sem validação nesta sessão.

## Conferência visual

Com `npm run watch`, abrir `http://localhost:3000` e conferir em 375, 800, 1100 e 1440px:

1. Abrir grupos pela sidebar e pelo Ctrl+K; alternar abas, fixados, lista/grade e P/M/G.
2. Filtrar e ordenar participantes, abrir uma ficha, percorrer com ↑/↓ e fechar com Esc. Conferir a devolução do foco.
3. Extrair dois grupos com alguém em comum e abrir o outro grupo pela ficha. Conferir também uma pessoa sem telefone.
4. Verificar grade com duas colunas no celular, ficha em tela cheia, gaveta nas larguras intermediárias e ficha ao lado em 1440px.
5. Navegar com Tab, emular toque e movimento reduzido; testar as três exportações e a extração em lote.
