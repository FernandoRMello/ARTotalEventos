// server.mjs
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import empresasRoutes from './routes/empresas.js';
import pessoasRoutes from './routes/pessoas.js';
import checkinsRoutes from './routes/checkins.js';
import uploadRoutes from './routes/upload.js';
import { initializeTables, testConnection } from './database/postgres.js';

const app = express();
dotenv.config();

app.use(cors({
  origin: ['https://archeckin.netlify.app'],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 10000;

app.use('/api/empresas', empresasRoutes);
app.use('/api/pessoas', pessoasRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/upload', uploadRoutes);

async function getLocalIPAddress() {
  const { networkInterfaces } = await import('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

async function startServer() {
  console.log('🔄 Iniciando sistema...');

  console.log('🔄 Testando conexão com PostgreSQL...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Não foi possível conectar ao banco de dados');
    process.exit(1);
  }

  console.log('🔄 Inicializando tabelas do banco...');
  await initializeTables();

  const ip = await getLocalIPAddress();

  app.listen(PORT, () => {
    console.log('🚀 Servidor iniciado com sucesso!');
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🌐 Rede: http://${ip}:${PORT}`);
    console.log('💾 Banco: PostgreSQL (Neon)');
    console.log(`📱 Acesso em rede: http://${ip}:${PORT}`);
    console.log('✅ Sistema pronto para uso!');
  });
}

startServer().catch(err => {
  console.error('❌ Erro ao iniciar o servidor:', err);
  process.exit(1);
});
