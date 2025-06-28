import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { read, utils } from 'xlsx';
import { createWorker } from 'tesseract.js';
import { query } from '../database/postgres';

const router = express.Router();

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

    const data = new Uint8Array(fs.readFileSync(req.file.path));
    const workbook = read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'Planilha está vazia' });
    }

    const requiredFields = ['nome', 'documento', 'empresa'];
    const firstRow = jsonData[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
        required: requiredFields,
        found: Object.keys(firstRow)
      });
    }

    const errors = [];
    const empresas = new Set();
    const documentos = new Set();

    jsonData.forEach((row, index) => {
      const rowNum = index + 2;

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

    fs.unlinkSync(req.file.path);

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Erros encontrados na validação',
        errors: errors.slice(0, 10),
        total_errors: errors.length
      });
    }

    res.json({
      message: 'Arquivo válido',
      total_registros: jsonData.length,
      empresas_encontradas: Array.from(empresas),
      preview: jsonData.slice(0, 5)
    });

  } catch (error) {
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

    const data = new Uint8Array(fs.readFileSync(req.file.path));
    const workbook = read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = utils.sheet_to_json(worksheet);

    let empresasCriadas = 0;
    let pessoasCriadas = 0;
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2;

      try {
        let empresaResult = await query(`
          SELECT id FROM empresas WHERE nome = $1
        `, [row.empresa.trim()]);

        let empresaId;
        if (empresaResult.rows.length === 0) {
          const novaEmpresaResult = await query(`
            INSERT INTO empresas (nome) VALUES ($1) RETURNING id
          `, [row.empresa.trim()]);
          empresaId = novaEmpresaResult.rows[0].id;
          empresasCriadas++;
        } else {
          empresaId = empresaResult.rows[0].id;
        }

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
        if (error.code === '23505') {
          errors.push(`Linha ${rowNum}: Documento ${row.documento} já existe`);
        } else {
          errors.push(`Linha ${rowNum}: ${error.message}`);
        }
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Importação concluída',
      empresas_criadas: empresasCriadas,
      pessoas_criadas: pessoasCriadas,
      total_processados: jsonData.length,
      errors: errors
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro ao importar Excel:', error);
    res.status(500).json({ error: 'Erro ao importar arquivo Excel' });
  }
});

// Funções de validação para documentos brasileiros
const validarCPF = (cpf) => {
  cpf = cpf.replace(/\D/g, '');
  
  if (cpf.length !== 11) return null;
  if (/^(\d)\1{10}$/.test(cpf)) return null;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return null;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return null;
  
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const validarRG = (rg) => {
  rg = rg.replace(/\D/g, '');
  if (rg.length < 8 || rg.length > 10) return null;
  return rg.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
};

const validarCNH = (cnh) => {
  cnh = cnh.replace(/\D/g, '');
  if (cnh.length !== 11) return null;
  return cnh.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// OCR de documento para documentos brasileiros
router.post('/ocr', upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    console.log('Processando OCR para:', req.file.filename);

    const worker = await createWorker({
      logger: m => console.log(m),
      errorHandler: err => console.error(err)
    });

    try {
      await worker.loadLanguage('por');
      await worker.initialize('por');
      
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        tessedit_ocr_engine_mode: '1',
        preserve_interword_spaces: '1',
      });

      const { data: { text } } = await worker.recognize(req.file.path);

      const patterns = {
        nome: /(nome|name|nome completo)[\s:]*([A-ZÀ-Ÿ][A-zÀ-ÿ']+\s[A-zÀ-ÿ'\s]+)/gi,
        cpf: /(\d{3}[.-]?\d{3}[.-]?\d{3}[.-]?\d{2})/g,
        rg: /(\d{1,2}\.?\d{3}\.?\d{3}-?[0-9X])/g,
        cnh: /(cnh|registro)[\s:]*(\d{11})/gi,
        dataNascimento: /(nascimento|nasc\.|data de nascimento)[\s:]*(\d{2}[./]\d{2}[./]\d{4})/gi,
        nomeMae: /(filia..o|mãe|nome da mãe)[\s:]*([A-ZÀ-Ÿ][A-zÀ-ÿ']+\s[A-zÀ-ÿ'\s]+)/gi
      };

      const extractedData = {};
      
      for (const [key, regex] of Object.entries(patterns)) {
        const matches = [];
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          if (match[2]) {
            matches.push(match[2].trim());
          } else if (match[1]) {
            matches.push(match[1].trim());
          }
        }
        
        extractedData[key] = [...new Set(matches)];
      }

      const documentos = {
        cpf: extractedData.cpf ? extractedData.cpf.map(cpf => validarCPF(cpf)).filter(Boolean) : [],
        rg: extractedData.rg ? extractedData.rg.map(rg => validarRG(rg)).filter(Boolean) : [],
        cnh: extractedData.cnh ? extractedData.cnh.map(cnh => validarCNH(cnh)).filter(Boolean) : []
      };

      let documentoPrincipal = null;
      let tipoDocumento = null;
      
      if (documentos.cpf.length > 0) {
        documentoPrincipal = documentos.cpf[0];
        tipoDocumento = 'CPF';
      } else if (documentos.cnh.length > 0) {
        documentoPrincipal = documentos.cnh[0];
        tipoDocumento = 'CNH';
      } else if (documentos.rg.length > 0) {
        documentoPrincipal = documentos.rg[0];
        tipoDocumento = 'RG';
      }

      fs.unlinkSync(req.file.path);

      res.json({
        texto_completo: text,
        dados_extraidos: {
          nome: extractedData.nome?.[0] || null,
          documento: documentoPrincipal,
          tipo_documento: tipoDocumento,
          data_nascimento: extractedData.dataNascimento?.[0] || null,
          nome_mae: extractedData.nomeMae?.[0] || null,
          cpf: documentos.cpf,
          rg: documentos.rg,
          cnh: documentos.cnh
        }
      });

    } finally {
      await worker.terminate();
    }

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro no OCR:', error);
    res.status(500).json({ error: 'Erro ao processar OCR do documento' });
  }
});

// Template de importação
router.get('/template', async (req, res) => {
  try {
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

    const wb = utils.book_new();
    const ws = utils.json_to_sheet(templateData);
    utils.book_append_sheet(wb, ws, 'Pessoas');

    const buffer = utils.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Disposition', 'attachment; filename="template-importacao.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    res.status(500).json({ error: 'Erro ao gerar template' });
  }
});

export default router;
