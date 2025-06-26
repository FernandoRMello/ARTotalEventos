# Sistema de Check-in AR - Frontend

Sistema web responsivo para controle de entrada de pessoas em eventos, desenvolvido em React com Tailwind CSS.

## 🚀 Deploy Rápido no Netlify

### Opção 1: Upload Direto (Recomendado)

1. **Prepare o projeto:**
   ```bash
   npm install
   npm run build
   ```

2. **Faça upload no Netlify:**
   - Acesse [netlify.com](https://netlify.com)
   - Arraste a pasta `dist` para o deploy
   - Ou use o Netlify CLI: `netlify deploy --prod --dir=dist`

### Opção 2: Conectar ao Git

1. **Push para seu repositório Git**
2. **Configure no Netlify:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

## ⚙️ Configuração de Variáveis de Ambiente

No painel do Netlify, configure:

```
VITE_API_URL=https://seu-backend.onrender.com
VITE_APP_NAME=Sistema de Check-in AR Total Eventos
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

## 🔧 Backend

O frontend precisa de um backend Node.js. Deploy recomendado:

### Render.com (Gratuito)
1. Faça upload da pasta `backend` para um repositório Git
2. Conecte ao Render.com
3. Configure as variáveis de ambiente
4. Atualize `VITE_API_URL` no Netlify

### Railway.app
1. Conecte o repositório ao Railway
2. Configure as variáveis de ambiente
3. Atualize `VITE_API_URL` no Netlify

## 📱 Funcionalidades

- ✅ **PWA Instalável** - Funciona como app nativo
- ✅ **Responsivo** - Tablets, smartphones e desktop
- ✅ **Importação Excel** - Upload e validação de planilhas
- ✅ **OCR de Documentos** - Extração automática de dados
- ✅ **Check-in Digital** - Validação de pulseiras
- ✅ **Relatórios Gerenciais** - Gráficos em tempo real
- ✅ **Offline Ready** - Service Worker configurado

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📦 Estrutura do Projeto

```
src/
├── components/ui/     # Componentes base (shadcn/ui)
├── pages/            # Páginas da aplicação
├── lib/              # Utilitários e configurações
└── main.jsx          # Ponto de entrada

public/
├── manifest.json     # PWA manifest
├── sw.js            # Service Worker
├── _redirects       # Redirects do Netlify
└── icons/           # Ícones do PWA
```

## 🔗 URLs de Exemplo

- **Demo Online:** https://knksymdk.manus.space
- **Repositório:** Seu repositório Git
- **Backend Demo:** https://checkin-ar-backend-demo.onrender.com

## 📞 Suporte

Para dúvidas sobre configuração ou problemas técnicos, consulte a documentação completa no arquivo principal README.md do projeto.

