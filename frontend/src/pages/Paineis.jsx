// frontend/src/pages/Paineis.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ArrowLeft, Scale, Search as SearchIcon, Webhook, Shield } from "lucide-react";
import { useToast } from "../utils/toast";
import { useConfirm } from "../components/ui/confirm";

const ROLE_OPTIONS = [
  { value: "cidadao", label: "Cidadão" },
  { value: "auxiliar", label: "Auxiliar" },
  { value: "advogado", label: "Advogado" },
  { value: "tabeliao", label: "Tabelião" },
  { value: "escrivao", label: "Escrivão" },
  { value: "promotor", label: "Promotor" },
  { value: "conselheiro", label: "Conselheiro" },
  { value: "promotor Chefe", label: "Promotor Chefe" },
  { value: "juiz", label: "Juiz" },
  { value: "desembargador", label: "Desembargador" },

  // ⚠️ Se você vai remover admin do ROLE e passar pro SUBROLE,
  // apague essa opção daqui.
  { value: "admin", label: "Admin" },
];

const SUBROLE_OPTIONS = [
  { value: null, label: "Nenhum" },
  { value: "alteracaocargo", label: "Alteração de Cargo" },
  { value: "equipejuridico", label: "Equipe Jurídico" },
  { value: "responsaveljuridico", label: "Responsável Jurídico" },
  { value: "master", label: "Master" },
];

function labelRole(v) {
  return ROLE_OPTIONS.find((x) => x.value === v)?.label ?? String(v ?? "—");
}
function labelSubRole(v) {
  return SUBROLE_OPTIONS.find((x) => x.value === v)?.label ?? String(v ?? "Nenhum");
}

export default function Paineis() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const { confirm } = useConfirm();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [savingIds, setSavingIds] = useState(() => new Set()); // ids em atualização

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchUsuarios = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get("/api/users"); // backend decide permissão
        setUsuarios(response.data || []);
      } catch (err) {
        const status = err?.response?.status;

        if (status === 403) {
          push({
            type: "error",
            title: "Negado",
            message: "Acesso negado. Você não tem permissão para gerenciar cargos.",
          });
          navigate("/dashboard");
          return;
        }

        setError("Erro ao carregar usuários: " + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, [isAuthenticated, navigate, push]);

  const markSaving = (id, on) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const patchUserLocal = (userId, patch) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...patch } : u))
    );
  };

  const getUserSnapshot = (userId) => {
    const u = usuarios.find((x) => x.id === userId);
    return u ? { role: u.role, subRole: u.subRole } : { role: null, subRole: null };
  };

  const doUpdateUser = async (userId, payload, confirmTitle, confirmMessage) => {
    const snapshot = getUserSnapshot(userId);

    const ok = await confirm({
      title: confirmTitle,
      message: confirmMessage,
      confirmText: "Confirmar",
      cancelText: "Cancelar",
    });

    if (!ok) {
      // reverte qualquer mudança visual (caso você tenha feito optimista)
      patchUserLocal(userId, snapshot);
      return;
    }

    markSaving(userId, true);

    try {
      await api.patch(`/api/users/${userId}`, payload);

      // atualiza UI com o que você tentou setar
      patchUserLocal(userId, payload);

      push({
        type: "success",
        title: "Sucesso",
        message: "Atualização realizada com sucesso!",
      });
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.msg || err.message;

      // reverte na UI
      patchUserLocal(userId, snapshot);

      if (status === 403) {
        push({ type: "error", title: "Negado", message: msg || "Você não tem permissão." });
      } else {
        push({ type: "warning", title: "Erro", message: msg });
      }
    } finally {
      markSaving(userId, false);
    }
  };

  const onChangeRole = async (userId, newRole) => {
    const u = usuarios.find((x) => x.id === userId);
    if (!u) return;

    // mudança visual imediata (optimista) pra UX
    patchUserLocal(userId, { role: newRole });

    await doUpdateUser(
      userId,
      { role: newRole },
      "Alteração de Cargo",
      `Tem certeza que deseja mudar o cargo do usuário ID ${userId} para ${labelRole(newRole)}?`
    );
  };

  const onChangeSubRole = async (userId, newSubRole) => {
    const u = usuarios.find((x) => x.id === userId);
    if (!u) return;

    // normaliza select (string "null" -> null)
    const finalSub = newSubRole === "null" ? null : newSubRole;

    patchUserLocal(userId, { subRole: finalSub });

    await doUpdateUser(
      userId,
      { subRole: finalSub },
      "Alteração de Permissão (SubCargo)",
      `Tem certeza que deseja definir o subcargo de ID ${userId} para: ${labelSubRole(finalSub)}?`
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando usuários...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-600">{error}</div>;
  }

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

      {/* Conteúdo principal */}
      <main className="flex-grow max-w-7xl mx-auto py-8 px-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Gerenciamento de Cargos</h2>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <button
              onClick={() => navigate("/paineis/webhooks")}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow"
            >
              <Webhook className="h-4 w-4" />
              Configurar Webhooks
            </button>

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
                      Permissão (SubCargo)
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsuarios.map((u) => {
                    const isSaving = savingIds.has(u.id);

                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <span>{u.username}</span>
                            {u.subRole === "master" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                                <Shield className="h-3 w-3" /> MASTER
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500">ID: {u.id}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.discordId || "—"}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {labelRole(u.role)}
                          <div className="text-xs text-gray-400">
                            Sub: {labelSubRole(u.subRole ?? null)}
                          </div>
                        </td>

                        {/* Role select */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={u.role ?? ""}
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
                          {isSaving ? (
                            <div className="text-xs text-gray-400 mt-1">Salvando...</div>
                          ) : null}
                        </td>

                        {/* SubRole select */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={u.subRole ?? "null"}
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
