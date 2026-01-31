// frontend/src/pages/TriagemCadastro.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Scale, ArrowLeft, CheckCircle, XCircle, Search as SearchIcon, Image as ImageIcon } from 'lucide-react';

function TriagemCadastro() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Permissões: quem pode triar cadastros
  const allowedRoles = ['escrivao', 'juiz', 'admin']; // + equipejuridico

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const isEquipeJuridica = user.subRole === 'equipejuridico';
    if (!allowedRoles.includes(user.role) && !isEquipeJuridica) {
      alert('Acesso negado. Você não tem permissão para triar cadastros.');
      navigate('/dashboard');
      return;
    }

    const fetchPendentes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://apijuridico.starkstore.dev.br/api/cartorio/pendentes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendentes(response.data);
        setFiltered(response.data);
      } catch (err) {
        setError('Erro ao carregar cadastros pendentes: ' + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchPendentes();
  }, [isAuthenticated, user.role, navigate, user.subRole]);

  // Filtra por busca
  useEffect(() => {
    let result = pendentes;
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(c =>
        c.nomeCompleto?.toLowerCase().includes(term) ||
        c.identidade?.toLowerCase().includes(term) ||
        c.discordId?.toLowerCase().includes(term)
      );
    }
    setFiltered(result);
  }, [search, pendentes]);

  const handleAprovar = async (id) => {
    if (!confirm('Tem certeza que deseja APROVAR este cadastro?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `https://apijuridico.starkstore.dev.br/api/cartorio/${id}/aprovar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove da lista
      setPendentes(prev => prev.filter(c => c.id !== id));
      setFiltered(prev => prev.filter(c => c.id !== id));

      alert('Cadastro aprovado! Notificação enviada ao Discord.');
    } catch (err) {
      alert('Erro ao aprovar cadastro: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleIndeferir = async (id) => {
    if (!confirm('Tem certeza que deseja INDEFERIR este cadastro?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `https://apijuridico.starkstore.dev.br/api/cartorio/${id}/indeferir`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPendentes(prev => prev.filter(c => c.id !== id));
      setFiltered(prev => prev.filter(c => c.id !== id));

      alert('Cadastro indeferido!');
    } catch (err) {
      alert('Erro ao indeferir cadastro: ' + (err.response?.data?.msg || err.message));
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando cadastros pendentes...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">{error}</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8" />
            <h1 className="text-xl font-bold">Triagem - Novos Cadastros</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/triagem')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à Triagem Geral
            </button>
            <span className="text-sm">Bem-vindo, {user.username || 'Usuário'}</span>
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
      <main className="flex-grow max-w-7xl mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">
            Triagem de Novos Cadastros Pendentes
          </h2>

          <div className="relative w-64">
            <input
              type="text"
              placeholder="Buscar por nome, identidade ou Discord ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              Nenhum cadastro pendente no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagem Identidade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Completo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identidade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discord ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profissão</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((cad) => (
                    <tr key={cad.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {cad.imagemIdentidade ? (
                          <a
                            href={cad.imagemIdentidade}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={cad.imagemIdentidade}
                              alt="Identidade"
                              className="h-16 w-16 object-cover rounded-md border border-gray-300 hover:opacity-90 transition"
                            />
                          </a>
                        ) : (
                          <div className="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-xs">
                            Sem imagem
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cad.nomeCompleto}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cad.identidade}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a href={`https://discord.com/users/${cad.discordId}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                          {cad.discordId}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cad.profissao}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(cad.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                        <button
                          onClick={() => handleAprovar(cad.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleIndeferir(cad.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                        >
                          <XCircle className="h-4 w-4" />
                          Indeferir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer fixado */}
      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}

export default TriagemCadastro;