import express from 'express';
const router = express.Router();
import {  query  } from '../database/postgres.js';

// Listar todos os check-ins
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, p.nome as pessoa_nome, p.documento, p.setor,
             e.nome as empresa_nome
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      ORDER BY c.checkin_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar check-ins:', error);
    res.status(500).json({ error: 'Erro ao listar check-ins' });
  }
});

// Buscar check-in por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT c.*, p.nome as pessoa_nome, p.documento, p.setor,
             e.nome as empresa_nome
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Check-in não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar check-in:', error);
    res.status(500).json({ error: 'Erro ao buscar check-in' });
  }
});

// Buscar check-ins de uma pessoa
router.get('/pessoa/:pessoaId', async (req, res) => {
  try {
    const { pessoaId } = req.params;
    const result = await query(`
      SELECT c.*, p.nome as pessoa_nome, p.documento, p.setor,
             e.nome as empresa_nome
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      WHERE c.pessoa_id = $1
      ORDER BY c.checkin_at DESC
    `, [pessoaId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar check-ins da pessoa:', error);
    res.status(500).json({ error: 'Erro ao buscar check-ins da pessoa' });
  }
});

// Realizar check-in
router.post('/', async (req, res) => {
  try {
    const { pessoa_id, pulseira } = req.body;

    if (!pessoa_id || !pulseira) {
      return res.status(400).json({ 
        error: 'ID da pessoa e número da pulseira são obrigatórios' 
      });
    }

    // Verificar se pessoa existe
    const pessoaResult = await query(`
      SELECT p.*, e.nome as empresa_nome
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      WHERE p.id = $1
    `, [pessoa_id]);

    if (pessoaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    // Verificar se já fez check-in
    const checkinExistente = await query(`
      SELECT id FROM checkins WHERE pessoa_id = $1
    `, [pessoa_id]);

    if (checkinExistente.rows.length > 0) {
      return res.status(400).json({ error: 'Pessoa já realizou check-in' });
    }

    // Verificar se pulseira já foi usada
    const pulseiraExistente = await query(`
      SELECT id FROM checkins WHERE pulseira = $1
    `, [pulseira]);

    if (pulseiraExistente.rows.length > 0) {
      return res.status(400).json({ error: 'Pulseira já foi utilizada' });
    }

    // Realizar check-in
    const result = await query(`
      INSERT INTO checkins (pessoa_id, pulseira) 
      VALUES ($1, $2) 
      RETURNING *
    `, [pessoa_id, pulseira]);

    // Buscar dados completos do check-in
    const checkinCompleto = await query(`
      SELECT c.*, p.nome as pessoa_nome, p.documento, p.setor,
             e.nome as empresa_nome
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(checkinCompleto.rows[0]);
  } catch (error) {
    console.error('Erro ao realizar check-in:', error);
    
    if (error.code === '23505') { // Unique violation
      if (error.constraint && error.constraint.includes('pulseira')) {
        return res.status(400).json({ error: 'Pulseira já foi utilizada' });
      }
    }
    
    res.status(500).json({ error: 'Erro ao realizar check-in' });
  }
});

// Cancelar check-in (apenas para casos especiais)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM checkins WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Check-in não encontrado' });
    }

    res.json({ message: 'Check-in cancelado com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar check-in:', error);
    res.status(500).json({ error: 'Erro ao cancelar check-in' });
  }
});

// Estatísticas de check-ins
router.get('/stats/geral', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_checkins,
        COUNT(DISTINCT p.id) as total_pessoas_checkin,
        COUNT(DISTINCT e.id) as total_empresas_checkin,
        (SELECT COUNT(*) FROM pessoas) as total_pessoas_cadastradas,
        (SELECT COUNT(*) FROM empresas) as total_empresas_cadastradas
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
    `);

    const stats = result.rows[0];
    stats.percentual_checkin = stats.total_pessoas_cadastradas > 0 
      ? ((stats.total_pessoas_checkin / stats.total_pessoas_cadastradas) * 100).toFixed(2)
      : 0;

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default router;

