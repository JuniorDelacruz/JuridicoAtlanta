import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { getTipoBySlug } from "../../config/requerimentosTipos";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  User,
  IdCard,
  MapPin,
  Briefcase,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

function formatValue(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

export default function TriagemRequerimentoDetalhes() {
  const { slug, numero } = useParams();
  const tipoCfg = getTipoBySlug(slug);

  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isEquipeJuridica = user?.subRole === "equipejuridico";
  const allowedTriagemRoles = ["juiz", "promotor", "promotor Chefe", "tabeliao", "escrivao", "admin"];

  const permitido = useMemo(() => {
    return allowedTriagemRoles.includes(user?.role) || isEquipeJuridica;
  }, [user?.role, isEquipeJuridica]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

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

  const statusConfig = {
    PENDENTE: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
    APROVADO: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    INDEFERIDO: { color: "bg-red-100 text-red-800", icon: XCircle },
  };

  const StatusBadge =
    (data && statusConfig[data.status]) || {
      color: "bg-gray-100 text-gray-800",
      icon: FileText,
    };

  const dados = data?.dados || {};
  const cidadao = dados?.cidadao || null;

  const camposDoTipo = useMemo(() => {
    if (!tipoCfg?.fields?.length) return [];
    return tipoCfg.fields.map((f) => ({
      label: f.label,
      name: f.name,
      value: dados?.[f.name],
    }));
  }, [tipoCfg, dados]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
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
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto py-8 px-6 w-full">
        {loading ? (
          <div className="text-center py-12 text-gray-600">Carregando detalhes...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : !data ? (
          <div className="text-center py-12 text-gray-600">Nada para exibir.</div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {/* Cabeçalho */}
              <div className="p-6 border-b flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Requerimento #{data.numero} — {tipoCfg?.label || data.tipo}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Solicitante: <span className="font-medium">{data.solicitante || "—"}</span>
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Criado em: {new Date(data.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3 self-start">
                  <div className={`px-4 py-2 rounded-full ${StatusBadge.color} inline-flex items-center gap-2`}>
                    <StatusBadge.icon className="h-5 w-5" />
                    <span className="font-medium">{data.status}</span>
                  </div>

                  {data.status === "PENDENTE" && (
                    <div className="flex gap-2">
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
                    </div>
                  )}
                </div>
              </div>

              {/* Corpo */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna 1: Informações Gerais */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações gerais</h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-gray-500">Número</span>
                      <span className="font-medium text-gray-800">{data.numero}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-gray-500">Tipo</span>
                      <span className="font-medium text-gray-800">{data.tipo}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium text-gray-800">{data.status}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-gray-500">Criado por (ID)</span>
                      <span className="font-medium text-gray-800">{data.userId ?? "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Dados do Requerimento (bonito) */}
                <div className="bg-white border rounded-lg p-5 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Dados do requerimento</h3>

                  {camposDoTipo.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {camposDoTipo.map((c) => (
                        <div key={c.name} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                          <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">
                            {formatValue(c.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm">
                      Não há configuração de campos para este tipo (slug:{" "}
                      <span className="font-medium">{slug}</span>). Vou exibir o JSON abaixo.
                    </div>
                  )}

                  <button
                    onClick={() => setShowRaw((p) => !p)}
                    className="mt-5 inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900"
                  >
                    {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showRaw ? "Ocultar JSON bruto" : "Ver JSON bruto (debug)"}
                  </button>

                  {showRaw && (
                    <div className="mt-3 bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data.dados, null, 2)}</pre>
                    </div>
                  )}
                </div>

                {/* Anexo Cartório */}
                <div className="bg-white border rounded-lg p-5 lg:col-span-3">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Dados do cartório (anexo)</h3>

                  {cidadao ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <User className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Nome completo</p>
                          <p className="text-sm font-medium text-gray-800">{cidadao.nomeCompleto || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <IdCard className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Identidade</p>
                          <p className="text-sm font-medium text-gray-800">{cidadao.identidade || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <ShieldCheck className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Status do cadastro</p>
                          <p className="text-sm font-medium text-gray-800">{cidadao.status || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <Briefcase className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Profissão</p>
                          <p className="text-sm font-medium text-gray-800">{cidadao.profissao || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50 md:col-span-2">
                        <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Residência</p>
                          <p className="text-sm font-medium text-gray-800">{cidadao.residencia || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <User className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Discord ID</p>
                          <p className="text-sm font-medium text-gray-800">{cidadao.discordId || "—"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm">
                      Este requerimento não possui anexo do cartório (dados.cidadao).
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button onClick={voltar} className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-md">
                Voltar
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}