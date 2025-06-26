const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const Tesseract = require('tesseract.js');
const router = express.Router();
const db = require('../database/init');

// Configurar multer para upload de arquivos
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
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'excel') {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream' // Adicionar para casos onde MIME type não é detectado
      ];
      const allowedExtensions = ['.xlsx', '.xls'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos Excel (.xlsx, .xls) são permitidos'));
      }
    } else if (file.fieldname === 'documento') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Apenas imagens (JPEG, PNG, GIF) são permitidas'));
      }
    } else {
      cb(new Error('Campo de arquivo inválido'));
    }
  }
});

// Importar dados do Excel
router.post('/excel', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo Excel é obrigatório' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      fs.unlinkSync(filePath); // Remover arquivo
      return res.status(400).json({ error: 'Planilha está vazia' });
    }

    const resultados = {
      total_linhas: data.length,
      empresas_criadas: 0,
      pessoas_criadas: 0,
      pessoas_duplicadas: 0,
      erros: []
    };

    // Processar cada linha
    for (let i = 0; i < data.length; i++) {
      const linha = data[i];
      const numeroLinha = i + 2; // +2 porque começa na linha 2 do Excel

      try {
        // Validar campos obrigatórios
        const nome = linha.nome || linha.Nome || linha.NOME;
        const documento = linha.documento || linha.Documento || linha.DOCUMENTO || 
                         linha.cpf || linha.CPF || linha.rg || linha.RG;
        const setor = linha.setor || linha.Setor || linha.SETOR;
        const empresa = linha.empresa || linha.Empresa || linha.EMPRESA;

        if (!nome || !documento || !empresa) {
          resultados.erros.push({
            linha: numeroLinha,
            erro: 'Campos obrigatórios: nome, documento, empresa'
          });
          continue;
        }

        // Criar ou buscar empresa
        let empresaId;
        const empresaExistente = db.prepare('SELECT id FROM empresas WHERE nome = ?').get(empresa.trim());
        
        if (empresaExistente) {
          empresaId = empresaExistente.id;
        } else {
          const stmtEmpresa = db.prepare('INSERT INTO empresas (nome) VALUES (?)');
          const resultEmpresa = stmtEmpresa.run(empresa.trim());
          empresaId = resultEmpresa.lastInsertRowid;
          resultados.empresas_criadas++;
        }

        // Criar pessoa
        const stmtPessoa = db.prepare(`
          INSERT INTO pessoas (nome, documento, setor, empresa_id) 
          VALUES (?, ?, ?, ?)
        `);
        
        stmtPessoa.run(
          nome.trim(),
          documento.toString().trim(),
          setor ? setor.trim() : null,
          empresaId
        );
        
        resultados.pessoas_criadas++;

      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          resultados.pessoas_duplicadas++;
          resultados.erros.push({
            linha: numeroLinha,
            erro: 'Documento já cadastrado'
          });
        } else {
          resultados.erros.push({
            linha: numeroLinha,
            erro: error.message
          });
        }
      }
    }

    // Remover arquivo após processamento
    fs.unlinkSync(filePath);

    res.json({
      message: 'Importação concluída',
      resultados
    });

  } catch (error) {
    // Remover arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro na importação Excel:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo Excel' });
  }
});

// OCR de documento
router.post('/ocr', upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Imagem do documento é obrigatória' });
    }

    const filePath = req.file.path;

    // Processar OCR
    const { data: { text } } = await Tesseract.recognize(filePath, 'por', {
      logger: m => console.log(m)
    });

    // Extrair informações do texto
    const resultado = {
      texto_completo: text,
      nome: null,
      cpf: null,
      rg: null
    };

    // Regex para CPF (xxx.xxx.xxx-xx ou xxxxxxxxxxx)
    const cpfRegex = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g;
    const cpfMatch = text.match(cpfRegex);
    if (cpfMatch) {
      resultado.cpf = cpfMatch[0].replace(/[^\d]/g, '');
    }

    // Regex para RG (xx.xxx.xxx-x ou xxxxxxxx)
    const rgRegex = /(\d{1,2}\.?\d{3}\.?\d{3}-?\d{1})/g;
    const rgMatch = text.match(rgRegex);
    if (rgMatch) {
      resultado.rg = rgMatch[0].replace(/[^\d]/g, '');
    }

    // Tentar extrair nome (linha mais longa que não seja número)
    const linhas = text.split('\n').map(linha => linha.trim()).filter(linha => linha.length > 0);
    for (const linha of linhas) {
      if (linha.length > 10 && !/^\d+$/.test(linha) && /^[A-Za-zÀ-ÿ\s]+$/.test(linha)) {
        resultado.nome = linha;
        break;
      }
    }

    // Remover arquivo após processamento
    fs.unlinkSync(filePath);

    res.json(resultado);

  } catch (error) {
    // Remover arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro no OCR:', error);
    res.status(500).json({ error: 'Erro ao processar imagem do documento' });
  }
});

// Validar planilha Excel antes da importação
router.post('/excel/validar', upload.single('excel'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo Excel é obrigatório' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Remover arquivo após leitura
    fs.unlinkSync(filePath);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Planilha está vazia' });
    }

    const validacao = {
      total_linhas: data.length,
      colunas_encontradas: Object.keys(data[0]),
      colunas_obrigatorias: ['nome', 'documento', 'empresa'],
      linhas_validas: 0,
      linhas_invalidas: 0,
      erros: []
    };

    // Verificar se tem as colunas obrigatórias (case insensitive)
    const colunasLower = validacao.colunas_encontradas.map(col => col.toLowerCase());
    const colunasObrigatorias = ['nome', 'documento', 'empresa'];
    const colunasFaltando = [];

    for (const coluna of colunasObrigatorias) {
      const variantes = [coluna, coluna.toUpperCase(), 
                        coluna === 'documento' ? 'cpf' : null,
                        coluna === 'documento' ? 'rg' : null].filter(Boolean);
      
      const encontrou = variantes.some(variante => 
        colunasLower.includes(variante.toLowerCase())
      );
      
      if (!encontrou) {
        colunasFaltando.push(coluna);
      }
    }

    if (colunasFaltando.length > 0) {
      return res.status(400).json({
        error: `Colunas obrigatórias não encontradas: ${colunasFaltando.join(', ')}`,
        validacao
      });
    }

    // Validar cada linha
    for (let i = 0; i < Math.min(data.length, 100); i++) { // Validar apenas primeiras 100 linhas
      const linha = data[i];
      const numeroLinha = i + 2;

      const nome = linha.nome || linha.Nome || linha.NOME;
      const documento = linha.documento || linha.Documento || linha.DOCUMENTO || 
                       linha.cpf || linha.CPF || linha.rg || linha.RG;
      const empresa = linha.empresa || linha.Empresa || linha.EMPRESA;

      if (!nome || !documento || !empresa) {
        validacao.linhas_invalidas++;
        validacao.erros.push({
          linha: numeroLinha,
          erro: 'Campos obrigatórios em branco'
        });
      } else {
        validacao.linhas_validas++;
      }
    }

    res.json({
      message: 'Validação concluída',
      validacao
    });

  } catch (error) {
    // Remover arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro na validação Excel:', error);
    res.status(500).json({ error: 'Erro ao validar arquivo Excel' });
  }
});

module.exports = router;

