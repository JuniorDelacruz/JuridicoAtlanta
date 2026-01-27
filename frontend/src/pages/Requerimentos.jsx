// frontend/src/pages/Requerimentos.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FileText, Plus, ArrowLeft, Search as SearchIcon } from 'lucide-react';

function Requerimentos() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [requerimentos, setRequerimentos] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [formDados, setFormDados] = useState({});
  const [statusFilter, setStatusFilter] = useState('todos');

  // Permissões
  const allowedRoles = ['advogado', 'promotor', 'auxiliar', 'admin', 'conselheiro', 'promotorchefe', 'juiz', 'desembargador'];
  const isEquipeJuridica = user?.subRole === 'equipejuridico';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!allowedRoles.includes(user.role) && !isEquipeJuridica) {
      alert('Acesso negado. Você não tem permissão para gerenciar requerimentos.');
      navigate('/dashboard');
      return;
    }

    const fetchRequerimentos = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://apijuridico.starkstore.dev.br//api/requerimentos', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRequerimentos(response.data);
        setFiltered(response.data);
      } catch (err) {
        setError('Erro ao carregar requerimentos: ' + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchRequerimentos();
  }, [isAuthenticated, user.role, navigate, isEquipeJuridica]);

  // Filtro
  useEffect(() => {
    let result = requerimentos;
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(r =>
        r.numero?.toString().includes(term) ||
        r.tipo?.toLowerCase().includes(term) ||
        r.solicitante?.toLowerCase().includes(term)
      );
    }
    setFiltered(result);
  }, [search, requerimentos]);

  const tiposPermitidos = [
    { nome: 'Porte de Arma', roles: ['auxiliar', 'advogado', 'juiz', 'promotor', 'promotorchefe', 'admin', 'equipejuridico'] },
    { nome: 'Troca de Nome', roles: ['auxiliar', 'advogado', 'juiz', 'promotor', 'promotorchefe', 'admin', 'equipejuridico'] },
    { nome: 'Casamento', roles: ['tabeliao', 'escrivao', 'juiz', 'admin', 'equipejuridico'] },
    { nome: 'Limpeza de Ficha', roles: ['auxiliar', 'advogado', 'juiz', 'promotor', 'promotorchefe', 'admin', 'equipejuridico'] },
    { nome: 'Emitir Alvará', roles: ['auxiliar', 'advogado', 'tabeliao', 'escrivao', 'conselheirodaordem', 'juiz', 'promotor', 'promotorchefe', 'admin', 'equipejuridico'] },
    { nome: 'Renovação de Alvará', roles: ['auxiliar', 'advogado', 'tabeliao', 'escrivao', 'conselheirodaordem', 'juiz', 'promotor', 'promotorchefe', 'admin', 'equipejuridico'] },
  ];

  const armasDisponiveis = [
    'Revolver Lemat', 'Revolver Navy Crossover', 'Revolver Navy', 'Pistol M1899', 'Pistol Mauser',
    'Carabine Repeater', 'Evans Repeater', 'Winchester Repeater', 'Boltaction Rifle', 'Springfield Rifle',
    'Elephant Rifle', 'Varmint Rifle', 'Rolling Block Rifle', 'Carcano Rifle',
    'Semi-Auto Shotgun', 'Repeating Shotgun', 'Double Barrel Shotgun', 'Double Barrel Exotic Shotgun',
    'Pump Shotgun', 'Sawedoff Shotgun', 'Metralhadora Thompson', 'Todos os armamentos'
  ];

  const handleNovoRequerimento = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setTipoSelecionado('');
    setFormDados({});
  };

  const handleCriarRequerimento = async () => {
    if (!tipoSelecionado) return alert('Selecione o tipo de requerimento');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://apijuridico.starkstore.dev.br//api/requerimentos',
        {
          tipo: tipoSelecionado,
          dados: formDados,
          solicitante: user.username || 'Usuário',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Atualiza lista
      setRequerimentos(prev => [response.data, ...prev]);
      setFiltered(prev => [response.data, ...prev]);

      alert('Requerimento criado com sucesso! Status: PENDENTE');
      closeModal();
    } catch (err) {
      alert('Erro ao criar requerimento: ' + (err.response?.data?.msg || err.message));
    }
  };

  const renderForm = () => {
    if (tipoSelecionado === 'Porte de Arma') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qual a Arma?
            </label>
            <select
              value={formDados.arma || ''}
              onChange={(e) => setFormDados({ ...formDados, arma: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="">Selecione a arma</option>
              {armasDisponiveis.map(arma => (
                <option key={arma} value={arma}>{arma}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Registro (Cartório)
            </label>
            <input
              type="text"
              value={formDados.numeroRegistro || ''}
              onChange={(e) => setFormDados({ ...formDados, numeroRegistro: e.target.value })}
              placeholder="Digite o número de registro do cidadão"
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
      );
    }

    if (tipoSelecionado === 'Troca de Nome') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Identificação (Registro Cartório)
            </label>
            <input
              type="text"
              value={formDados.numeroIdentificacao || ''}
              onChange={(e) => setFormDados({ ...formDados, numeroIdentificacao: e.target.value })}
              placeholder="Digite o número de registro"
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Novo Nome Desejado
            </label>
            <input
              type="text"
              value={formDados.novoNome || ''}
              onChange={(e) => setFormDados({ ...formDados, novoNome: e.target.value })}
              placeholder="Digite o novo nome"
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
      );
    }

    // Placeholder para os outros tipos
    return (
      <div className="text-center py-6 text-gray-600">
        Formulário para {tipoSelecionado} em desenvolvimento...
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <h1 className="text-xl font-bold">Requerimentos - Jurídico Atlanta RP</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
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
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-3xl font-bold text-gray-800">
            Gerenciamento de Requerimentos
          </h2>

          <div className="flex gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition"
            >
              <Plus className="h-5 w-5" />
              Novo Requerimento
            </button>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="INDEFERIDO">Indeferido</option>
            </select>
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-6 max-w-md">
          <input
            type="text"
            placeholder="Buscar por número, tipo ou solicitante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              Nenhum requerimento encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((req) => (
                    <tr key={req.numero} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.numero}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.tipo}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          req.status === 'APROVADO' ? 'bg-green-100 text-green-800' :
                          req.status === 'INDEFERIDO' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.solicitante}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => navigate(`/requerimentos/${req.numero}`)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Ver detalhes
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

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>

      {/* Modal Novo Requerimento */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-2xl font-bold">Novo Requerimento</h3>
            </div>

            {!tipoSelecionado ? (
              <div className="p-6">
                <p className="mb-4 text-gray-700">Escolha o tipo de requerimento:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tiposPermitidos.map(t => (
                    <button
                      key={t.nome}
                      onClick={() => setTipoSelecionado(t.nome)}
                      className="bg-indigo-50 hover:bg-indigo-100 p-4 rounded-lg text-left border border-indigo-200 transition"
                    >
                      <div className="font-medium">{t.nome}</div>
                      <div className="text-sm text-gray-600 mt-1">Permitido para: {t.roles.join(', ')}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xl font-bold">{tipoSelecionado}</h4>
                  <button onClick={() => setTipoSelecionado('')} className="text-indigo-600 hover:text-indigo-800">
                    Voltar aos tipos
                  </button>
                </div>

                {renderForm()}

                <div className="mt-8 flex justify-end gap-4">
                  <button onClick={closeModal} className="px-6 py-2 bg-gray-300 rounded-md">
                    Cancelar
                  </button>
                  <button
                    onClick={handleCriarRequerimento}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Criar Requerimento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Requerimentos;