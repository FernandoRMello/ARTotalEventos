import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Search, UserCheck, UserX, Building, Hash } from 'lucide-react';
import axios from '../lib/axios';

export default function Pessoas() {
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    search: '',
    empresa_id: '',
    setor: ''
  });

  useEffect(() => {
    carregarPessoas();
  }, []);

  const carregarPessoas = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filtros.search) params.append('search', filtros.search);
      if (filtros.empresa_id) params.append('empresa_id', filtros.empresa_id);
      if (filtros.setor) params.append('setor', filtros.setor);

      const response = await axios.get(`/pessoas?${params}`);
      setPessoas(response.data);
    } catch (err) {
      setError('Erro ao carregar pessoas. Tente novamente.');
      console.error('Erro ao carregar pessoas:', err);
    } finally {
      setLoading(false);
    }
  };

  const buscarPessoas = () => {
    carregarPessoas();
  };

  const limparFiltros = () => {
    setFiltros({ search: '', empresa_id: '', setor: '' });
    setTimeout(carregarPessoas, 100);
  };

  const formatarDocumento = (documento) => {
    if (documento.length === 11) {
      // CPF
      return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (documento.length >= 8) {
      // RG
      return documento.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
    }
    return documento;
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Users className="h-8 w-8 text-blue-600" />
          Gerenciar Pessoas
        </h1>
        <p className="text-gray-600">
          Visualize e gerencie todas as pessoas cadastradas no sistema
        </p>
      </div>

      {/* Filtros de Busca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>
            Use os filtros para encontrar pessoas específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Nome ou Documento</Label>
              <Input
                id="search"
                placeholder="Digite nome ou documento"
                value={filtros.search}
                onChange={(e) => setFiltros(prev => ({ ...prev, search: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && buscarPessoas()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
              <Input
                id="setor"
                placeholder="Digite o setor"
                value={filtros.setor}
                onChange={(e) => setFiltros(prev => ({ ...prev, setor: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && buscarPessoas()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={buscarPessoas} disabled={loading} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Pessoas</p>
                <p className="text-2xl font-bold text-blue-600">{pessoas.length}</p>
              </div>
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Com Check-in</p>
                <p className="text-2xl font-bold text-green-600">
                  {pessoas.filter(p => p.checkin_realizado).length}
                </p>
              </div>
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sem Check-in</p>
                <p className="text-2xl font-bold text-red-600">
                  {pessoas.filter(p => !p.checkin_realizado).length}
                </p>
              </div>
              <UserX className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Empresas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(pessoas.map(p => p.empresa_nome)).size}
                </p>
              </div>
              <Building className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Pessoas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pessoas</CardTitle>
          <CardDescription>
            {pessoas.length} pessoa(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pessoas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pulseira</TableHead>
                    <TableHead>Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pessoas.map((pessoa) => (
                    <TableRow key={pessoa.id}>
                      <TableCell className="font-medium">{pessoa.nome}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatarDocumento(pessoa.documento)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          {pessoa.empresa_nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pessoa.setor ? (
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            {pessoa.setor}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pessoa.checkin_realizado ? (
                          <Badge variant="success" className="bg-green-100 text-green-800">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Check-in OK
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                            <UserX className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {pessoa.pulseira ? (
                          <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {pessoa.pulseira}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pessoa.checkin_at ? (
                          <span className="text-sm text-gray-600">
                            {formatarData(pessoa.checkin_at)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">
                {loading ? 'Carregando pessoas...' : 'Nenhuma pessoa encontrada'}
              </p>
              {!loading && filtros.search && (
                <p className="text-sm text-gray-500 mt-2">
                  Tente ajustar os filtros de busca
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensagens de erro */}
      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Para adicionar novas pessoas, use a função de Importar Excel ou Cadastro Manual.
        </p>
      </div>
    </div>
  );
}

