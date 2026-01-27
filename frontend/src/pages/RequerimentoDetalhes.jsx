// frontend/src/pages/RequerimentoDetalhes.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, User } from 'lucide-react';

function RequerimentoDetalhes() {
  const { id } = useParams(); // pega o :id da URL
  const { user, logout , isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [requerimento, setRequerimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchRequerimento = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`https://apijuridico.starkstore.dev.br//api/requerimentos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRequerimento(response.data);
      } catch (err) {
        setError('Erro ao carregar detalhes do requerimento: ' + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchRequerimento();
  }, [id, isAuthenticated, navigate]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando detalhes...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">{error}</div>;
  if (!requerimento) return <div className="flex items-center justify-center min-h-screen text-gray-600">Requerimento não encontrado</div>;

  // Cores e ícones por status
  const statusConfig = {
    PENDENTE: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    APROVADO: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    INDEFERIDO: { color: 'bg-red-100 text-red-800', icon: XCircle },
  };

  const StatusBadge = statusConfig[requerimento.status] || { color: 'bg-gray-100 text-gray-800', icon: FileText };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <h1 className="text-xl font-bold">Detalhes do Requerimento #{requerimento.numero}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/requerimentos')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Requerimentos
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-grow max-w-5xl mx-auto py-8 px-6">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Cabeçalho com status */}
          <div className="p-6 border-b flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {requerimento.tipo}
              </h2>
              <p className="text-gray-600 mt-1">
                Solicitante: {requerimento.solicitante || '—'}
              </p>
            </div>

            <div className={`px-4 py-2 rounded-full ${StatusBadge.color} flex items-center gap-2`}>
              <StatusBadge.icon className="h-5 w-5" />
              <span className="font-medium">{requerimento.status}</span>
            </div>
          </div>

          {/* Informações gerais */}
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Número</p>
                <p className="font-medium">{requerimento.numero}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data de Criação</p>
                <p className="font-medium">{new Date(requerimento.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Criado por (ID)</p>
                <p className="font-medium">{requerimento.userId}</p>
              </div>
            </div>
          </div>

          {/* Dados específicos */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Dados do Requerimento</h3>
            <div className="bg-gray-50 p-6 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {JSON.stringify(requerimento.dados, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Botões de ação (futuro: aprovar, indeferir, editar) */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => navigate('/requerimentos')}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-md"
          >
            Voltar
          </button>
          {/* <button className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Aprovar
          </button>
          <button className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Indeferir
          </button> */}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}

export default RequerimentoDetalhes;