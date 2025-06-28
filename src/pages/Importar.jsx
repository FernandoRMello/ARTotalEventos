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
  const [progresso, setProgresso] = useState(0);
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
    setProgresso(0);

    const formData = new FormData();
    formData.append('excel', arquivo);

    try {
      const response = await axios.post('/upload/excel/validar', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgresso(percentCompleted);
        }
      });

      setValidacao(response.data);
    } catch (err) {
      console.error('Erro na validação:', err);
      
      let mensagemErro = 'Erro ao validar arquivo';
      if (err.code === 'NETWORK_ERROR') {
        mensagemErro = 'Falha na conexão. Verifique sua internet.';
      } else if (err.code === 'TIMEOUT') {
        mensagemErro = 'Tempo limite excedido. Tente novamente.';
      } else if (err.response?.data?.error) {
        mensagemErro = err.response.data.error;
      } else if (err.response?.data?.errors) {
        mensagemErro = `Erros encontrados: ${err.response.data.errors.join(', ')}`;
      }
      
      setError(mensagemErro);
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
    setProgresso(0);

    const formData = new FormData();
    formData.append('excel', arquivo);

    try {
      const response = await axios.post('/upload/excel', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgresso(percentCompleted);
        }
      });

      setResultado(response.data);
    } catch (err) {
      console.error('Erro na importação:', err);
      
      let mensagemErro = 'Erro ao importar arquivo';
      if (err.code === 'NETWORK_ERROR') {
        mensagemErro = 'Falha na conexão. Verifique sua internet.';
      } else if (err.code === 'TIMEOUT') {
        mensagemErro = 'Tempo limite excedido. Tente novamente.';
      } else if (err.response?.data?.error) {
        mensagemErro = err.response.data.error;
      } else if (err.response?.data?.errors) {
        mensagemErro = `Erros durante importação: ${err.response.data.errors.join(', ')}`;
      }
      
      setError(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setArquivo(null);
    setValidacao(null);
    setResultado(null);
    setError('');
    setProgresso(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get('/upload/template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_importacao.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Erro ao baixar template:', err);
      setError('Erro ao baixar o template. Tente novamente.');
    }
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

            {progresso > 0 && (
              <div className="space-y-2">
                <Progress value={progresso} className="h-2" />
                <p className="text-xs text-gray-500 text-center">
                  {progresso}% enviado
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
                disabled={loading || !arquivo || (validacao?.total_errors > 0)}
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
                <li>• Tamanho máximo: 10MB</li>
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
            <CardDescription>
              {validacao.total_errors === 0 
                ? 'Arquivo válido e pronto para importação' 
                : 'Corrija os erros antes de importar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{validacao.total_registros}</p>
                <p className="text-sm text-gray-600">Total de Registros</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{validacao.total_registros - validacao.total_errors}</p>
                <p className="text-sm text-gray-600">Registros Válidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{validacao.total_errors}</p>
                <p className="text-sm text-gray-600">Erros</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{validacao.empresas_encontradas?.length || 0}</p>
                <p className="text-sm text-gray-600">Empresas</p>
              </div>
            </div>

            {validacao.errors?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-red-600">Erros Encontrados:</h4>
                <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded">
                  {validacao.errors.slice(0, 10).map((erro, index) => (
                    <p key={index} className="text-sm text-red-600 mb-1">
                      • {erro}
                    </p>
                  ))}
                  {validacao.errors.length > 10 && (
                    <p className="text-sm text-gray-500 mt-2">
                      ... e mais {validacao.errors.length - 10} erros
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
              {resultado.errors?.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {resultado.errors?.length > 0 ? 'Importação com Erros' : 'Importação Concluída'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{resultado.total_processados}</p>
                <p className="text-sm text-gray-600">Total Processados</p>
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
                <p className="text-2xl font-bold text-yellow-600">{resultado.errors?.length || 0}</p>
                <p className="text-sm text-gray-600">Erros</p>
              </div>
            </div>

            {resultado.errors?.length > 0 && (
              <Alert variant={resultado.errors.length > 0 ? "destructive" : "default"} className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong className="block mb-2">{resultado.errors.length} erros encontrados:</strong>
                  <div className="mt-2 max-h-48 overflow-y-auto bg-red-50 p-3 rounded">
                    {resultado.errors.slice(0, 10).map((erro, index) => (
                      <p key={index} className="text-sm mb-1">
                        • {erro}
                      </p>
                    ))}
                    {resultado.errors.length > 10 && (
                      <p className="text-sm mt-1 text-gray-700">
                        ... e mais {resultado.errors.length - 10} erros
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
