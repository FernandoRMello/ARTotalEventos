import { neon } from '@netlify/neon';Add commentMore actions
const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

export default sql;

const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');


// Criar diretório do banco se não existir
const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'checkin.db');
const db = new Database(dbPath);

// Habilitar chaves estrangeiras
db.pragma('foreign_keys = ON');

// Criar tabelas
const createTables = () => {
  // Tabela de empresas
  db.exec(`
    CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de pessoas
  db.exec(`
    CREATE TABLE IF NOT EXISTS pessoas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      documento TEXT NOT NULL UNIQUE,
      setor TEXT,
      empresa_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )
  `);

  // Tabela de check-ins
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pessoa_id INTEGER NOT NULL,
      pulseira TEXT NOT NULL UNIQUE,
      checkin_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pessoa_id) REFERENCES pessoas(id)
    )
  `);

  // Índices para melhor performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pessoas_documento ON pessoas(documento);
    CREATE INDEX IF NOT EXISTS idx_pessoas_empresa ON pessoas(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_pessoa ON checkins(pessoa_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_pulseira ON checkins(pulseira);
  `);

  console.log('✅ Banco de dados inicializado com sucesso!');
};

// Trigger para atualizar updated_at automaticamente
const createTriggers = () => {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_empresas_timestamp 
    AFTER UPDATE ON empresas
    BEGIN
      UPDATE empresas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_pessoas_timestamp 
    AFTER UPDATE ON pessoas
    BEGIN
      UPDATE pessoas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
};

// Inicializar banco
try {
  createTables();
  createTriggers();
} catch (error) {
  console.error('❌ Erro ao inicializar banco de dados:', error);
  process.exit(1);
}

module.exports = db;

