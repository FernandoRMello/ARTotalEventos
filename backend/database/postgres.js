import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Função para executar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Função para obter um cliente do pool
async function getClient() {
  return await pool.connect();
}

// Função para inicializar as tabelas
async function initializeTables() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Criar tabela de empresas
    await client.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela de pessoas
    await client.query(`
      CREATE TABLE IF NOT EXISTS pessoas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        documento VARCHAR(50) NOT NULL UNIQUE,
        empresa_id INTEGER REFERENCES empresas(id),
        setor VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela de checkins
    await client.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        pessoa_id INTEGER REFERENCES pessoas(id),
        pulseira VARCHAR(50) NOT NULL UNIQUE,
        checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checkin_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pessoas_documento ON pessoas(documento);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pessoas_empresa ON pessoas(empresa_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_checkins_pessoa ON checkins(pessoa_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_checkins_pulseira ON checkins(pulseira);`);

    await client.query('COMMIT');
    console.log('✅ Tabelas PostgreSQL inicializadas com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao inicializar tabelas:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Testar conexão com banco
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Conexão PostgreSQL estabelecida:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão PostgreSQL:', error.message);
    return false;
  }
}

// Encerrar pool
async function closePool() {
  await pool.end();
  console.log('Pool de conexões PostgreSQL fechado');
}
export {
  query,
  getClient,
  pool,
  initializeTables,
  testConnection,
  closePool
};
