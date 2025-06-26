const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Relatório geral
router.get('/geral', (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (data_inicio || data_fim) {
      whereClause = 'WHERE ';
      const conditions = [];
      
      if (data_inicio) {
        conditions.push('DATE(c.checkin_at) >= DATE(?)');
        params.push(data_inicio);
      }
      
      if (data_fim) {
        conditions.push('DATE(c.checkin_at) <= DATE(?)');
        params.push(data_fim);
      }
      
      whereClause += conditions.join(' AND ');
    }

    const totais = db.prepare(`
      SELECT 
        COUNT(DISTINCT e.id) as total_empresas,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT c.id) as total_checkins,
        ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT p.id) * 100, 2) as percentual_checkin
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id ${whereClause}
    `).get(...params);

    res.json(totais);
  } catch (error) {
    console.error('Erro ao gerar relatório geral:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório geral' });
  }
});

// Relatório por empresa
router.get('/empresas', (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (data_inicio || data_fim) {
      whereClause = 'WHERE ';
      const conditions = [];
      
      if (data_inicio) {
        conditions.push('DATE(c.checkin_at) >= DATE(?)');
        params.push(data_inicio);
      }
      
      if (data_fim) {
        conditions.push('DATE(c.checkin_at) <= DATE(?)');
        params.push(data_fim);
      }
      
      whereClause += conditions.join(' AND ');
    }

    const empresas = db.prepare(`
      SELECT 
        e.id,
        e.nome as empresa,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT c.id) as total_checkins,
        ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT p.id) * 100, 2) as percentual_checkin,
        GROUP_CONCAT(DISTINCT p.setor) as setores
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id ${whereClause}
      GROUP BY e.id, e.nome
      ORDER BY total_checkins DESC, e.nome
    `).all(...params);

    res.json(empresas);
  } catch (error) {
    console.error('Erro ao gerar relatório por empresa:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório por empresa' });
  }
});

// Relatório por setor
router.get('/setores', (req, res) => {
  try {
    const { empresa_id, data_inicio, data_fim } = req.query;
    
    let whereClause = 'WHERE p.setor IS NOT NULL AND p.setor != ""';
    const params = [];
    
    if (empresa_id) {
      whereClause += ' AND p.empresa_id = ?';
      params.push(empresa_id);
    }
    
    if (data_inicio) {
      whereClause += ' AND DATE(c.checkin_at) >= DATE(?)';
      params.push(data_inicio);
    }
    
    if (data_fim) {
      whereClause += ' AND DATE(c.checkin_at) <= DATE(?)';
      params.push(data_fim);
    }

    const setores = db.prepare(`
      SELECT 
        p.setor,
        e.nome as empresa,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT c.id) as total_checkins,
        ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT p.id) * 100, 2) as percentual_checkin
      FROM pessoas p
      JOIN empresas e ON p.empresa_id = e.id
      LEFT JOIN checkins c ON p.id = c.pessoa_id
      ${whereClause}
      GROUP BY p.setor, e.nome
      ORDER BY total_checkins DESC, p.setor
    `).all(...params);

    res.json(setores);
  } catch (error) {
    console.error('Erro ao gerar relatório por setor:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório por setor' });
  }
});

