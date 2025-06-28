import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Building, Plus, Edit, Trash2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import axios from '../lib/axios';

export default function Configuracoes() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [nomeEmpresa, setNomeEmpresa] = useState('');

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get('/api/empresas');
      setEmpresas(response.data);
    } catch (err) {
      setError('Erro ao carregar empresas. Tente novamente.');
      console.error('Erro ao carregar empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogNova = () => {
    setEmpresaEditando(null);
    setNomeEmpresa('');
    setDialogAberto(true);
    setError('');
    setSuccess('');
  };

  const abrirDialogEditar = (empresa) => {
    setEmpresaEditando(empresa);
    setNomeEmpresa(empresa.nome);
    setDialogAberto(true);
    setError('');
    setSuccess('');
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setEmpresaEditando(null);
    setNomeEmpresa('');
    setError('');
    setSuccess('');
  };

  const salvarEmpresa = async () => {
    if (!nomeEmpresa.trim()) {
      setError('Nome da empresa é obrigatório');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (empresaEditando) {
        // Editar empresa existente
        await axios.put(`/api/empresas/${empresaEditando.id}`, {
          nome: nomeEmpresa.trim()
        });
        setSuccess('Empresa atualizada com sucesso!');
      } else {
        // Criar nova empresa
        await axios.post('/api/empresas', {
          nome: nomeEmpresa.trim()
        });
        setSuccess('Empresa criada com sucesso!');
      }

      await carregarEmpresas();
      fecharDialog();
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Já existe uma empresa com este nome');
      } else {
        setError(err.response?.data?.error || 'Erro ao salvar empresa');
      }
    } finally {
      setLoading(false);
    }
  };

  const excluirEmpresa = async (empresa) => {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${empresa.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.delete(`/api/empresas/${empresa.id}`);
      setSuccess('Empresa excluída com sucesso!');
      await carregarEmpresas();
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Não é possível excluir empresa com pessoas cadastradas');
      } else {
        setError(err.response?.data?.error || 'Erro ao excluir empresa');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Settings className="h-8 w-8 text-blue-600" />
          Configurações do Sistema
        </h1>
        <p className="text-gray-600">
          Gerencie empresas e configurações gerais do sistema
        </p>
      </div>

      {/* Estatísticas das Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Empresas</p>
                <p className="text-2xl font-bold text-blue-600">{empresas.length}</p>
              </div>
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Pessoas</p>
                <p className="text-2xl font-bold text-green-600">
                  {empresas.reduce((total, empresa) => total + empresa.total_pessoas, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Check-ins</p>
                <p className="text-2xl font-bold text-purple-600">
                  {empresas.reduce((total, empresa) => total + empresa.total_checkins, 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gerenciamento de Empresas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Gerenciar Empresas
              </CardTitle>
              <CardDescription>
                Adicione, edite ou remova empresas do sistema
              </CardDescription>
            </div>
            <Button onClick={abrirDialogNova}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {empresas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Empresa</TableHead>
                    <TableHead>Total de Pessoas</TableHead>
                    <TableHead>Check-ins Realizados</TableHead>
                    <TableHead>Taxa de Check-in</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa) => (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-medium">{empresa.nome}</TableCell>
                      <TableCell>{empresa.total_pessoas}</TableCell>
                      <TableCell>{empresa.total_checkins}</TableCell>
                      <TableCell>
                        {empresa.total_pessoas > 0 
                          ? `${Math.round((empresa.total_checkins / empresa.total_pessoas) * 100)}%`
                          : '0%'
                        }
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatarData(empresa.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirDialogEditar(empresa)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => excluirEmpresa(empresa)}
                            disabled={empresa.total_pessoas > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                {loading ? 'Carregando empresas...' : 'Nenhuma empresa cadastrada'}
              </p>
              {!loading && (
                <Button onClick={abrirDialogNova}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeira Empresa
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Criar/Editar Empresa */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {empresaEditando ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
            <DialogDescription>
              {empresaEditando 
                ? 'Altere o nome da empresa abaixo.'
                : 'Digite o nome da nova empresa.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome-empresa">Nome da Empresa</Label>
              <Input
                id="nome-empresa"
                placeholder="Digite o nome da empresa"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && salvarEmpresa()}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={fecharDialog}>
              Cancelar
            </Button>
            <Button onClick={salvarEmpresa} disabled={loading || !nomeEmpresa.trim()}>
              {loading ? 'Salvando...' : (empresaEditando ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mensagens de sucesso e erro */}
      {success && (
        <Alert className="mt-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && !dialogAberto && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Informações do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p><strong>Versão:</strong> 1.0.0</p>
            <p><strong>Desenvolvido para:</strong> AR Total Eventos</p>
          </div>
          <div>
            <p><strong>Banco de dados:</strong> SQLite</p>
            <p><strong>Tecnologias:</strong> React + Node.js</p>
          </div>
        </div>
      </div>
    </div>
  );
}

