import express from 'express.js';
const router = express.Router();
import {  query  } from '../database/postgres.js';

// Listar todas as pessoas
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, e.nome as empresa_nome,
             CASE WHEN c.id IS NOT NULL THEN true ELSE false END as checkin_realizado,
             c.pulseira, c.checkin_at
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      ORDER BY p.nome
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({ error: 'Erro ao listar pessoas' });
  }
});

// Buscar pessoa por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT p.*, e.nome as empresa_nome,
             CASE WHEN c.id IS NOT NULL THEN true ELSE false END as checkin_realizado,
             c.pulseira, c.checkin_at
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar pessoa:', error);
    res.status(500).json({ error: 'Erro ao buscar pessoa' });
  }
});

// Buscar pessoa por documento
router.get('/documento/:documento', async (req, res) => {
  try {
    const { documento } = req.params;
    const result = await query(`
      SELECT p.*, e.nome as empresa_nome,
             CASE WHEN c.id IS NOT NULL THEN true ELSE false END as checkin_realizado,
             c.pulseira, c.checkin_at,
             (
               SELECT COUNT(*) 
               FROM pessoas p2 
               WHERE p2.empresa_id = p.empresa_id
             ) as total_empresa,
             (
               SELECT COUNT(*) 
               FROM pessoas p3 
               JOIN checkins c2 ON p3.id = c2.pessoa_id 
               WHERE p3.empresa_id = p.empresa_id
             ) as checkins_empresa
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE p.documento = $1
    `, [documento]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    const pessoa = result.rows[0];
    
    // Calcular posição na empresa
    const posicaoResult = await query(`
      SELECT COUNT(*) + 1 as posicao
      FROM pessoas p2
      WHERE p2.empresa_id = $1 AND p2.id < $2
    `, [pessoa.empresa_id, pessoa.id]);

    pessoa.posicao_empresa = parseInt(posicaoResult.rows[0].posicao);

    res.json(pessoa);
  } catch (error) {
    console.error('Erro ao buscar pessoa por documento:', error);
    res.status(500).json({ error: 'Erro ao buscar pessoa por documento' });
  }
});

// Criar nova pessoa
router.post('/', async (req, res) => {
  try {
    const { nome, documento, setor, empresa_id } = req.body;

    if (!nome || !documento || !empresa_id) {
      return res.status(400).json({ 
        error: 'Nome, documento e empresa são obrigatórios' 
      });
    }

    // Verificar se empresa existe
    const empresaResult = await query(`
      SELECT id FROM empresas WHERE id = $1
    `, [empresa_id]);

    if (empresaResult.rows.length === 0) {
      return res.status(400).json({ error: 'Empresa não encontrada' });
    }

    const result = await query(`
      INSERT INTO pessoas (nome, documento, setor, empresa_id) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [nome, documento, setor, empresa_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar pessoa:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Pessoa com este documento já existe' });
    }
    
    res.status(500).json({ error: 'Erro ao criar pessoa' });
  }
});

// Atualizar pessoa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, documento, setor, empresa_id } = req.body;

    if (!nome || !documento || !empresa_id) {
      return res.status(400).json({ 
        error: 'Nome, documento e empresa são obrigatórios' 
      });
    }

    // Verificar se empresa existe
    const empresaResult = await query(`
      SELECT id FROM empresas WHERE id = $1
    `, [empresa_id]);

    if (empresaResult.rows.length === 0) {
      return res.status(400).json({ error: 'Empresa não encontrada' });
    }

    const result = await query(`
      UPDATE pessoas 
      SET nome = $1, documento = $2, setor = $3, empresa_id = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 
      RETURNING *
    `, [nome, documento, setor, empresa_id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Pessoa com este documento já existe' });
    }
    
    res.status(500).json({ error: 'Erro ao atualizar pessoa' });
  }
});

// Deletar pessoa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existe check-in
    const checkinResult = await query(`
      SELECT COUNT(*) as count FROM checkins WHERE pessoa_id = $1
    `, [id]);

    if (parseInt(checkinResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar pessoa com check-in realizado' 
      });
    }

    const result = await query(`
      DELETE FROM pessoas WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.json({ message: 'Pessoa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar pessoa:', error);
    res.status(500).json({ error: 'Erro ao deletar pessoa' });
  }
});

export default router;

