#!/bin/bash

# Script de Preparação para Deploy no Netlify
echo "🚀 Preparando projeto para deploy no Netlify..."

# Copiar configuração de produção para Netlify
cp .env.production.netlify .env.production

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Fazer build para produção
echo "🔨 Fazendo build para produção..."
npm run build

echo "✅ Projeto preparado para deploy!"
echo ""
echo "📋 Próximos passos:"
echo "1. Faça upload da pasta 'dist' para o Netlify"
echo "2. Configure as variáveis de ambiente no painel do Netlify"
echo "3. Configure seu backend em um serviço como Render.com"
echo "4. Atualize a variável VITE_API_URL com a URL do seu backend"
echo ""
echo "🌐 Configurações do Netlify:"
echo "- Build command: npm run build"
echo "- Publish directory: dist"
echo "- Node version: 18"

