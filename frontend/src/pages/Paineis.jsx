// frontend/src/pages/Paineis.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  ArrowLeft,
  Scale,
  Search as SearchIcon,
  Webhook,
  Shield,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { useToast } from "../utils/toast";
import { useConfirm } from "../components/ui/confirm";

// ... (mantenha ROLE_OPTIONS, SUBROLE_OPTIONS, norm, labelRole, labelSubRole, SubRoleBadge iguais)

export default function Paineis() {
  const { 
    user, 
    logout, 
    isAuthenticated, 
    hasPerm, 
    permsLoading 
  } = useAuth();
  
  const navigate = useNavigate();
  const { push } = useToast();
  const { confirm } = useConfirm();

  const [usuarios, setUsuarios] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [savingIds, setSavingIds] = useState(() => new Set());

  const [hasCheckedPerm, setHasCheckedPerm] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const filteredUsuarios = useMemo(() => {
    if (!searchTerm.trim()) return usuarios;
    const term = searchTerm.toLowerCase().trim();
    return usuarios.filter(
      (u) =>
        u.username?.toLowerCase().includes(term) ||
        (u.discordId?.toLowerCase?.() || "").includes(term) ||
        String(u.id).includes(term)
    );
  }, [usuarios, searchTerm]);

  // 1. Gate de permissão: espera permsLoading terminar antes de decidir
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (permsLoading) {
      // Ainda carregando permissões → não decide nada ainda
      return;
    }

    // Permissões já carregadas
    const canManage = !!hasPerm?.("admin.perm.manageroles");

    setIsAuthorized(canManage);
    setHasCheckedPerm(true);

    if (!canManage) {
      push({
        type: "error",
        title: "Negado",
        message: "Você não tem permissão para gerenciar cargos.",
      });
      navigate("/dashboard");
    }
  }, [isAuthenticated, permsLoading, hasPerm, navigate, push]);

  // 2. Fetch de usuários: só roda se autorizado e permissão checada
  useEffect(() => {
    if (!hasCheckedPerm || !isAuthorized || !isAuthenticated) return;

    const fetchUsuarios = async () => {
      setFetchLoading(true);
      setError(null);

      try {
        const response = await api.get("/api/users");
        setUsuarios(response.data || []);
      } catch (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.msg || err.message;

        if (status === 403) {
          push({
            type: "error",
            title: "Negado",
            message: "Acesso negado. Você não tem permissão para gerenciar cargos.",
          });
          navigate("/dashboard");
          return;
        }

        setError("Erro ao carregar usuários: " + msg);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchUsuarios();
  }, [hasCheckedPerm, isAuthorized, isAuthenticated, navigate, push]);

  // ... (mantenha markSaving, patchUserLocal, getUserSnapshot, doUpdateUser, onChangeRole, onChangeSubRole iguais)

  // Renderizações
  if (!isAuthenticated) return null;

  if (permsLoading || !hasCheckedPerm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-600">
        Verificando autenticação e permissões...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">
        Acesso negado.
      </div>
    );
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-600">
        Carregando usuários...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-red-600">
        {error}
      </div>
    );
  }

  // Renderização principal (header + main + tabela + footer)
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8" />
            <h1 className="text-xl font-bold">Painéis - Gerenciamento de Cargos</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </button>
            <span className="text-sm">Bem-vindo, {user?.username || "Usuário"}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto py-8 px-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Gerenciamento de Cargos</h2>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            {canConfigWebhooks && (
              <button
                onClick={() => navigate("/paineis/webhooks")}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow"
              >
                <Webhook className="h-4 w-4" />
                Configurar Webhooks
              </button>
            )}

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar por nome, ID ou Discord ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Badge</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discord ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo Atual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alterar Cargo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissão (SubCargo)</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsuarios.map((u) => {
                    const isSaving = savingIds.has(u.id);

                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{u.username}</div>
                          <div className="text-xs text-gray-500">ID: {u.id}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <SubRoleBadge subRole={u.subRole} />
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.discordId || "—"}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {labelRole(u.role)}
                          <div className="text-xs text-gray-400">Sub: {labelSubRole(u.subRole)}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={norm(u.role) ?? ""}
                            disabled={isSaving}
                            onChange={(e) => onChangeRole(u.id, e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-60"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {isSaving && <div className="text-xs text-gray-400 mt-1">Salvando...</div>}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={norm(u.subRole) ?? "null"}
                            disabled={isSaving}
                            onChange={(e) => onChangeSubRole(u.id, e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-60"
                          >
                            {SUBROLE_OPTIONS.map((opt) => (
                              <option key={String(opt.value)} value={opt.value ?? "null"}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}