// frontend/src/pages/TriagemRequerimentosTipo.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { Scale, ArrowLeft, CheckCircle, XCircle, Search as SearchIcon } from "lucide-react";
import { getTriagemTipoBySlug } from "../../config/triagemTipos";
import { useToast } from "../../utils/toast";



const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export default function TriagemRequerimentosTipo() {
  const { push } = useToast();
  const { slug } = useParams();
  const tipoCfg = getTriagemTipoBySlug(slug);

  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isEquipeJuridica = user?.subRole === "equipejuridico";

  const [pendentes, setPendentes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const isCarimbo = slug === "carimbo"; // ✅ ponto central

  const permitido = useMemo(() => {
    if (!tipoCfg) return false;
    return tipoCfg.roles.includes(user?.role) || isEquipeJuridica || user?.role === "admin";
  }, [tipoCfg, user?.role, isEquipeJuridica]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!tipoCfg) {
      navigate("/triagem");
      return;
    }

    if (!permitido) {
      alert("Acesso negado. Você não tem permissão para triar este tipo.");
      navigate("/triagem");
      return;
    }

    const fetchPendentes = async () => {
      setLoading(true);
      setError(null);
      try {
        // ✅ Backend espera "carimbo" no query param para aplicar o filtro AGUARDANDO_CARIMBO
        const tipoParam = isCarimbo ? "carimbo" : tipoCfg.tipoDb;

        const res = await axios.get(`${API_URL}/api/triagem/requerimentos`, {
          headers: authHeaders(),
          params: { tipo: tipoParam },
        });

        setPendentes(res.data || []);
        setFiltered(res.data || []);
      } catch (err) {
        setError("Erro ao carregar pendentes: " + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchPendentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, slug, permitido]);

  useEffect(() => {
    let result = pendentes;
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter((r) =>
        String(r.numero || "").includes(term) ||
        String(r.solicitante || "").toLowerCase().includes(term)
      );
    }
    setFiltered(result);
  }, [search, pendentes]);

  // ✅ Aprovar só faz sentido quando é PENDENTE (triagem normal)
  const handleAprovar = async (numero) => {
    if (!confirm(`Tem certeza que deseja APROVAR o requerimento #${numero}?`)) return;

    try {
      await axios.patch(`${API_URL}/api/triagem/requerimentos/${numero}/aprovar`, {}, { headers: authHeaders() });

      setPendentes((prev) => prev.filter((r) => r.numero !== numero));
      setFiltered((prev) => prev.filter((r) => r.numero !== numero));

      push({ type: 'success', title: "Sucesso", message: "Requerimento Aprovado" })
    } catch (err) {
      alert("Erro ao aprovar: " + (err.response?.data?.msg || err.message));
    }
  };

  // ✅ Indeferir pode existir em ambos fluxos (depende do teu backend; se bloquear, ajuste lá)
  const handleIndeferir = async (numero) => {
    if (!confirm(`Tem certeza que deseja INDEFERIR o requerimento #${numero}?`)) return;

    try {
      await axios.patch(`${API_URL}/api/triagem/requerimentos/${numero}/indeferir`, {}, { headers: authHeaders() });

      setPendentes((prev) => prev.filter((r) => r.numero !== numero));
      setFiltered((prev) => prev.filter((r) => r.numero !== numero));

      alert("Requerimento indeferido!");
    } catch (err) {
      alert("Erro ao indeferir: " + (err.response?.data?.msg || err.message));
    }
  };

  // ✅ Carimbar: endpoint próprio (crie no backend)
  const handleCarimbar = async (numero) => {
    if (!confirm(`Confirmar CARIMBO do requerimento #${numero}?`)) return;

    try {
      await axios.patch(`${API_URL}/api/triagem/requerimentos/${numero}/carimbar`, {}, { headers: authHeaders() });

      setPendentes((prev) => prev.filter((r) => r.numero !== numero));
      setFiltered((prev) => prev.filter((r) => r.numero !== numero));

      alert("Requerimento carimbado!");
    } catch (err) {
      alert("Erro ao carimbar: " + (err.response?.data?.msg || err.message));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
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
            <h1 className="text-xl font-bold">Triagem — {tipoCfg?.label}</h1>
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

      {/* Conteúdo */}
      <main className="flex-grow max-w-7xl mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-6 gap-4 flex-col md:flex-row">
          <h2 className="text-3xl font-bold text-gray-800">
            {isCarimbo ? "Aguardando Carimbo" : "Pendentes"} — {tipoCfg?.label}
          </h2>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar por número ou solicitante..."
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
              {isCarimbo ? "Nenhum requerimento aguardando carimbo." : "Nenhum pendente no momento."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((r) => (
                    <tr key={r.numero} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{r.numero}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.solicitante}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                        {/* ✅ Ação principal muda dependendo da triagem */}
                        {isCarimbo ? (
                          <button
                            onClick={() => handleCarimbar(r.numero)}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Carimbar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAprovar(r.numero)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Aprovar
                          </button>
                        )}

                        <button
                          onClick={() => handleIndeferir(r.numero)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                        >
                          <XCircle className="h-4 w-4" />
                          Indeferir
                        </button>

                        <button
                          onClick={() => navigate(`/triagem/${slug}/detalhes/${r.numero}`)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
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

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}