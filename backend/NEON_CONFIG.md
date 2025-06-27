# Configuração Neon PostgreSQL

## 🔧 Configuração do Banco de Dados

O sistema agora utiliza PostgreSQL (Neon) ao invés de SQLite para garantir funcionamento online completo.

### 📋 Variáveis de Ambiente Necessárias

Configure uma das seguintes variáveis no seu ambiente de produção:

```bash
# Opção 1: URL padrão
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Opção 2: URL do Netlify (se usando Netlify Functions)
NETLIFY_DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Opção 3: URL sem pool (para alguns serviços)
NETLIFY_DATABASE_URL_UNPOOLED=postgresql://username:password@host:port/database?sslmode=require
```

### 🌐 Configuração para Neon

1. **Acesse seu dashboard Neon**
2. **Copie a connection string** do seu banco
3. **Configure a variável de ambiente** no seu serviço de deploy

#### Exemplo de URL Neon:
```
postgresql://username:password@ep-example-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 🚀 Deploy no Render.com

1. Crie um novo Web Service no Render
2. Conecte seu repositório
3. Configure as variáveis de ambiente:
   - `DATABASE_URL`: Sua URL do Neon
   - `NODE_ENV`: `production`
   - `PORT`: `3001` (ou deixe automático)

### 🔧 Deploy no Railway

1. Crie um novo projeto no Railway
2. Conecte seu repositório
3. Configure as variáveis:
   - `DATABASE_URL`: Sua URL do Neon
   - `NODE_ENV`: `production`

### 📱 Deploy no Netlify Functions

1. Configure no `netlify.toml`:
```toml
[build.environment]
  NETLIFY_DATABASE_URL = "sua-url-neon-aqui"
```

### ✅ Verificação da Conexão

O sistema automaticamente:
- ✅ Testa a conexão na inicialização
- ✅ Cria as tabelas necessárias
- ✅ Configura índices para performance
- ✅ Exibe status no health check (`/health`)

### 🔍 Troubleshooting

#### Erro: "DATABASE_URL não encontrada"
- Verifique se a variável está configurada corretamente
- Certifique-se de que o nome da variável está correto

#### Erro: "Não foi possível conectar ao banco"
- Verifique se a URL do Neon está correta
- Confirme se o banco está ativo no dashboard Neon
- Verifique se o SSL está habilitado (`sslmode=require`)

#### Erro: "Tabelas não encontradas"
- O sistema cria as tabelas automaticamente
- Verifique os logs de inicialização
- Confirme se o usuário tem permissões de CREATE TABLE

### 📊 Estrutura das Tabelas

```sql
-- Empresas
CREATE TABLE empresas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pessoas
CREATE TABLE pessoas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  documento VARCHAR(50) NOT NULL UNIQUE,
  empresa_id INTEGER REFERENCES empresas(id),
  setor VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check-ins
CREATE TABLE checkins (
  id SERIAL PRIMARY KEY,
  pessoa_id INTEGER REFERENCES pessoas(id),
  pulseira VARCHAR(50) NOT NULL UNIQUE,
  checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checkin_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🎯 Benefícios do PostgreSQL

- ✅ **Persistência garantida** - Dados não são perdidos
- ✅ **Escalabilidade** - Suporta milhares de usuários
- ✅ **Backup automático** - Neon faz backup automático
- ✅ **Performance** - Índices otimizados
- ✅ **Segurança** - SSL/TLS obrigatório
- ✅ **Monitoramento** - Dashboard completo no Neon

