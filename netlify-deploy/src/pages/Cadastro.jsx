import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, User, Building, Hash, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import axios from '../lib/axios';

export default function Cadastro() {
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    setor: '',
    empresa_id: ''
  });
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagemDocumento, setImagemDocumento] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    try {
      const response = await axios.get('/api/empresas');
      setEmpresas(response.data);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImagemDocumento(file);
      processarOCR(file);
    }
  };

  const processarOCR = async (file) => {
    setOcrLoading(true);
    setError('');

    const formDataOCR = new FormData();
    formDataOCR.append('documento', file);

    try {
      const response = await axios.post('/api/upload/ocr', formDataOCR, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { nome, cpf, rg } = response.data;
      
      if (nome) {
        setFormData(prev => ({ ...prev, nome }));
      }
      if (cpf) {
        setFormData(prev => ({ ...prev, documento: cpf }));
      } else if (rg) {
        setFormData(prev => ({ ...prev, documento: rg }));
      }

      if (nome || cpf || rg) {
        setSuccess('Dados extraídos do documento com sucesso! Verifique e complete as informações.');
      } else {
        setError('Não foi possível extrair dados do documento. Preencha manualmente.');
      }
    } catch (err) {
      setError('Erro ao processar imagem do documento. Tente novamente ou preencha manualmente.');
    } finally {
      setOcrLoading(false);
    }
  };

  const criarEmpresa = async (nomeEmpresa) => {
    try {
      const response = await axios.post('/api/empresas', {
        nome: nomeEmpresa
      });
      return response.data.id;
    } catch (err) {
      throw new Error('Erro ao criar empresa');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome.trim() || !formData.documento.trim()) {
      setError('Nome e documento são obrigatórios');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let empresaId = formData.empresa_id;

      // Se não selecionou empresa existente, criar nova
      if (!empresaId && formData.nova_empresa?.trim()) {
        empresaId = await criarEmpresa(formData.nova_empresa.trim());
        await carregarEmpresas(); // Recarregar lista de empresas
      }

      if (!empresaId) {
        setError('Selecione uma empresa ou digite o nome de uma nova');
        return;
      }

      const response = await axios.post('/api/pessoas', {
        nome: formData.nome.trim(),
        documento: formData.documento.trim(),
        setor: formData.setor.trim() || null,
        empresa_id: empresaId
      });

      setSuccess(`Pessoa cadastrada com sucesso: ${response.data.nome}`);
      
      // Limpar formulário
      setFormData({
        nome: '',
        documento: '',
        setor: '',
        empresa_id: ''
      });
      setImagemDocumento(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Documento já cadastrado no sistema');
      } else {
        setError(err.response?.data?.error || 'Erro ao cadastrar pessoa');
      }
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setFormData({
      nome: '',
      documento: '',
      setor: '',
      empresa_id: ''
    });
    setImagemDocumento(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <User className="h-8 w-8 text-blue-600" />
          Cadastro Manual de Pessoas
        </h1>
        <p className="text-gray-600">
          Cadastre pessoas individualmente com extração automática de dados via OCR
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OCR de Documento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              OCR de Documento (Opcional)
            </CardTitle>
            <CardDescription>
              Faça upload de uma foto do documento para extrair dados automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {imagemDocumento ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-12 w-12 text-green-500" />
                  <p className="text-sm text-green-600">
                    Imagem carregada: {imagemDocumento.name}
                  </p>
                  {ocrLoading && (
                    <p className="text-sm text-blue-600">
                      Processando OCR...
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Clique para selecionar uma imagem do documento
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button 
                  variant="outline" 
                  className="mt-2 cursor-pointer"
                  disabled={ocrLoading}
                >
                  {ocrLoading ? 'Processando...' : 'Selecionar Imagem'}
                </Button>
              </label>
            </div>

            <div className="text-sm text-gray-500">
              <p><strong>Dica:</strong> Para melhores resultados:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Use boa iluminação</li>
                <li>Mantenha o documento reto</li>
                <li>Evite reflexos e sombras</li>
                <li>Certifique-se de que o texto está legível</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Formulário Manual */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Pessoa</CardTitle>
            <CardDescription>
              Preencha os dados manualmente ou complete após o OCR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome completo"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documento">Documento (CPF/RG) *</Label>
                <Input
                  id="documento"
                  placeholder="Digite o CPF ou RG"
                  value={formData.documento}
                  onChange={(e) => handleInputChange('documento', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setor">Setor</Label>
                <Input
                  id="setor"
                  placeholder="Digite o setor (opcional)"
                  value={formData.setor}
                  onChange={(e) => handleInputChange('setor', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa *</Label>
                <Select 
                  value={formData.empresa_id} 
                  onValueChange={(value) => handleInputChange('empresa_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id.toString()}>
                        {empresa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nova_empresa">Ou criar nova empresa</Label>
                <Input
                  id="nova_empresa"
                  placeholder="Digite o nome da nova empresa"
                  value={formData.nova_empresa || ''}
                  onChange={(e) => handleInputChange('nova_empresa', e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Cadastrando...' : 'Cadastrar Pessoa'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={limparFormulario}
                  className="flex-1"
                >
                  Limpar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Mensagens de erro e sucesso */}
      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mt-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          * Campos obrigatórios. Após o cadastro, a pessoa estará disponível para check-in.
        </p>
      </div>
    </div>
  );
}

