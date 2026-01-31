// frontend/src/pages/Paineis.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api"; // <- usa o axios instance com interceptor
import { ArrowLeft, Scale, Search as SearchIcon, Webhook } from "lucide-react";
import { useToast } from "../utils/toast";
import { useConfirm } from "../components/ui/confirm";

function Paineis() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const { push } = useToast();
    const { confirm } = useConfirm();

    const [usuarios, setUsuarios] = useState([]);
    const [filteredUsuarios, setFilteredUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }

        const fetchUsuarios = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await api.get("/api/users"); // ✅ backend decide permissão
                setUsuarios(response.data);
                setFilteredUsuarios(response.data);
            } catch (err) {
                const status = err?.response?.status;

                if (status === 403) {
                    navigate("/dashboard");
                    return;
                }

                setError("Erro ao carregar usuários: " + (err.response?.data?.msg || err.message));
            } finally {
                setLoading(false);
            }
        };

        fetchUsuarios();
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredUsuarios(usuarios);
            return;
        }

        const term = searchTerm.toLowerCase().trim();
        const filtered = usuarios.filter(
            (u) =>
                u.username?.toLowerCase().includes(term) ||
                u.discordId?.toLowerCase().includes(term) ||
                String(u.id).includes(term)
        );

        setFilteredUsuarios(filtered);
    }, [searchTerm, usuarios]);

    const handleRoleChange = async (userId, newRole, newSubRole) => {
        if (newRole && !confirm(`Tem certeza que deseja mudar o cargo do usuário ID ${userId} para ${newRole}?`)) return;
        if (newSubRole !== undefined && !confirm(`Tem certeza que deseja ${newSubRole ? "adicionar" : "remover"} o status de Equipe Jurídica?`)) return;

        try {
            const payload = {};
            if (newRole !== undefined) payload.role = newRole;
            if (newSubRole !== undefined) payload.subRole = newSubRole;

            await api.patch(`/api/users/${userId}`, payload); // ✅ token automático no interceptor

            setUsuarios((prev) =>
                prev.map((u) => {
                    if (u.id !== userId) return u;
                    return {
                        ...u,
                        ...(newRole !== undefined ? { role: newRole } : {}),
                        ...(newSubRole !== undefined ? { subRole: newSubRole } : {}),
                    };
                })
            );

            alert("Atualização realizada com sucesso!");
        } catch (err) {
            const status = err?.response?.status;

            if (status === 403) {
                alert("Acesso negado: você não tem permissão para alterar cargos.");
                return;
            }

            alert("Erro ao atualizar: " + (err.response?.data?.msg || err.message));
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando usuários...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">{error}</div>;

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Scale className="h-8 w-8" />
                        <h1 className="text-xl font-bold">Painéis - Gerenciamento de Cargos</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao Dashboard
                        </button>
                        <span className="text-sm">Bem-vindo, {user.username || 'Admin'}</span>
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
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">
                        Gerenciamento de Cargos
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                        {/* Botão Webhooks */}
                        <button
                            onClick={() => navigate('/paineis/webhooks')}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow"
                        >
                            <Webhook className="h-4 w-4" />
                            Configurar Webhooks
                        </button>

                        {/* Campo de busca */}
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="Buscar por nome, ID ou Discord ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow overflow-hidden">
                    {filteredUsuarios.length === 0 ? (
                        <div className="text-center py-12 text-gray-600">
                            Nenhum usuário encontrado com o termo "{searchTerm}".
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Usuário
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Discord ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cargo Atual
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Alterar Cargo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Equipe Jurídica
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsuarios.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{u.username}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {u.discordId || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {u.role}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                >
                                                    <option value="cidadao">Cidadao</option>
                                                    <option value="auxiliar">Auxiliar</option>
                                                    <option value="advogado">Advogado</option>
                                                    <option value="tabeliao">Tabelião</option>
                                                    <option value="escrivao">Escrivão</option>
                                                    <option value="promotor">Promotor</option>
                                                    <option value="conselheiro">Conselheiro</option>
                                                    <option value="promotor Chefe">Promotor Chefe</option>
                                                    <option value="juiz">Juiz</option>
                                                    <option value="desembargador">Desembargador</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={u.subRole === 'equipejuridico'}
                                                        onChange={(e) => {
                                                            const newSubRole = e.target.checked ? 'equipejuridico' : null;
                                                            handleRoleChange(u.id, u.role, newSubRole);
                                                        }}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-900">Equipe Jurídica</span>
                                                </label>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer fixado no final */}
            <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
                <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
            </footer>
        </div>
    );
}

export default Paineis;