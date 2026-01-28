import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { getTipoBySlug } from "../../config/requerimentosTipos";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export default function TriagemRequerimentoDetalhes() {
  const { slug, numero } = useParams();
  const tipoCfg = getTipoBySlug(slug);

  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isEquipeJuridica = user?.subRole === "equipejuridico";
  const allowedTriagemRoles = ["juiz", "promotor", "promotorchefe", "tabeliao", "escrivao", "admin"];

  const permitido = useMemo(() => {
    // triagem: cargos específicos + equipejuridico
    return allowedTriagemRoles.includes(user?.role) || isEquipeJuridica;
  }, [user?.role, isEquipeJuridica]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);

  const voltar = () => navigate(`/triagem/${slug}`);

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
      alert("Acesso negado. Você não tem permissão para ver detalhes na triagem.");
      navigate("/triagem");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/triagem/requerimentos/${numero}`, {
          headers: authHeaders(),
        });

        // proteção: garantir que o número acessado pertence ao tipo da rota
        if (res.data?.tipo !== tipoCfg.tipoDb) {
          setError("Este requerimento não pertence a esta categoria de triagem.");
          setData(null);
        } else {
          setData(res.data);
        }
      } catch (err) {
        setError(err.response?.data?.msg || err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, slug, numero]);

  async function aprovar() {
    if (!confirm("Tem certeza que deseja APROVAR este requerimento?")) return;
    setActing(true);
    try {
      await axios.patch(`${API_URL}/api/triagem/requerimentos/${numero}/aprovar`, {}, { headers: authHeaders() });
      alert("Requerimento aprovado!");
      voltar();
    } catch (err) {
      alert("Erro ao aprovar: " + (err.response?.data?.msg || err.message));
    } finally {
      setActing(false);
    }
  }

  async function indeferir() {
    if (!confirm("Tem certeza que deseja INDEFERIR este requerimento?")) return;
    setActing(true);
    try {
      await axios.patch(`${API_URL}/api/triagem/requerimentos/${numero}/indeferir`, {}, { headers: authHeaders() });
      alert("Requerimento indeferido!");
      voltar();
    } catch (err) {
      alert("Erro ao indeferir: " + (err.response?.data?.msg || err.message));
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Triagem — Detalhes ({tipoCfg?.label || "Requerimento"})</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={voltar}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à Triagem
            </button>
            <span className="text-sm">Bem-vindo, {user?.username || "Usuário"}</span>
            <button onClick={logout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto py-8 px-6 w-full">
        {loading ? (
          <div className="text-center py-12 text-gray-600">Carregando detalhes...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : !data ? (
          <div className="text-center py-12 text-gray-600">Nada para exibir.</div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Requerimento #{data.numero} — {data.tipo}
                </h2>
                <p className="text-gray-600">
                  Solicitante: <b>{data.solicitante}</b> • Data:{" "}
                  {new Date(data.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    data.status === "APROVADO"
                      ? "bg-green-100 text-green-800"
                      : data.status === "INDEFERIDO"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {data.status}
                </span>

                {data.status === "PENDENTE" && (
                  <>
                    <button
                      onClick={aprovar}
                      disabled={acting}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={indeferir}
                      disabled={acting}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded text-sm"
                    >
                      <XCircle className="h-4 w-4" />
                      Indeferir
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Dados do requerimento</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(data.dados || {}).map(([k, v]) => (
                  <div key={k} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">{k}</div>
                    <div className="text-sm text-gray-800 mt-1 break-words">
                      {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                    </div>
                  </div>
                ))}
              </div>

              {(!data.dados || Object.keys(data.dados).length === 0) && (
                <div className="text-gray-600">Este requerimento não possui dados adicionais.</div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}