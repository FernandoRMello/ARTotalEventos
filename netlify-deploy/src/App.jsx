import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home, Users, UserCheck, Upload, BarChart3, Settings, Building } from 'lucide-react';
import './App.css';

// Importar páginas
import HomePage from './pages/Home';
import CheckinPage from './pages/Checkin';
import ImportarPage from './pages/Importar';
import CadastroPage from './pages/Cadastro';
import RelatoriosPage from './pages/Relatorios';
import PessoasPage from './pages/Pessoas';
import ConfiguracoesPage from './pages/Configuracoes';

// Componente de navegação
function Navigation() {
  const location = useLocation();
  
  const menuItems = [
    { path: '/', icon: Home, label: 'Início' },
    { path: '/checkin', icon: UserCheck, label: 'Check-in' },
    { path: '/importar', icon: Upload, label: 'Importar' },
    { path: '/cadastro', icon: Users, label: 'Cadastro' },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    { path: '/pessoas', icon: Building, label: 'Pessoas' },
    { path: '/configuracoes', icon: Settings, label: 'Config' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Título */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-gray-900">Check-in AR</h1>
              <p className="text-xs text-gray-600">Total Eventos</p>
            </div>
          </Link>

          {/* Menu Desktop */}
          <div className="hidden md:flex space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`flex items-center space-x-2 ${
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Menu Mobile - Botão para abrir */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Menu Mobile - Lista */}
        <div className="md:hidden pb-4">
          <div className="grid grid-cols-4 gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`w-full flex flex-col items-center space-y-1 h-auto py-2 ${
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Componente principal da aplicação
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/checkin" element={<CheckinPage />} />
            <Route path="/importar" element={<ImportarPage />} />
            <Route path="/cadastro" element={<CadastroPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/pessoas" element={<PessoasPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-600">
                <p>&copy; 2025 AR Total Eventos - Sistema de Check-in</p>
              </div>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <div className="text-sm text-gray-500">
                  <span className="inline-flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Sistema Online
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;

