import express from 'express';
const router = express.Router();
import {  query  } from '../database/postgres.js';

// Dashboard com estatísticas gerais
router.get('/dashboard', async (req, res) => {
  try {
    // Estatísticas gerais
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM empresas) as total_empresas,
        (SELECT COUNT(*) FROM pessoas) as total_pessoas,
        (SELECT COUNT(*) FROM checkins) as total_checkins,
        (SELECT COUNT(DISTINCT pessoa_id) FROM checkins) as pessoas_com_checkin
    `);

    const stats = statsResult.rows[0];

    // Check-ins por hora (últimas 24h)
    const checkinsPorHoraResult = await query(`
      SELECT 
        EXTRACT(HOUR FROM checkin_at) as hora,
        COUNT(*) as total
      FROM checkins 
      WHERE checkin_at >= NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM checkin_at)
      ORDER BY hora
    `);

    // Check-ins por empresa
    const checkinsPorEmpresaResult = await query(`
      SELECT 
        e.nome as empresa,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT c.id) as total_checkins,
        ROUND(
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COUNT(DISTINCT c.id)::float / COUNT(DISTINCT p.id) * 100)
            ELSE 0 
          END, 2
        ) as percentual_checkin
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      GROUP BY e.id, e.nome
      ORDER BY total_checkins DESC
    `);

    // Check-ins recentes
    const checkinsRecentesResult = await query(`
      SELECT 
        c.checkin_at,
        p.nome as pessoa_nome,
        p.documento,
        e.nome as empresa_nome,
        c.pulseira
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      JOIN empresas e ON p.empresa_id = e.id
      ORDER BY c.checkin_at DESC
      LIMIT 10
    `);

    res.json({
      estatisticas: stats,
      checkins_por_hora: checkinsPorHoraResult.rows,
      checkins_por_empresa: checkinsPorEmpresaResult.rows,
      checkins_recentes: checkinsRecentesResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

// Relatório por empresas
router.get('/empresas', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        e.id,
        e.nome as empresa,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT c.id) as total_checkins,
        COUNT(DISTINCT p.setor) as total_setores,
        ROUND(
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COUNT(DISTINCT c.id)::float / COUNT(DISTINCT p.id) * 100)
            ELSE 0 
          END, 2
        ) as percentual_checkin,
        MIN(c.checkin_at) as primeiro_checkin,
        MAX(c.checkin_at) as ultimo_checkin
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      GROUP BY e.id, e.nome
      ORDER BY total_checkins DESC, e.nome
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar relatório por empresas:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório por empresas' });
  }
});

// Relatório por setores
router.get('/setores', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COALESCE(p.setor, 'Não informado') as setor,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT c.id) as total_checkins,
        COUNT(DISTINCT e.id) as total_empresas,
        ROUND(
          CASE 
            WHEN COUNT(DISTINCT p.id) > 0 
            THEN (COUNT(DISTINCT c.id)::float / COUNT(DISTINCT p.id) * 100)
            ELSE 0 
          END, 2
        ) as percentual_checkin
      FROM pessoas p
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      LEFT JOIN empresas e ON p.empresa_id = e.id
      GROUP BY p.setor
      ORDER BY total_checkins DESC, setor
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar relatório por setores:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório por setores' });
  }
});

// Relatório detalhado de uma empresa
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;

    // Dados da empresa
    const empresaResult = await query(`
      SELECT * FROM empresas WHERE id = $1
    `, [empresaId]);

    if (empresaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Pessoas da empresa
    const pessoasResult = await query(`
      SELECT 
        p.*,
        CASE WHEN c.id IS NOT NULL THEN true ELSE false END as checkin_realizado,
        c.pulseira,
        c.checkin_at
      FROM pessoas p
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE p.empresa_id = $1
      ORDER BY p.nome
    `, [empresaId]);

    // Estatísticas por setor
    const setoresResult = await query(`
      SELECT 
        COALESCE(p.setor, 'Não informado') as setor,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT c.id) as total_checkins
      FROM pessoas p
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      WHERE p.empresa_id = $1
      GROUP BY p.setor
      ORDER BY total_checkins DESC, setor
    `, [empresaId]);

    res.json({
      empresa: empresaResult.rows[0],
      pessoas: pessoasResult.rows,
      setores: setoresResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar relatório da empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório da empresa' });
  }
});

// Relatório de check-ins por período
router.get('/periodo', async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    let whereClause = '';
    let params = [];

    if (inicio && fim) {
      whereClause = 'WHERE c.checkin_at BETWEEN $1 AND $2';
      params = [inicio, fim];
    } else if (inicio) {
      whereClause = 'WHERE c.checkin_at >= $1';
      params = [inicio];
    } else if (fim) {
      whereClause = 'WHERE c.checkin_at <= $1';
      params = [fim];
    }

    const result = await query(`
      SELECT 
        DATE(c.checkin_at) as data,
        COUNT(*) as total_checkins,
        COUNT(DISTINCT p.empresa_id) as empresas_ativas,
        COUNT(DISTINCT p.setor) as setores_ativos
      FROM checkins c
      JOIN pessoas p ON c.pessoa_id = p.id
      ${whereClause}
      GROUP BY DATE(c.checkin_at)
      ORDER BY data DESC
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar relatório por período:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório por período' });
  }
});

// Exportar dados para CSV (retorna JSON que pode ser convertido)
router.get('/export/csv', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.nome as "Nome",
        p.documento as "Documento",
        p.setor as "Setor",
        e.nome as "Empresa",
        CASE WHEN c.id IS NOT NULL THEN 'Sim' ELSE 'Não' END as "Check-in Realizado",
        c.pulseira as "Pulseira",
        TO_CHAR(c.checkin_at, 'DD/MM/YYYY HH24:MI:SS') as "Data/Hora Check-in"
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      ORDER BY e.nome, p.nome
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

export default router;

