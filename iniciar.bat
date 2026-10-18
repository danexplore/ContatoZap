@echo off
chcp 65001 >nul
title Extrator de Grupos do WhatsApp

echo ========================================================
echo    Extrator de Grupos e Contatos do WhatsApp
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Node.js não foi encontrado no seu sistema.
    echo.
    echo Por favor, instale o Node.js ^(versão 22 ou superior^):
    echo Acesse: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [*] Primeira execução detectada. Instalando dependências...
    call npm install
    if %errorlevel% neq 0 (
        echo [X] Ocorreu um erro ao instalar dependências.
        pause
        exit /b 1
    )
    echo [*] Dependências instaladas com sucesso!
    echo.
)

echo [*] Iniciando o servidor e abrindo a interface...
echo [*] Pressione CTRL + C para encerrar.
echo.

call npm start

if %errorlevel% neq 0 (
    echo.
    echo [X] O servidor foi encerrado ou encontrou um erro.
    pause
)