// Relatório detalhado por empresa e setor
router.get('/detalhado', (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (data_inicio || data_fim) {
      whereClause = 'WHERE ';
      const conditions = [];
      
      if (data_inicio) {
        conditions.push('DATE(c.checkin_at) >= DATE(?)');
        params.push(data_inicio);
      }
      
      if (data_fim) {
        conditions.push('DATE(c.checkin_at) <= DATE(?)');
        params.push(data_fim);
      }
      
      whereClause += conditions.join(' AND ');
    }

    const detalhado = db.prepare(`
      SELECT 
        e.nome as empresa,
        COALESCE(p.setor, 'Sem setor') as setor,
        COUNT(DISTINCT p.id) as total_pessoas,
        COUNT(DISTINCT c.id) as total_checkins,
        ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT p.id) * 100, 2) as percentual_checkin,
        GROUP_CONCAT(
          CASE WHEN c.id IS NOT NULL 
          THEN p.nome || ' (' || p.documento || ')' 
          END
        ) as pessoas_checkin,
        GROUP_CONCAT(
          CASE WHEN c.id IS NULL 
          THEN p.nome || ' (' || p.documento || ')' 
          END
        ) as pessoas_sem_checkin
      FROM empresas e
      LEFT JOIN pessoas p ON e.id = p.empresa_id
      LEFT JOIN checkins c ON p.id = c.pessoa_id ${whereClause}
      GROUP BY e.nome, COALESCE(p.setor, 'Sem setor')
      ORDER BY e.nome, setor
    `).all(...params);

    res.json(detalhado);
  } catch (error) {
    console.error('Erro ao gerar relatório detalhado:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório detalhado' });
  }
});

// Relatório de check-ins por horário
router.get('/horarios', (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (data_inicio || data_fim) {
      whereClause = 'WHERE ';
      const conditions = [];
      
      if (data_inicio) {
        conditions.push('DATE(c.checkin_at) >= DATE(?)');
        params.push(data_inicio);
      }
      
      if (data_fim) {
        conditions.push('DATE(c.checkin_at) <= DATE(?)');
        params.push(data_fim);
      }
      
      whereClause += conditions.join(' AND ');
    }

    const horarios = db.prepare(`
      SELECT 
        strftime('%H', c.checkin_at) as hora,
        COUNT(*) as total_checkins
      FROM checkins c
      ${whereClause}
      GROUP BY strftime('%H', c.checkin_at)
      ORDER BY hora
    `).all(...params);

    res.json(horarios);
  } catch (error) {
    console.error('Erro ao gerar relatório por horário:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório por horário' });
  }
});

// Exportar dados para CSV
router.get('/export/csv', (req, res) => {
  try {
    const { tipo = 'checkins', data_inicio, data_fim } = req.query;
    
    let query = '';
    let filename = '';
    const params = [];
    
    switch (tipo) {
      case 'checkins':
        query = `
          SELECT 
            c.id,
            p.nome,
            p.documento,
            p.setor,
            e.nome as empresa,
            c.pulseira,
            datetime(c.checkin_at, 'localtime') as checkin_at
          FROM checkins c
          JOIN pessoas p ON c.pessoa_id = p.id
          JOIN empresas e ON p.empresa_id = e.id
        `;
        filename = 'checkins.csv';
        break;
        
      case 'pessoas':
        query = `
          SELECT 
            p.id,
            p.nome,
            p.documento,
            p.setor,
            e.nome as empresa,
            CASE WHEN c.id IS NOT NULL THEN 'Sim' ELSE 'Não' END as checkin_realizado,
            c.pulseira,
            datetime(c.checkin_at, 'localtime') as checkin_at
          FROM pessoas p
          JOIN empresas e ON p.empresa_id = e.id
          LEFT JOIN checkins c ON p.id = c.pessoa_id
        `;
        filename = 'pessoas.csv';
        break;
        
      default:
        return res.status(400).json({ error: 'Tipo de export inválido' });
    }
    
    if (data_inicio || data_fim) {
      query += ' WHERE ';
      const conditions = [];
      
      if (data_inicio) {
        conditions.push('DATE(c.checkin_at) >= DATE(?)');
        params.push(data_inicio);
      }
      
      if (data_fim) {
        conditions.push('DATE(c.checkin_at) <= DATE(?)');
        params.push(data_fim);
      }
      
      query += conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.nome';
    
    const dados = db.prepare(query).all(...params);
    
    if (dados.length === 0) {
      return res.status(404).json({ error: 'Nenhum dado encontrado' });
    }
    
    // Converter para CSV
    const headers = Object.keys(dados[0]);
    let csv = headers.join(',') + '\n';
    
    dados.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return value !== null && value !== undefined ? `"${value}"` : '""';
      });
      csv += values.join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

module.exports = router;

