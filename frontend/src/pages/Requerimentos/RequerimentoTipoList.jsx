// frontend/src/pages/requerimentos/RequerimentoTipoList.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getTipoBySlug } from "../../config/requerimentosTipos";
import { ArrowLeft, Plus, Search as SearchIcon } from "lucide-react";
import { api } from "../../services/api";

// ✅ Permissão por slug (mesmo padrão do Hub)
const PERM_BY_SLUG = {
  "casamento": "requerimento.acessar.casamento",
  "alvara": "requerimento.acessar.emitiralvara",
  "limpeza-de-ficha": "requerimento.acessar.limpezadeficha",
  "porte-de-arma": "requerimento.acessar.portedearma",
  "renovacao-alvara": "requerimento.acessar.renovacaoalvara",
  "troca-de-nome": "requerimento.acessar.trocadenome",
};

export default function RequerimentoTipoList() {
  const { slug } = useParams();
  const tipoCfg = getTipoBySlug(slug);

  const { user, logout, isAuthenticated, hasPerm, displayName } = useAuth();
  const navigate = useNavigate();

  // bypass opcional
  const isEquipeJuridica = user?.subRole === "equipejuridico";

  const [requerimentos, setRequerimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  // ✅ permissão com hasPerm
  const permitido = useMemo(() => {
    if (!tipoCfg) return false;

    const perm = PERM_BY_SLUG[slug];
    if (!perm) return false; // segurança: slug sem perm = bloqueia

    if (user?.role === "admin") return true;
    if (isEquipeJuridica) return true;

    return !!hasPerm?.(perm);
  }, [tipoCfg, slug, user?.role, isEquipeJuridica, hasPerm]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!tipoCfg) {
      navigate("/requerimentos");
      return;
    }

    if (!permitido) {
      alert("Acesso negado para este tipo de requerimento.");
      navigate("/requerimentos");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { tipo: tipoCfg.tipoDb };
        if (statusFilter !== "todos") params.status = statusFilter;

        const res = await api.get(`/api/requerimentos`, { params });

        setRequerimentos(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err.response?.data?.msg || err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, slug, statusFilter, permitido]);

  const filtered = useMemo(() => {
    let result = requerimentos;
    const term = search.trim().toLowerCase();

    if (term) {
      result = result.filter(
        (r) =>
          String(r.numero || "").includes(term) ||
          String(r.solicitante || "").toLowerCase().includes(term)
      );
    }
    return result;
  }, [requerimentos, search]);

  const handleNovo = () => navigate(`/requerimentos/${slug}/novo`);

  if (!tipoCfg) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{tipoCfg.label} - Requerimentos</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/requerimentos")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <span className="text-sm">Bem-vindo, {displayName || user?.username || "Usuário"}</span>

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
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-3xl font-bold text-gray-800">{tipoCfg.label}</h2>

          <div className="flex gap-4">
            <button
              onClick={handleNovo}
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

        <div className="relative mb-6 max-w-md">
          <input
            type="text"
            placeholder="Buscar por número ou solicitante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Carregando...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-600">Nenhum requerimento encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solicitante
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
                    {filtered.map((req) => (
                      <tr key={req.numero} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.numero}</td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              req.status === "APROVADO"
                                ? "bg-green-100 text-green-800"
                                : req.status === "INDEFERIDO"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.solicitante}</td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(req.createdAt).toLocaleDateString("pt-BR")}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => navigate(`/requerimentos/detalhes/${req.numero}`)}
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
        )}

        {/* debug opcional */}
        {/* <div className="mt-4 text-xs text-gray-400">perm: {PERM_BY_SLUG[slug] || "—"}</div> */}
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}
