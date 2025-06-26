import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCheck, AlertCircle, CheckCircle, User, Building, Hash } from 'lucide-react';
import axios from '../lib/axios';

export default function Checkin() {
  const [documento, setDocumento] = useState('');
  const [pulseira, setPulseira] = useState('');
  const [pessoa, setPessoa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const buscarPessoa = async () => {
    if (!documento.trim()) {
      setError('Digite o documento para buscar');
      return;
    }

    setLoading(true);
    setError('');
    setPessoa(null);

    try {
      const response = await axios.get(`/api/pessoas/documento/${documento.trim()}`);
      setPessoa(response.data);
      
      if (response.data.checkin_realizado) {
        setError('Esta pessoa já realizou check-in');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Pessoa não encontrada. Verifique o documento digitado.');
      } else {
        setError('Erro ao buscar pessoa. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const realizarCheckin = async () => {
    if (!pessoa || !pulseira.trim()) {
      setError('Preencha o número da pulseira');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/checkins', {
        documento: documento.trim(),
        pulseira: pulseira.trim()
      });

      setSuccess(`Check-in realizado com sucesso! ${response.data.posicao_grupo}`);
      setPessoa({ ...pessoa, checkin_realizado: true, pulseira: pulseira.trim() });
      
      // Limpar formulário após alguns segundos
      setTimeout(() => {
        setDocumento('');
        setPulseira('');
        setPessoa(null);
        setSuccess('');
      }, 3000);
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao realizar check-in. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setDocumento('');
    setPulseira('');
    setPessoa(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <UserCheck className="h-8 w-8 text-blue-600" />
          Check-in de Participantes
        </h1>
        <p className="text-gray-600">
          Digite o documento para buscar a pessoa e realizar o check-in
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Participante</CardTitle>
          <CardDescription>
            Informe o CPF ou RG para buscar os dados cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Busca por documento */}
          <div className="space-y-2">
            <Label htmlFor="documento">Documento (CPF/RG)</Label>
            <div className="flex gap-2">
              <Input
                id="documento"
                placeholder="Digite o CPF ou RG"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && buscarPessoa()}
                className="flex-1"
              />
              <Button 
                onClick={buscarPessoa} 
                disabled={loading || !documento.trim()}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>

          {/* Dados da pessoa encontrada */}
          {pessoa && !pessoa.checkin_realizado && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="font-semibold">{pessoa.nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Empresa</p>
                      <p className="font-semibold">{pessoa.empresa_nome}</p>
                    </div>
                  </div>
                  {pessoa.setor && (
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Setor</p>
                        <p className="font-semibold">{pessoa.setor}</p>
                      </div>
                    </div>
                  )}
                  {pessoa.posicao_grupo && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Posição no Grupo</p>
                        <p className="font-semibold">{pessoa.posicao_grupo}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pessoa já fez check-in */}
          {pessoa && pessoa.checkin_realizado && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>{pessoa.nome}</strong> já realizou check-in com a pulseira <strong>{pessoa.pulseira}</strong>
                {pessoa.checkin_at && (
                  <span> em {new Date(pessoa.checkin_at).toLocaleString('pt-BR')}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Campo da pulseira */}
          {pessoa && !pessoa.checkin_realizado && (
            <div className="space-y-2">
              <Label htmlFor="pulseira">Número da Pulseira</Label>
              <Input
                id="pulseira"
                placeholder="Digite o número da pulseira"
                value={pulseira}
                onChange={(e) => setPulseira(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && realizarCheckin()}
              />
            </div>
          )}

          {/* Mensagens de erro e sucesso */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Botões de ação */}
          <div className="flex gap-4">
            {pessoa && !pessoa.checkin_realizado && (
              <Button 
                onClick={realizarCheckin} 
                disabled={loading || !pulseira.trim()}
                className="flex-1"
              >
                {loading ? 'Realizando...' : 'Confirmar Check-in'}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={limparFormulario}
              className="flex-1"
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Para realizar check-in, a pessoa deve estar previamente cadastrada no sistema.
        </p>
      </div>
    </div>
  );
}

