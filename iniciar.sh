#!/usr/bin/env bash

echo "========================================================"
echo "   Extrator de Grupos e Contatos do WhatsApp"
echo "========================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[X] Node.js não foi encontrado no seu sistema."
    echo "Por favor, instale o Node.js (versão 22 ou superior): https://nodejs.org/"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[*] Primeira execução detectada. Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[X] Erro ao instalar dependências."
        exit 1
    fi
    echo "[*] Dependências instaladas com sucesso!"
    echo ""
fi

echo "[*] Iniciando o servidor..."
npm start
