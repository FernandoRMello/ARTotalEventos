import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import axios from '../lib/axios';

export default function Importar() {
  const [arquivo, setArquivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validacao, setValidacao] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setArquivo(file);
        setValidacao(null);
        setResultado(null);
        setError('');
      } else {
        setError('Por favor, selecione apenas arquivos Excel (.xlsx ou .xls)');
      }
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setArquivo(file);
      setValidacao(null);
      setResultado(null);
      setError('');
    }
  };

  const validarArquivo = async () => {
    if (!arquivo) {
      setError('Selecione um arquivo Excel');
      return;
    }

    setLoading(true);
    setError('');
    setValidacao(null);

    const formData = new FormData();
    formData.append('excel', arquivo);

    try {
      const response = await axios.post('/api/upload/excel/validar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setValidacao(response.data.validacao);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao validar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const importarArquivo = async () => {
    if (!arquivo) {
      setError('Selecione um arquivo Excel');
      return;
    }

    setLoading(true);
    setError('');
    setResultado(null);

    const formData = new FormData();
    formData.append('excel', arquivo);

    try {
      const response = await axios.post('/api/upload/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResultado(response.data.resultados);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao importar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setArquivo(null);
    setValidacao(null);
    setResultado(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Criar um template Excel simples
    const csvContent = "nome,documento,setor,empresa\nJoão Silva,12345678901,TI,Empresa A\nMaria Santos,98765432100,RH,Empresa B";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_importacao.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Upload className="h-8 w-8 text-blue-600" />
          Importar Dados do Excel
        </h1>
        <p className="text-gray-600">
          Importe planilhas Excel com dados de pessoas e empresas para o sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload do Arquivo</CardTitle>
            <CardDescription>
              Selecione um arquivo Excel (.xlsx) com os dados para importação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Clique para selecionar ou arraste o arquivo aqui
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  variant="outline" 
                  onClick={handleButtonClick}
                  type="button"
                >
                  Selecionar Arquivo
                </Button>
              </div>
            </div>

            {arquivo && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Arquivo selecionado:</strong> {arquivo.name}
                </p>
                <p className="text-sm text-blue-600">
                  Tamanho: {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={validarArquivo} 
                disabled={loading || !arquivo}
                variant="outline"
                className="flex-1"
              >
                {loading ? 'Validando...' : 'Validar'}
              </Button>
              <Button 
                onClick={importarArquivo} 
                disabled={loading || !arquivo}
                className="flex-1"
              >
                {loading ? 'Importando...' : 'Importar'}
              </Button>
            </div>

            <Button 
              variant="ghost" 
              onClick={limparFormulario}
              className="w-full"
            >
              Limpar
            </Button>
          </CardContent>
        </Card>

        {/* Instruções e Template */}
        <Card>
          <CardHeader>
            <CardTitle>Instruções</CardTitle>
            <CardDescription>
              Formato necessário para a planilha Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Colunas Obrigatórias:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>nome:</strong> Nome completo da pessoa</li>
                <li>• <strong>documento:</strong> CPF ou RG (apenas números)</li>
                <li>• <strong>empresa:</strong> Nome da empresa</li>
                <li>• <strong>setor:</strong> Setor da pessoa (opcional)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Observações:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Empresas são criadas automaticamente</li>
                <li>• Documentos duplicados são ignorados</li>
                <li>• Primeira linha deve conter os cabeçalhos</li>
                <li>• Formato aceito: .xlsx ou .xls</li>
              </ul>
            </div>

            <Button 
              onClick={downloadTemplate}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultados da Validação */}
      {validacao && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resultado da Validação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{validacao.total_linhas}</p>
                <p className="text-sm text-gray-600">Total de Linhas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{validacao.linhas_validas}</p>
                <p className="text-sm text-gray-600">Linhas Válidas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{validacao.linhas_invalidas}</p>
                <p className="text-sm text-gray-600">Linhas Inválidas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{validacao.colunas_encontradas.length}</p>
                <p className="text-sm text-gray-600">Colunas</p>
              </div>
            </div>

            {validacao.erros.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-red-600">Erros Encontrados:</h4>
                <div className="max-h-40 overflow-y-auto">
                  {validacao.erros.slice(0, 10).map((erro, index) => (
                    <p key={index} className="text-sm text-red-600">
                      Linha {erro.linha}: {erro.erro}
                    </p>
                  ))}
                  {validacao.erros.length > 10 && (
                    <p className="text-sm text-gray-500 mt-2">
                      ... e mais {validacao.erros.length - 10} erros
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultados da Importação */}
      {resultado && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Importação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{resultado.total_linhas}</p>
                <p className="text-sm text-gray-600">Total Processadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{resultado.pessoas_criadas}</p>
                <p className="text-sm text-gray-600">Pessoas Criadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{resultado.empresas_criadas}</p>
                <p className="text-sm text-gray-600">Empresas Criadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{resultado.pessoas_duplicadas}</p>
                <p className="text-sm text-gray-600">Duplicadas</p>
              </div>
            </div>

            {resultado.erros.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{resultado.erros.length} erros encontrados:</strong>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {resultado.erros.slice(0, 5).map((erro, index) => (
                      <p key={index} className="text-sm">
                        Linha {erro.linha}: {erro.erro}
                      </p>
                    ))}
                    {resultado.erros.length > 5 && (
                      <p className="text-sm mt-1">
                        ... e mais {resultado.erros.length - 5} erros
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensagens de erro */}
      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

