const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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
const empresasRoutes = require('./routes/empresas');
const pessoasRoutes = require('./routes/pessoas');
const checkinsRoutes = require('./routes/checkins');
const relatoriosRoutes = require('./routes/relatorios');
const uploadRoutes = require('./routes/upload');

// Usar rotas
app.use('/api/empresas', empresasRoutes);
app.use('/api/pessoas', pessoasRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/upload', uploadRoutes);

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

// Inicializar banco de dados
const db = require('./database/init');

// Função para obter IP local
function getLocalIP() {
  const { networkInterfaces } = require('os');
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

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`
🚀 Servidor iniciado com sucesso!
📍 Local: http://localhost:${PORT}
🌐 Rede: http://${localIP}:${PORT}
📱 Para acessar de outros dispositivos, use: http://${localIP}:${PORT}
  `);
});

module.exports = app;

