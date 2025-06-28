import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import empresasRouter from './routes/empresas.js';
import pessoasRouter from './routes/pessoas.js';
import checkinsRouter from './routes/checkins.js';
import uploadRouter from './routes/upload.js';
import postgres from './database/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rotas da API
app.use('/api/empresas', empresasRouter);
app.use('/api/pessoas', pessoasRouter);
app.use('/api/checkins', checkinsRouter);
app.use('/api/upload', uploadRouter);

// Inicialização do banco de dados
async function startServer() {
  console.log('🔄 Iniciando sistema...');
  console.log('🔄 Testando conexão com PostgreSQL...');
  const conectado = await postgres.testConnection();
  if (!conectado) {
    console.log('❌ Não foi possível conectar ao banco de dados');
    process.exit(1);
  }

  console.log('🔄 Inicializando tabelas do banco...');
  await postgres.initializeTables();

  app.listen(PORT, () => {
    console.log('🚀 Servidor iniciado com sucesso!');
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🌐 Rede: http://10.214.166.197:${PORT}`);
    console.log('💾 Banco: PostgreSQL (Neon)');
    console.log(`📱 Acesso em rede: http://10.214.166.197:${PORT}`);
    console.log('✅ Sistema pronto para uso!');
  });
}

startServer();
