import express from 'express';
const router = express.Router();
const XLSX = require('xlsx');
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Tesseract from 'tesseract';
import {  query  } from '../database/postgres';

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'excel') {
      // Aceitar arquivos Excel
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream'
      ];
      const allowedExts = ['.xlsx', '.xls'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos Excel (.xlsx, .xls) são permitidos'));
      }
    } else if (file.fieldname === 'documento') {
      // Aceitar imagens para OCR
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Apenas imagens (JPEG, PNG, GIF) são permitidas'));
      }
    } else {
      cb(new Error('Campo de arquivo não reconhecido'));
    }
  }
});

// Validar arquivo Excel
router.post('/excel/validar', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Validar estrutura
    if (data.length === 0) {
      return res.status(400).json({ error: 'Planilha está vazia' });
    }

    const requiredFields = ['nome', 'documento', 'empresa'];
    const firstRow = data[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
        required: requiredFields,
        found: Object.keys(firstRow)
      });
    }

    // Validar dados
    const errors = [];
    const empresas = new Set();
    const documentos = new Set();

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 porque começa do 1 e pula o cabeçalho

      if (!row.nome || row.nome.trim() === '') {
        errors.push(`Linha ${rowNum}: Nome é obrigatório`);
      }

      if (!row.documento || row.documento.toString().trim() === '') {
        errors.push(`Linha ${rowNum}: Documento é obrigatório`);
      } else {
        const doc = row.documento.toString().trim();
        if (documentos.has(doc)) {
          errors.push(`Linha ${rowNum}: Documento ${doc} duplicado na planilha`);
        }
        documentos.add(doc);
      }

      if (!row.empresa || row.empresa.trim() === '') {
        errors.push(`Linha ${rowNum}: Empresa é obrigatória`);
      } else {
        empresas.add(row.empresa.trim());
      }
    });

    // Verificar documentos já existentes no banco
    if (documentos.size > 0) {
      const docsArray = Array.from(documentos);
      const placeholders = docsArray.map((_, i) => `$${i + 1}`).join(',');
      
      const existingDocsResult = await query(`
        SELECT documento FROM pessoas WHERE documento IN (${placeholders})
      `, docsArray);

      existingDocsResult.rows.forEach(row => {
        errors.push(`Documento ${row.documento} já existe no sistema`);
      });
    }

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Erros encontrados na validação',
        errors: errors.slice(0, 10), // Limitar a 10 erros
        total_errors: errors.length
      });
    }

    res.json({
      message: 'Arquivo válido',
      total_registros: data.length,
      empresas_encontradas: Array.from(empresas),
      preview: data.slice(0, 5) // Mostrar apenas os primeiros 5 registros
    });

  } catch (error) {
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro ao validar Excel:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo Excel' });
  }
});

// Importar arquivo Excel
router.post('/excel', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let empresasCriadas = 0;
    let pessoasCriadas = 0;
    const errors = [];

    // Processar cada linha
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      try {
        // Verificar/criar empresa
        let empresaResult = await query(`
          SELECT id FROM empresas WHERE nome = $1
        `, [row.empresa.trim()]);

        let empresaId;
        if (empresaResult.rows.length === 0) {
          // Criar nova empresa
          const novaEmpresaResult = await query(`
            INSERT INTO empresas (nome) VALUES ($1) RETURNING id
          `, [row.empresa.trim()]);
          empresaId = novaEmpresaResult.rows[0].id;
          empresasCriadas++;
        } else {
          empresaId = empresaResult.rows[0].id;
        }

        // Criar pessoa
        await query(`
          INSERT INTO pessoas (nome, documento, setor, empresa_id) 
          VALUES ($1, $2, $3, $4)
        `, [
          row.nome.trim(),
          row.documento.toString().trim(),
          row.setor ? row.setor.trim() : null,
          empresaId
        ]);
        pessoasCriadas++;

      } catch (error) {
        console.error(`Erro na linha ${rowNum}:`, error);
        if (error.code === '23505') { // Unique violation
          errors.push(`Linha ${rowNum}: Documento ${row.documento} já existe`);
        } else {
          errors.push(`Linha ${rowNum}: ${error.message}`);
        }
      }
    }

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Importação concluída',
      empresas_criadas: empresasCriadas,
      pessoas_criadas: pessoasCriadas,
      total_processados: data.length,
      errors: errors
    });

  } catch (error) {
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro ao importar Excel:', error);
    res.status(500).json({ error: 'Erro ao importar arquivo Excel' });
  }
});

// OCR de documento
router.post('/ocr', upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    console.log('Processando OCR para:', req.file.filename);

    // Processar OCR
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'por', {
      logger: m => console.log(m)
    });

    // Extrair informações básicas
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Tentar extrair nome (geralmente nas primeiras linhas)
    let nome = '';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 5 && /^[A-ZÁÊÇÕ\s]+$/.test(line)) {
        nome = line;
        break;
      }
    }

    // Tentar extrair CPF (padrão XXX.XXX.XXX-XX ou XXXXXXXXXXX)
    let cpf = '';
    const cpfRegex = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g;
    const cpfMatch = text.match(cpfRegex);
    if (cpfMatch) {
      cpf = cpfMatch[0].replace(/[^\d]/g, ''); // Remover pontuação
    }

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json({
      texto_completo: text,
      nome_extraido: nome,
      cpf_extraido: cpf,
      linhas_processadas: lines.length
    });

  } catch (error) {
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro no OCR:', error);
    res.status(500).json({ error: 'Erro ao processar OCR do documento' });
  }
});

router.get('/template', async (req, res) => {
  try {
    // Dados de exemplo
    const templateData = [
      {
        nome: 'Joao Silva Santos',
        documento: '12345678901',
        empresa: 'Empresa Exemplo Ltda',
        setor: 'Tecnologia'
      },
      {
        nome: 'Maria Oliveira Costa',
        documento: '98765432100',
        empresa: 'Outra Empresa S.A.',
        setor: 'Marketing'
      }
    ];

    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Pessoas');

    // Gerar buffer correto em formato XLSX
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Headers para download
    res.setHeader('Content-Disposition', 'attachment; filename="template-importacao.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Enviar arquivo
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    res.status(500).json({ error: 'Erro ao gerar template' });
  }
});

module.exports = router;

