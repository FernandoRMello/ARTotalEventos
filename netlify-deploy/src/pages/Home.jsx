import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Upload, BarChart3, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Sistema de Check-in AR Total Eventos
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Controle completo de entrada de pessoas em eventos com importação de dados, 
          check-in digital e relatórios gerenciais em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Importar Dados
            </CardTitle>
            <CardDescription>
              Importe planilhas Excel com dados de pessoas e empresas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/importar">
              <Button className="w-full">
                Importar Excel
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Cadastro Manual
            </CardTitle>
            <CardDescription>
              Cadastre pessoas individualmente com OCR de documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/cadastro">
              <Button className="w-full">
                Novo Cadastro
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Check-in
            </CardTitle>
            <CardDescription>
              Realize check-in de participantes com validação de pulseiras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/checkin">
              <Button className="w-full">
                Fazer Check-in
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              Relatórios
            </CardTitle>
            <CardDescription>
              Visualize estatísticas e relatórios gerenciais detalhados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/relatorios">
              <Button className="w-full">
                Ver Relatórios
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Pessoas
            </CardTitle>
            <CardDescription>
              Gerencie cadastros de pessoas e empresas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/pessoas">
              <Button className="w-full">
                Gerenciar Pessoas
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Configurações
            </CardTitle>
            <CardDescription>
              Configure o sistema e gerencie empresas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/configuracoes">
              <Button className="w-full">
                Configurações
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Pronto para começar?
        </h2>
        <p className="text-gray-600 mb-4">
          Comece importando uma planilha Excel ou fazendo o primeiro check-in manual.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/importar">
            <Button size="lg" className="w-full sm:w-auto">
              Importar Dados
            </Button>
          </Link>
          <Link to="/checkin">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Fazer Check-in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

