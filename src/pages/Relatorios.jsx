import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, Users, Building, Clock, Download, RefreshCw } from 'lucide-react';
import axios from '../lib/axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Relatorios() {
  const [dadosGerais, setDadosGerais] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [detalhado, setDetalhado] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);

      const [gerais, empresasRes, setoresRes, horariosRes, detalhadoRes] = await Promise.all([
        axios.get(`/api/relatorios/geral?${params}`),
        axios.get(`/api/relatorios/empresas?${params}`),
        axios.get(`/api/relatorios/setores?${params}`),
        axios.get(`/api/relatorios/horarios?${params}`),
        axios.get(`/api/relatorios/detalhado?${params}`)
      ]);

      setDadosGerais(gerais.data);
      setEmpresas(empresasRes.data);
      setSetores(setoresRes.data);
      setHorarios(horariosRes.data);
      setDetalhado(detalhadoRes.data);
    } catch (err) {
      setError('Erro ao carregar relatórios. Tente novamente.');
      console.error('Erro ao carregar relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    carregarDados();
  };

  const limparFiltros = () => {
    setFiltros({ data_inicio: '', data_fim: '' });
    setTimeout(carregarDados, 100);
  };

  const exportarCSV = async (tipo) => {
    try {
      const params = new URLSearchParams();
      params.append('tipo', tipo);
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);

      const response = await axios.get(`/api/relatorios/export/csv?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${tipo}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar dados');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          Relatórios Gerenciais
        </h1>
        <p className="text-gray-600">
          Visualize estatísticas e dados detalhados sobre check-ins e participantes
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre os dados por período para análises específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="data_inicio">Data Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, data_inicio: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="data_fim">Data Fim</Label>
              <Input
                id="data_fim"
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros(prev => ({ ...prev, data_fim: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={aplicarFiltros} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Aplicar
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      {dadosGerais && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Empresas</p>
                  <p className="text-2xl font-bold text-blue-600">{dadosGerais.total_empresas}</p>
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
                  <p className="text-2xl font-bold text-green-600">{dadosGerais.total_pessoas}</p>
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
                  <p className="text-2xl font-bold text-purple-600">{dadosGerais.total_checkins}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taxa de Check-in</p>
                  <p className="text-2xl font-bold text-orange-600">{dadosGerais.percentual_checkin}%</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs com diferentes visualizações */}
      <Tabs defaultValue="empresas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresas">Por Empresa</TabsTrigger>
          <TabsTrigger value="setores">Por Setor</TabsTrigger>
          <TabsTrigger value="horarios">Por Horário</TabsTrigger>
          <TabsTrigger value="detalhado">Detalhado</TabsTrigger>
        </TabsList>

        {/* Relatório por Empresa */}
        <TabsContent value="empresas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Check-ins por Empresa</CardTitle>
                <CardDescription>Gráfico de barras com total de check-ins</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={empresas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="empresa" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total_checkins" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Check-ins</CardTitle>
                <CardDescription>Gráfico de pizza por empresa</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={empresas}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ empresa, percent }) => `${empresa}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_checkins"
                    >
                      {empresas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tabela por Empresa</CardTitle>
                  <CardDescription>Dados detalhados de cada empresa</CardDescription>
                </div>
                <Button onClick={() => exportarCSV('pessoas')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Total Pessoas</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                    <TableHead>Setores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{empresa.empresa}</TableCell>
                      <TableCell>{empresa.total_pessoas}</TableCell>
                      <TableCell>{empresa.total_checkins}</TableCell>
                      <TableCell>{empresa.percentual_checkin}%</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {empresa.setores?.split(',').join(', ') || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatório por Setor */}
        <TabsContent value="setores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Check-ins por Setor</CardTitle>
              <CardDescription>Análise de participação por setor</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={setores} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="setor" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="total_checkins" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabela por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setor</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Total Pessoas</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setores.map((setor, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{setor.setor}</TableCell>
                      <TableCell>{setor.empresa}</TableCell>
                      <TableCell>{setor.total_pessoas}</TableCell>
                      <TableCell>{setor.total_checkins}</TableCell>
                      <TableCell>{setor.percentual_checkin}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatório por Horário */}
        <TabsContent value="horarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Check-ins por Horário</CardTitle>
              <CardDescription>Distribuição de check-ins ao longo do dia</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={horarios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total_checkins" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatório Detalhado */}
        <TabsContent value="detalhado" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Relatório Detalhado</CardTitle>
                  <CardDescription>Dados completos por empresa e setor</CardDescription>
                </div>
                <Button onClick={() => exportarCSV('checkins')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Check-ins
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Total Pessoas</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalhado.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.empresa}</TableCell>
                      <TableCell>{item.setor}</TableCell>
                      <TableCell>{item.total_pessoas}</TableCell>
                      <TableCell>{item.total_checkins}</TableCell>
                      <TableCell>{item.percentual_checkin}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mensagens de erro */}
      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

