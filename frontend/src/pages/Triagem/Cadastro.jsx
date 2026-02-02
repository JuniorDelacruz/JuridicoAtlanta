// frontend/src/pages/TriagemCadastro.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { useToast } from "../../utils/toast";
import { Scale, ArrowLeft, CheckCircle, XCircle, Search as SearchIcon } from "lucide-react";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

const PERM_ACESSO = "triagem.acessar.cadastro";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function norm(v) {
  return (v ?? "").toString().trim().toLowerCase();
}

// tenta achar perms no "user" OU buscar no backend (caso você tenha criado um endpoint)
function extractPermsFromUser(user) {
  const maybe =
    user?.perms ||
    user?.permissions ||
    user?.permissionKeys ||
    user?.permKeys ||
    user?.grants ||
    null;

  if (Array.isArray(maybe)) return maybe.map(String);
  if (maybe && typeof maybe === "object") {
    // caso venha como { "perm.key": true }
    return Object.keys(maybe).filter((k) => !!maybe[k]);
  }
  return [];
}

async function fetchMyPermsFallback() {
  const endpoints = [
    "/api/me/perms",
    "/api/me/permissions",
    "/api/me/permissoes",
  ];

  for (const ep of endpoints) {
    try {
      const { data } = await axios.get(`${API_URL}${ep}`, { headers: authHeaders() });

      // formatos aceitos: { perms: [...] } | { permissions: [...] } | [...]
      const arr =
        (Array.isArray(data) && data) ||
        (Array.isArray(data?.perms) && data.perms) ||
        (Array.isArray(data?.permissions) && data.permissions) ||
        (Array.isArray(data?.permissionKeys) && data.permissionKeys) ||
        [];

      if (arr.length) return arr.map(String);
    } catch {
      // tenta o próximo
    }
  }

  return [];
}

export default function TriagemCadastro() {
  const { user, logout, isAuthenticated } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [pendentes, setPendentes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [perms, setPerms] = useState(() => extractPermsFromUser(user));

  // mantém perms atualizadas se o user mudar
  useEffect(() => {
    setPerms(extractPermsFromUser(user));
  }, [user]);

  const hasPerm = useMemo(() => {
    const pset = new Set((perms || []).map(String));
    return (key) => {
      if (!key) return false;

      // super bypass (se você tiver algo assim no token)
      if (user?.superadmin || user?.isSuperadmin) return true;

      // normal
      return pset.has(String(key));
    };
  }, [perms, user]);

  const permitido = hasPerm(PERM_ACESSO);

  // Gate + load perms (se não veio no token)
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    (async () => {
      try {
        // se não veio no token, tenta buscar
        if (!extractPermsFromUser(user)?.length) {
          const fetched = await fetchMyPermsFallback();
          if (fetched.length) setPerms(fetched);
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Carrega pendentes (somente se permitido)
  useEffect(() => {
    if (!isAuthenticated) return;

    // reavalia após possível fetch de perms
    const allowedNow =
      (extractPermsFromUser(user)?.length ? new Set(extractPermsFromUser(user)) : null)?.has(PERM_ACESSO) ||
      permitido;

    if (!allowedNow) {
      push({
        type: "error",
        title: "Acesso negado",
        message: "Você não tem permissão para triar cadastros.",
      });
      navigate("/triagem");
      return;
    }

    const fetchPendentes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/api/cartorio/pendentes`, {
          headers: authHeaders(),
        });
        const list = Array.isArray(response.data) ? response.data : [];
        setPendentes(list);
        setFiltered(list);
      } catch (err) {
        setError("Erro ao carregar cadastros pendentes: " + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchPendentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, permitido, perms?.length]);

  // Filtra por busca
  useEffect(() => {
    let result = pendentes;
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter((c) =>
        String(c.nomeCompleto || "").toLowerCase().includes(term) ||
        String(c.identidade || "").toLowerCase().includes(term) ||
        String(c.discordId || "").toLowerCase().includes(term)
      );
    }
    setFiltered(result);
  }, [search, pendentes]);

  const handleAprovar = async (id) => {
    if (!window.confirm("Tem certeza que deseja APROVAR este cadastro?")) return;

    try {
      await axios.patch(
        `${API_URL}/api/cartorio/${id}/aprovar`,
        {},
        { headers: authHeaders() }
      );

      setPendentes((prev) => prev.filter((c) => c.id !== id));
      setFiltered((prev) => prev.filter((c) => c.id !== id));

      push({
        type: "success",
        title: "Aprovado",
        message: "Cadastro aprovado! Notificação enviada ao Discord.",
      });
    } catch (err) {
      push({
        type: "error",
        title: "Erro ao aprovar",
        message: err.response?.data?.msg || err.message,
      });
    }
  };

  const handleIndeferir = async (id) => {
    if (!window.confirm("Tem certeza que deseja INDEFERIR este cadastro?")) return;

    try {
      await axios.patch(
        `${API_URL}/api/cartorio/${id}/indeferir`,
        {},
        { headers: authHeaders() }
      );

      setPendentes((prev) => prev.filter((c) => c.id !== id));
      setFiltered((prev) => prev.filter((c) => c.id !== id));

      push({
        type: "warning",
        title: "Indeferido",
        message: "Cadastro indeferido!",
      });
    } catch (err) {
      push({
        type: "error",
        title: "Erro ao indeferir",
        message: err.response?.data?.msg || err.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Carregando cadastros pendentes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        {error}
      </div>
    );
  }

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
              onClick={() => navigate("/triagem")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à Triagem Geral
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
        <div className="flex justify-between items-center mb-6 gap-4 flex-col md:flex-row">
          <h2 className="text-3xl font-bold text-gray-800">
            Triagem de Novos Cadastros Pendentes
          </h2>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por nome, identidade ou Discord ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Imagem Identidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Identidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discord ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profissão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
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

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cad.nomeCompleto}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cad.identidade}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a
                          href={`https://discord.com/users/${cad.discordId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          {cad.discordId}
                        </a>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cad.profissao}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cad.createdAt ? new Date(cad.createdAt).toLocaleDateString("pt-BR") : "—"}
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
