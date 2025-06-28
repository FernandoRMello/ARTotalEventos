import express from 'express';
const router = express.Router();
import {  query  } from '../database/postgres.js';

// Listar todas as empresas
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT e.*, 
             COUNT(DISTINCT p.id) as total_pessoas,
             COUNT(DISTINCT c.id) as total_checkins
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      GROUP BY e.id, e.nome, e.created_at, e.updated_at
      ORDER BY e.nome
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

// Buscar empresa por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT e.*, 
             COUNT(DISTINCT p.id) as total_pessoas,
             COUNT(DISTINCT c.id) as total_checkins
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE e.id = $1
      GROUP BY e.id, e.nome, e.created_at, e.updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

// Criar nova empresa
router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }

    const result = await query(`
      INSERT INTO empresas (nome) 
      VALUES ($1) 
      RETURNING *
    `, [nome]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Empresa com este nome já existe' });
    }
    
    res.status(500).json({ error: 'Erro ao criar empresa' });
  }
});

// Atualizar empresa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }

    const result = await query(`
      UPDATE empresas 
      SET nome = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 
      RETURNING *
    `, [nome, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Empresa com este nome já existe' });
    }
    
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

// Deletar empresa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existem pessoas vinculadas
    const pessoasResult = await query(`
      SELECT COUNT(*) as count FROM pessoas WHERE empresa_id = $1
    `, [id]);

    if (parseInt(pessoasResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar empresa com pessoas cadastradas' 
      });
    }

    const result = await query(`
      DELETE FROM empresas WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json({ message: 'Empresa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar empresa:', error);
    res.status(500).json({ error: 'Erro ao deletar empresa' });
  }
});

export default router;

