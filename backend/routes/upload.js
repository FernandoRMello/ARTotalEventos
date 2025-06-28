import express from 'express';
const router = express.Router();
import XLSX from 'xlsx';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { query } from '../database/postgres';

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

// Funções de validação para documentos brasileiros
const validarCPF = (cpf) => {
  cpf = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return null;
  
  // Verifica se todos os dígitos são iguais (inválido)
  if (/^(\d)\1{10}$/.test(cpf)) return null;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return null;
  
  // Validação do segundo dígito verificador
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
  
  // Verifica se tem entre 8 e 10 dígitos (padrão brasileiro)
  if (rg.length < 8 || rg.length > 10) return null;
  
  // Formata RG (XX.XXX.XXX-X)
  return rg.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
};

const validarCNH = (cnh) => {
  cnh = cnh.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
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

    // Criar worker do Tesseract
    const worker = await createWorker({
      logger: m => console.log(m),
      errorHandler: err => console.error(err)
    });

    try {
      // Inicializar com português
      await worker.loadLanguage('por');
      await worker.initialize('por');
      
      // Configurar parâmetros para documentos
      await worker.setParameters({
        tessedit_pageseg_mode: '6', // Orientação automática e segmentação
        tessedit_ocr_engine_mode: '1', // LSTM apenas
        preserve_interword_spaces: '1',
      });

      // Processar OCR
      const { data: { text } } = await worker.recognize(req.file.path);

      // Padrões regex para documentos brasileiros
      const patterns = {
        nome: /(nome|name|nome completo)[\s:]*([A-ZÀ-Ÿ][A-zÀ-ÿ']+\s[A-zÀ-ÿ'\s]+)/gi,
        cpf: /(\d{3}[.-]?\d{3}[.-]?\d{3}[.-]?\d{2})/g,
        rg: /(\d{1,2}\.?\d{3}\.?\d{3}-?[0-9X])/g,
        cnh: /(cnh|registro)[\s:]*(\d{11})/gi,
        dataNascimento: /(nascimento|nasc\.|data de nascimento)[\s:]*(\d{2}[./]\d{2}[./]\d{4})/gi,
        nomeMae: /(filia..o|mãe|nome da mãe)[\s:]*([A-ZÀ-Ÿ][A-zÀ-ÿ']+\s[A-zÀ-ÿ'\s]+)/gi
      };

      // Extrair informações
      const extractedData = {};
      
      for (const [key, regex] of Object.entries(patterns)) {
        const matches = [];
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          // O segundo grupo de captura geralmente contém o valor
          if (match[2]) {
            matches.push(match[2].trim());
          } else if (match[1]) {
            matches.push(match[1].trim());
          }
        }
        
        // Manter apenas valores únicos
        extractedData[key] = [...new Set(matches)];
      }

      // Validar e formatar documentos
      const documentos = {
        cpf: extractedData.cpf ? extractedData.cpf.map(cpf => validarCPF(cpf)).filter(Boolean) : [],
        rg: extractedData.rg ? extractedData.rg.map(rg => validarRG(rg)).filter(Boolean) : [],
        cnh: extractedData.cnh ? extractedData.cnh.map(cnh => validarCNH(cnh)).filter(Boolean) : []
      };

      // Determinar o documento principal
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

      // Limpar arquivo temporário
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
      await worker.terminate(); // Terminar worker sempre
    }

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

export default router;
