const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Listar todas as pessoas
router.get('/', (req, res) => {
  try {
    const { empresa_id, setor, search } = req.query;
    
    let query = `
      SELECT p.*, e.nome as empresa_nome,
             CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as checkin_realizado,
             c.pulseira, c.checkin_at
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (empresa_id) {
      query += ' AND p.empresa_id = ?';
      params.push(empresa_id);
    }
    
    if (setor) {
      query += ' AND p.setor LIKE ?';
      params.push(`%${setor}%`);
    }
    
    if (search) {
      query += ' AND (p.nome LIKE ? OR p.documento LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY p.nome';
    
    const pessoas = db.prepare(query).all(...params);
    res.json(pessoas);
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({ error: 'Erro ao listar pessoas' });
  }
});

// Buscar pessoa por documento
router.get('/documento/:documento', (req, res) => {
  try {
    const { documento } = req.params;
    
    const pessoa = db.prepare(`
      SELECT p.*, e.nome as empresa_nome,
             CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as checkin_realizado,
             c.pulseira, c.checkin_at
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE p.documento = ?
    `).get(documento);

    if (!pessoa) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    // Buscar posição da pessoa no grupo da empresa
    const posicao = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM pessoas WHERE empresa_id = ? AND id <= ?) as posicao,
        (SELECT COUNT(*) FROM pessoas WHERE empresa_id = ?) as total
    `).get(pessoa.empresa_id, pessoa.id, pessoa.empresa_id);

    res.json({
      ...pessoa,
      posicao_grupo: `${posicao.posicao} de ${posicao.total}`
    });
  } catch (error) {
    console.error('Erro ao buscar pessoa por documento:', error);
    res.status(500).json({ error: 'Erro ao buscar pessoa' });
  }
});

// Buscar pessoa por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const pessoa = db.prepare(`
      SELECT p.*, e.nome as empresa_nome,
             CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as checkin_realizado,
             c.pulseira, c.checkin_at
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE p.id = ?
    `).get(id);

    if (!pessoa) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.json(pessoa);
  } catch (error) {
    console.error('Erro ao buscar pessoa:', error);
    res.status(500).json({ error: 'Erro ao buscar pessoa' });
  }
});

// Criar nova pessoa
router.post('/', (req, res) => {
  try {
    const { nome, documento, setor, empresa_id } = req.body;

    // Validações
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    if (!documento || documento.trim() === '') {
      return res.status(400).json({ error: 'Documento é obrigatório' });
    }
    
    if (!empresa_id) {
      return res.status(400).json({ error: 'Empresa é obrigatória' });
    }

    // Verificar se empresa existe
    const empresa = db.prepare('SELECT id FROM empresas WHERE id = ?').get(empresa_id);
    if (!empresa) {
      return res.status(400).json({ error: 'Empresa não encontrada' });
    }

    const stmt = db.prepare(`
      INSERT INTO pessoas (nome, documento, setor, empresa_id) 
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      nome.trim(), 
      documento.trim(), 
      setor?.trim() || null, 
      empresa_id
    );

    const pessoa = db.prepare(`
      SELECT p.*, e.nome as empresa_nome
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(pessoa);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Documento já cadastrado' });
    }
    console.error('Erro ao criar pessoa:', error);
    res.status(500).json({ error: 'Erro ao criar pessoa' });
  }
});

// Atualizar pessoa
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nome, documento, setor, empresa_id } = req.body;

    // Validações
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    if (!documento || documento.trim() === '') {
      return res.status(400).json({ error: 'Documento é obrigatório' });
    }
    
    if (!empresa_id) {
      return res.status(400).json({ error: 'Empresa é obrigatória' });
    }

    // Verificar se empresa existe
    const empresa = db.prepare('SELECT id FROM empresas WHERE id = ?').get(empresa_id);
    if (!empresa) {
      return res.status(400).json({ error: 'Empresa não encontrada' });
    }

    const stmt = db.prepare(`
      UPDATE pessoas 
      SET nome = ?, documento = ?, setor = ?, empresa_id = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      nome.trim(), 
      documento.trim(), 
      setor?.trim() || null, 
      empresa_id,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    const pessoa = db.prepare(`
      SELECT p.*, e.nome as empresa_nome
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      WHERE p.id = ?
    `).get(id);

    res.json(pessoa);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Documento já cadastrado' });
    }
    console.error('Erro ao atualizar pessoa:', error);
    res.status(500).json({ error: 'Erro ao atualizar pessoa' });
  }
});

// Deletar pessoa
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se há check-in realizado
    const checkin = db.prepare('SELECT id FROM checkins WHERE pessoa_id = ?').get(id);
    if (checkin) {
      return res.status(409).json({ 
        error: 'Não é possível deletar pessoa que já fez check-in' 
      });
    }

    const stmt = db.prepare('DELETE FROM pessoas WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.json({ message: 'Pessoa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar pessoa:', error);
    res.status(500).json({ error: 'Erro ao deletar pessoa' });
  }
});

module.exports = router;

