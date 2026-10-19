# 🚀 Extrator de Grupos e Contatos do WhatsApp

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.13.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![WhatsApp Web.js](https://img.shields.io/badge/WhatsApp--Web.js-1.34+-25D366?logo=whatsapp&logoColor=white)](https://wwebjs.dev/)
[![Platform](https://img.shields.io/badge/plataforma-Windows%20%7C%20Linux%20%7C%20macOS-blue)](https://nodejs.org/)

Uma ferramenta completa, visual, rápida e fácil de usar para extrair contatos e participantes de grupos do WhatsApp. Conta com **painel web moderno**, **modo terminal (CLI)**, **resolução de privacidade/LID** e **persistência automática de sessão** (você só escaneia o QR Code uma vez).

---

## ✨ Principais Funcionalidades

- **📱 Dupla Identificação de Nomes:**
  - **Nome de Perfil (Pushname):** O nome público que a própria pessoa definiu no WhatsApp dela.
  - **Nome Salvo:** O nome com o qual você salvou a pessoa na sua agenda de contatos (se houver).
- **📸 Fotos de Perfil & Preview no Excel:**
  - Extração do link direto da foto de perfil (quando acessível pelas opções de privacidade do usuário).
  - Tabela com avatar visual na interface web e clique para ver a foto original.
  - Exportação para Excel com coluna **Preview Foto** (fórmula nativa `=IMAGE()`) e **Link da Foto** clicável.
- **🔒 Resolução Inteligente de LIDs e Números Ocultos:** Resolve membros de grupos com configurações modernas de privacidade de número do WhatsApp.
- **🖥️ Interface Web Moderna (GUI):**
  - Leitura do QR Code diretamente no navegador.
  - Busca instantânea e listagem de todos os grupos com contagem de membros.
  - Cronômetro e indicador de progresso em tempo real durante a extração.
  - Tabela organizada com paginação e busca por nome ou número.
  - Exportação com 1 clique para **Excel (.xls)**, **CSV** (otimizado para Excel e Google Planilhas) e **JSON**.
  - Botão de cópia rápida de todos os números.
- **⚡ Modo Terminal (CLI):** Opção rápida para quem prefere rodar direto pelo console com menu interativo.
- **💾 Sessão Salva Automaticamente:** Utiliza SQLite nativo (`session.db`) para manter sua conexão ativa sem precisar escanear o QR Code toda vez que abrir o aplicativo.
- **🛡️ 100% Seguro e Privado:** Roda inteiramente no seu computador. Nenhum contato ou dado pessoal é enviado para a nuvem ou servidores externos.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter instalado no seu computador:

1. **[Node.js](https://nodejs.org/)** (versão **22.13.0** ou superior recomendada).
   - Se ainda não tem, baixe o instalador no site oficial: [https://nodejs.org/](https://nodejs.org/) (opção LTS ou Current).
2. **Google Chrome** instalado (o Puppeteer utiliza o navegador para conectar ao WhatsApp Web).

---

## ⚡ Como Usar

### Opção 1: Método Mais Fácil (1 clique / script pronto)

- **No Windows:** Basta dar dois cliques no arquivo:
  ```text
  iniciar.bat
  ```
- **No Linux / macOS:** No terminal, execute:
  ```bash
  ./iniciar.sh
  ```
  *(Ele já possui permissão de execução configurada).*

---

### Opção 2: Pelo Terminal / Linha de Comando (Qualquer Sistema)

1. **Clone ou baixe este repositório:**
   ```bash
   git clone https://github.com/danexplore/extrator.git
   cd extrator
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o Painel Web (Recomendado):**
   ```bash
   npm start
   ```
   O navegador abrirá automaticamente em `http://localhost:3000`.

4. **Escaneie o QR Code:**
   - Abra o WhatsApp no seu celular.
   - Vá em **Aparelhos Conectados** > **Conectar Aparelho**.
   - Aponte a câmera para o QR Code exibido na tela.

5. **Pronto!**
   - Seus grupos serão listados.
   - Clique em qualquer grupo para ver os membros e exportar para **Excel**, **CSV** ou **JSON**.

---

### 💻 Usando o Modo Linha de Comando (CLI)

Se preferir não usar o navegador e extrair direto pelo terminal:

```bash
npm run cli
```

O terminal exibirá um menu com todos os seus grupos numerados. Digite o número do grupo desejado e a planilha `.csv` será gerada instantaneamente na pasta do projeto.

---

## 📊 Formato dos Dados Extraídos

Ao exportar os contatos, você terá as seguintes informações organizadas:

| Campo | Descrição | Exemplo |
| :--- | :--- | :--- |
| **Preview Foto** | Miniatura da foto no Excel via fórmula nativa `=IMAGE()` | *(Imagem renderizada na célula)* |
| **Link da Foto** | Link direto na CDN da Meta (`pps.whatsapp.net`) | `https://pps.whatsapp.net/v/...` |
| **Telefone** | Número completo com DDI e DDD formatado | `+55 11 98765-4321` |
| **Nome do Perfil** | Nome público configurado pelo usuário no WhatsApp | `Mariana Silva` |
| **Nome Salvo** | Nome que você deu ao contato na sua agenda | `Mariana Cliente VIP` |
| **Administrador** | Indica se a pessoa é administradora do grupo | `Sim` ou `Não` |
| **Status** | Indicador de número normal ou ID de privacidade (LID) | `Normal` ou `Privacidade (LID)` |

---

## ❓ Perguntas Frequentes (FAQ)

### 1. Preciso escanear o QR Code toda vez que abrir?
**Não!** O projeto possui persistência automática. Sua sessão é gravada de forma criptografada em um banco de dados local (`session.db`). Na próxima vez que iniciar o programa, ele conectará automaticamente.

### 2. Como desconectar ou trocar de número de WhatsApp?
Basta apagar o arquivo `session.db` na pasta do projeto (e a pasta oculta `.wwebjs_auth`, se existir). Ao iniciar novamente, um novo QR Code será gerado.

### 3. Por que alguns contatos aparecem como "Sem nome"?
O WhatsApp só disponibiliza o nome de perfil se o participante tiver configurado um no aplicativo dele. Se o participante não definiu um nome público e não está na sua agenda, o campo aparecerá como "Sem nome", mas o número de telefone estará presente.

### 4. Meus contatos ou dados são compartilhados?
**De forma alguma.** Todo o processamento ocorre 100% no seu computador (localhost). Não existe telemetria, banco de dados remoto ou envio para servidores terceiros.

### 5. Por que algumas fotos de perfil não aparecem?
O WhatsApp respeita estritamente as preferências de privacidade de cada usuário. Se a pessoa configurou a foto de perfil como visível apenas para *"Meus contatos"* (e ela não possui o seu número salvo) ou *"Ninguém"*, ou caso ela não utilize foto de perfil, a imagem não estará acessível pelos servidores da Meta. Nesses casos, o extrator preenche o campo com `-`.

---

## 🛠️ Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js/)
- [SQLite Nativo (`node:sqlite`)](https://nodejs.org/api/sqlite.html)
- HTML5 / CSS3 Moderno com Glassmorphism / JavaScript Vanilla

---

## ⚖️ Termos de Uso e Responsabilidade (Disclaimer)

Este projeto foi desenvolvido estritamente para **fins educacionais e de produtividade pessoal** (como organização de comunidades, backup e gestão de grupos próprios). O uso desta ferramenta deve respeitar os [Termos de Serviço do WhatsApp](https://www.whatsapp.com/legal/). Os desenvolvedores não se responsabilizam por qualquer uso indevido, spam ou violação de políticas da plataforma.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo [`LICENSE`](LICENSE) para mais detalhes.
