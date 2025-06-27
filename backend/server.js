import express from 'express.js';
import cors from 'cors.js';
import helmet from 'helmet.js';
import morgan from 'morgan.js';
import path from 'path.js';
import fs from 'fs.js';
require('dotenv').config();

import {  initializeTables, testConnection  } from './database/postgres.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Importar rotas
import empresasRoutes from './routes/empresas.js';
import pessoasRoutes from './routes/pessoas.js';
import checkinsRoutes from './routes/checkins.js';
import relatoriosRoutes from './routes/relatorios.js';
import uploadRoutes from './routes/upload.js';

// Usar rotas
app.use('/api/empresas', empresasRoutes);
app.use('/api/pessoas', pessoasRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/upload', uploadRoutes);

// Rota de health check
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'PostgreSQL connected' : 'PostgreSQL disconnected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Rota para servir o frontend React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

// Função para obter IP local
function getLocalIP() {
  import { networkInterfaces } from 'os';
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results[0] || 'localhost';
}

// Inicializar servidor
const startServer = async () => {
  try {
    console.log('🔄 Iniciando sistema...');
    
    // Verificar variáveis de ambiente
    if (!process.env.DATABASE_URL && !process.env.NETLIFY_DATABASE_URL && !process.env.NETLIFY_DATABASE_URL_UNPOOLED) {
      console.error('❌ Variável DATABASE_URL não encontrada!');
      console.log('💡 Configure uma das seguintes variáveis:');
      console.log('   - DATABASE_URL');
      console.log('   - NETLIFY_DATABASE_URL');
      console.log('   - NETLIFY_DATABASE_URL_UNPOOLED');
      process.exit(1);
    }

    // Testar conexão com banco
    console.log('🔄 Testando conexão com PostgreSQL...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Não foi possível conectar ao banco de dados');
      console.log('💡 Verifique se a URL do banco está correta');
      process.exit(1);
    }

    // Inicializar banco de dados
    console.log('🔄 Inicializando tabelas do banco...');
    await initializeTables();

    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      const localIP = getLocalIP();
      console.log(`
🚀 Servidor iniciado com sucesso!
📍 Local: http://localhost:${PORT}
🌐 Rede: http://${localIP}:${PORT}
💾 Banco: PostgreSQL (Neon)
📱 Para acessar de outros dispositivos, use: http://${localIP}:${PORT}
✅ Sistema pronto para uso!
      `);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

export default app;

