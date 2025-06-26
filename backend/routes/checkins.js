const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Listar todos os check-ins
router.get('/', (req, res) => {
  try {
    const { empresa_id, data_inicio, data_fim } = req.query;
    
    let query = `
      SELECT c.*, p.nome, p.documento, p.setor, e.nome as empresa_nome
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (empresa_id) {
      query += ' AND p.empresa_id = ?';
      params.push(empresa_id);
    }
    
    if (data_inicio) {
      query += ' AND DATE(c.checkin_at) >= DATE(?)';
      params.push(data_inicio);
    }
    
    if (data_fim) {
      query += ' AND DATE(c.checkin_at) <= DATE(?)';
      params.push(data_fim);
    }
    
    query += ' ORDER BY c.checkin_at DESC';
    
    const checkins = db.prepare(query).all(...params);
    res.json(checkins);
  } catch (error) {
    console.error('Erro ao listar check-ins:', error);
    res.status(500).json({ error: 'Erro ao listar check-ins' });
  }
});

// Buscar check-in por ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const checkin = db.prepare(`
      SELECT c.*, p.nome, p.documento, p.setor, e.nome as empresa_nome
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      WHERE c.id = ?
    `).get(id);

    if (!checkin) {
      return res.status(404).json({ error: 'Check-in não encontrado' });
    }

    res.json(checkin);
  } catch (error) {
    console.error('Erro ao buscar check-in:', error);
    res.status(500).json({ error: 'Erro ao buscar check-in' });
  }
});

// Realizar check-in
router.post('/', (req, res) => {
  try {
    const { documento, pulseira } = req.body;

    // Validações
    if (!documento || documento.trim() === '') {
      return res.status(400).json({ error: 'Documento é obrigatório' });
    }
    
    if (!pulseira || pulseira.trim() === '') {
      return res.status(400).json({ error: 'Número da pulseira é obrigatório' });
    }

    // Buscar pessoa pelo documento
    const pessoa = db.prepare(`
      SELECT p.*, e.nome as empresa_nome
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      WHERE p.documento = ?
    `).get(documento.trim());

    if (!pessoa) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    // Verificar se já fez check-in
    const checkinExistente = db.prepare('SELECT id FROM checkins WHERE pessoa_id = ?').get(pessoa.id);
    if (checkinExistente) {
      return res.status(409).json({ error: 'Check-in já realizado para esta pessoa' });
    }

    // Verificar se pulseira já foi usada
    const pulseiraExistente = db.prepare('SELECT id FROM checkins WHERE pulseira = ?').get(pulseira.trim());
    if (pulseiraExistente) {
      return res.status(409).json({ error: 'Número de pulseira já utilizado' });
    }

    // Realizar check-in
    const stmt = db.prepare('INSERT INTO checkins (pessoa_id, pulseira) VALUES (?, ?)');
    const result = stmt.run(pessoa.id, pulseira.trim());

    // Buscar check-in criado com dados completos
    const checkin = db.prepare(`
      SELECT c.*, p.nome, p.documento, p.setor, e.nome as empresa_nome
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    // Buscar posição da pessoa no grupo da empresa
    const posicao = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM pessoas WHERE empresa_id = ? AND id <= ?) as posicao,
        (SELECT COUNT(*) FROM pessoas WHERE empresa_id = ?) as total
    `).get(pessoa.empresa_id, pessoa.id, pessoa.empresa_id);

    res.status(201).json({
      ...checkin,
      posicao_grupo: `${posicao.posicao} de ${posicao.total}`,
      message: 'Check-in realizado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao realizar check-in:', error);
    res.status(500).json({ error: 'Erro ao realizar check-in' });
  }
});

// Verificar status de check-in por documento
router.get('/status/:documento', (req, res) => {
  try {
    const { documento } = req.params;
    
    const resultado = db.prepare(`
      SELECT 
        p.id, p.nome, p.documento, p.setor, e.nome as empresa_nome,
        CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as checkin_realizado,
        c.pulseira, c.checkin_at
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE p.documento = ?
    `).get(documento);

    if (!resultado) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    // Se já fez check-in, buscar posição no grupo
    let posicao_grupo = null;
    if (resultado.checkin_realizado) {
      const posicao = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM pessoas WHERE empresa_id = ? AND id <= ?) as posicao,
          (SELECT COUNT(*) FROM pessoas WHERE empresa_id = ?) as total
      `).get(resultado.empresa_id, resultado.id, resultado.empresa_id);
      
      posicao_grupo = `${posicao.posicao} de ${posicao.total}`;
    }

    res.json({
      ...resultado,
      posicao_grupo
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// Cancelar check-in (apenas para casos especiais)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('DELETE FROM checkins WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Check-in não encontrado' });
    }

    res.json({ message: 'Check-in cancelado com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar check-in:', error);
    res.status(500).json({ error: 'Erro ao cancelar check-in' });
  }
});

module.exports = router;

