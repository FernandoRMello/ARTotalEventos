# Sistema de Check-in AR - Backend

API REST em Node.js + Express + SQLite para o sistema de check-in de eventos.

## 🚀 Deploy Rápido

### Render.com (Recomendado - Gratuito)

1. **Prepare o repositório:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Configure no Render:**
   - Conecte seu repositório
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment: `Node`

3. **Variáveis de ambiente:**
   ```
   NODE_ENV=production
   PORT=10000
   CORS_ORIGIN=https://seu-frontend.netlify.app
   ```

### Railway.app

1. **Deploy direto:**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

2. **Variáveis de ambiente:**
   ```
   NODE_ENV=production
   CORS_ORIGIN=https://seu-frontend.netlify.app
   ```

### Heroku

1. **Deploy:**
   ```bash
   heroku create seu-app-name
   git push heroku main
   ```

2. **Configurar variáveis:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN=https://seu-frontend.netlify.app
   ```

## 📋 Variáveis de Ambiente

```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://seu-frontend.netlify.app
```

## 🗄️ Banco de Dados

- **SQLite** - Arquivo local `database.db`
- **Criação automática** - Tabelas criadas na primeira execução
- **Backup** - Arquivo pode ser baixado para backup

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

## 📡 Endpoints da API

### Empresas
- `GET /api/empresas` - Listar empresas
- `POST /api/empresas` - Criar empresa
- `PUT /api/empresas/:id` - Atualizar empresa
- `DELETE /api/empresas/:id` - Deletar empresa

### Pessoas
- `GET /api/pessoas` - Listar pessoas
- `POST /api/pessoas` - Criar pessoa
- `GET /api/pessoas/documento/:documento` - Buscar por documento
- `PUT /api/pessoas/:id` - Atualizar pessoa
- `DELETE /api/pessoas/:id` - Deletar pessoa

### Check-ins
- `GET /api/checkins` - Listar check-ins
- `POST /api/checkins` - Fazer check-in
- `GET /api/checkins/pessoa/:pessoaId` - Check-ins de uma pessoa

### Upload
- `POST /api/upload/excel/validar` - Validar arquivo Excel
- `POST /api/upload/excel` - Importar arquivo Excel
- `POST /api/upload/ocr` - OCR de documento

### Relatórios
- `GET /api/relatorios/dashboard` - Dados do dashboard
- `GET /api/relatorios/empresas` - Relatório por empresas
- `GET /api/relatorios/setores` - Relatório por setores

## 📦 Dependências

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "better-sqlite3": "^8.7.0",
  "multer": "^1.4.5",
  "xlsx": "^0.18.5",
  "tesseract.js": "^4.1.1",
  "helmet": "^7.1.0",
  "morgan": "^1.10.0"
}
```

## 🔒 Segurança

- **Helmet** - Headers de segurança
- **CORS** - Configurado para frontend específico
- **Validação** - Dados validados antes de inserção
- **Rate Limiting** - Proteção contra spam

## 📁 Estrutura

```
backend/
├── routes/           # Rotas da API
├── database/         # Configuração do banco
├── uploads/          # Arquivos temporários
├── server.js         # Servidor principal
└── package.json      # Dependências
```

## 🔗 URLs de Exemplo

- **Demo Backend:** https://checkin-ar-backend-demo.onrender.com
- **Health Check:** https://seu-backend.onrender.com/health
- **API Docs:** https://seu-backend.onrender.com/api

## 📞 Suporte

Para problemas técnicos ou dúvidas sobre a API, consulte a documentação completa no README principal do projeto.

