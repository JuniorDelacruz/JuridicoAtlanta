import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
  Scale,
  FileText,
  Briefcase,
  Users,
  Calendar,
  Search,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import Login from './pages/Login'; // ajuste o caminho se for diferente
import Dashboard from './pages/Dashboard';
import Paineis from './pages/Paineis';
import ProtectedRoute from './components/ProtectedRoute';
import RequerimentoDetalhes from './pages/Requerimentos/RequerimentoDetalhes';
import Triagem from './pages/Triagem';
import Cartorio from './pages/Cartorio';
import TriagemCadastro from './pages/Triagem/Cadastro'
import CodigoPenalAtlanta from './pages/CodigoPenalAtlanta';
import DiretrizesTribunal from './pages/DiretrizesTribunal';
import ConstituicaoAtlanta from './pages/ConstituicaoAtlanta';
import WebhookConfig from './pages/Paineis/ConfigWebHook';
import RequerimentoHub from './pages/Requerimentos';
import RequerimentoTipoList from './pages/Requerimentos/RequerimentoTipoList';
import RequerimentoNovo from './pages/Requerimentos/RequerimentoNovo';
import TriagemRequerimentosTipo from './pages/Triagem/TriagemRequerimentosTipo';
import TriagemRequerimentoDetalhes from './pages/Triagem/TriagemRequerimentoDetalhes';
import CodigoEticaJudiciario from './pages/CodigoEticaJudiciario';
import ManualAdvogado from './pages/ManualAdvogado';
import Arquivos from './pages/Arquivos';
import ConsultarCidadao from './pages/arquivos/ConsultarCidadao';
import Valores from './pages/valores/Valores';
import TriagemRequerimentoDetalhesCasamento from './pages/Triagem/TriagemRequerimentoDetalhesCasamento';

function LandingPage() {
  // Sua página inicial atual (extraída para um componente separado)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Jurídico Atlanta</h1>
              <p className="text-sm opacity-80">Sistema de Gestão Jurídica</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <button className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-md text-sm font-medium transition">
                Entrar
              </button>
            </Link>
            <button className="px-4 py-2 border border-white/30 hover:bg-white/10 rounded-md text-sm font-medium transition">
              Suporte
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-800 to-blue-950 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Bem-vindo ao Sistema Jurídico Atlanta
          </h2>
          <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto mb-10">
            Gestão inteligente de processos, contratos, prazos e documentos
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/login">
              <button className="bg-white text-blue-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg text-lg">
                Acessar o Sistema
              </button>
            </Link>
            <button className="bg-transparent border-2 border-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition text-lg">
              Conhecer os Módulos →
            </button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Principais Funcionalidades
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Seus cards aqui – mantive exatamente como estava */}
            {/* Card 1 */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition overflow-hidden group">
              <div className="bg-blue-600 p-6 text-white">
                <FileText className="h-10 w-10 mb-2" />
                <h4 className="text-xl font-semibold">Processos</h4>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Acompanhamento completo de processos judiciais e administrativos, com histórico, movimentações e prazos.
                </p>
                <a href="#" className="text-blue-600 font-medium hover:underline">
                  Acessar →
                </a>
              </div>
            </div>

            {/* ... os outros 5 cards iguais ao seu código original ... */}

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p>© {new Date().getFullYear()} Jurídico Atlanta • Todos os direitos reservados</p>
          <p className="mt-2 text-sm">Sistema desenvolvido para controle e eficiência na advocacia</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Página inicial pública */}
      <Route path="/" element={<LandingPage />} />

      {/* Página de login */}
      <Route path="/login" element={<Login />} />


      {/* <Route path="/dashboard" element={<Dashboard />} /> */}


      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={["cidadao","auxiliar", "advogado", "tabeliao", "escrivao", "promotor", "conselheiro", "promotor chefe", "juiz", "desembargador", "admin"]}
            allowedSubRoles={["equipejuridico"]} // <- padroniza aqui
            deniedTo="/" // <- se negar acesso, volta pra home
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />




      <Route
        path="/paineis"
        element={
          <ProtectedRoute
            allowedRoles={["auxiliar", "advogado", "tabeliao", "escrivao", "promotor", "conselheiro", "promotor chefe", "juiz", "desembargador", "admin"]}
            allowedSubRoles={["equipejuridico"]} // <- padroniza aqui
            deniedTo="/dashboard" // <- se negar acesso, volta pra home
          >
            <Paineis />
          </ProtectedRoute>
        }
      />


      <Route path="/arquivos/consultar-cidadao"
        element={<ProtectedRoute
          allowedRoles={["auxiliar", "advogado", "tabeliao", "escrivao", "promotor", "conselheiro", "promotor chefe", "juiz", "desembargador", "admin"]}
          allowedSubRoles={["equipejuridico"]} // <- padroniza aqui
          deniedTo="/dashboard" // <- se negar acesso, volta pra home
        >
          <ConsultarCidadao />
        </ProtectedRoute>
        }
      />


      <Route path="/valores" element={<Valores />} />
      <Route path="/codigo-etica" element={<CodigoEticaJudiciario />} />
      <Route path="/manual-advogado" element={<ManualAdvogado />} />
      <Route path="/diretrizes-tribunal" element={<DiretrizesTribunal />} />
      <Route path="/codigo-penal" element={<CodigoPenalAtlanta />} />
      <Route path="/arquivos" element={<Arquivos />} />


      <Route path="/paineis/webhooks" element={<WebhookConfig />} />
      <Route path="/triagem/cadastro" element={<TriagemCadastro />} />
      <Route path="/cartorio" element={<Cartorio />} />
      <Route path="/triagem" element={<Triagem />} />
      <Route path="/triagem/:slug" element={<TriagemRequerimentosTipo />} />
      <Route path="/triagem/:slug/detalhes/:numero" element={<TriagemRequerimentoDetalhes />} />
      <Route path="/triagem/:slug/detalhe/:numero" element={<TriagemRequerimentoDetalhesCasamento />} />
      <Route path="/requerimentos/detalhes/:id" element={<RequerimentoDetalhes />} />
      <Route path="/requerimentos/:slug/novo" element={<RequerimentoNovo />} />
      <Route path="/requerimentos" element={<RequerimentoHub />} />
      <Route path="/requerimentos/:slug" element={<RequerimentoTipoList />} />
      <Route path="/constituicao" element={<ConstituicaoAtlanta />} />




      {/* 404 */}
      <Route path="*" element={<div className="min-h-screen flex items-center justify-center text-2xl">Página não encontrada (404)</div>} />
    </Routes>


  );
}

export default App;