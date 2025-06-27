import express from 'express';
import empresasRoutes from './routes/empresas.js';
const db = require('../database/init');

// Listar todas as empresas
router.get('/', (req, res) => {
  try {
    const empresas = db.prepare(`
      SELECT e.*, 
             COUNT(p.id) as total_pessoas,
             COUNT(c.id) as total_checkins
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      GROUP BY e.id
      ORDER BY e.nome
    `).all();

    res.json(empresas);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

// Buscar empresa por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const empresa = db.prepare(`
      SELECT e.*, 
             COUNT(p.id) as total_pessoas,
             COUNT(c.id) as total_checkins
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE e.id = ?
      GROUP BY e.id
    `).get(id);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json(empresa);
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

// Criar nova empresa
router.post('/', (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }

    const stmt = db.prepare('INSERT INTO empresas (nome) VALUES (?)');
    const result = stmt.run(nome.trim());

    const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(empresa);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Empresa já existe' });
    }
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ error: 'Erro ao criar empresa' });
  }
});

// Atualizar empresa
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }

    const stmt = db.prepare('UPDATE empresas SET nome = ? WHERE id = ?');
    const result = stmt.run(nome.trim(), id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(id);
    res.json(empresa);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Empresa já existe' });
    }
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

// Deletar empresa
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se há pessoas vinculadas
    const pessoasCount = db.prepare('SELECT COUNT(*) as count FROM pessoas WHERE empresa_id = ?').get(id);
    
    if (pessoasCount.count > 0) {
      return res.status(409).json({ 
        error: 'Não é possível deletar empresa com pessoas cadastradas' 
      });
    }

    const stmt = db.prepare('DELETE FROM empresas WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json({ message: 'Empresa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar empresa:', error);
    res.status(500).json({ error: 'Erro ao deletar empresa' });
  }
});

module.exports = router;

