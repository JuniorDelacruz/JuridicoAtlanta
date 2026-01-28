// frontend/src/pages/RequerimentoDetalhes.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
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
import { getTipoBySlug } from "../../config/requerimentosTipos";

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

export default function RequerimentoDetalhes() {
  const { id, slug } = useParams();
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const tipoCfg = getTipoBySlug(slug);

  const [requerimento, setRequerimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchRequerimento = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(`${API_URL}/api/requerimentos/${id}`, {
          headers: authHeaders(),
        });

        setRequerimento(res.data);
      } catch (err) {
        setError(
          "Erro ao carregar detalhes do requerimento: " +
            (err.response?.data?.msg || err.message)
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRequerimento();
  }, [id, isAuthenticated, navigate]);

  const statusConfig = {
    PENDENTE: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
    APROVADO: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    INDEFERIDO: { color: "bg-red-100 text-red-800", icon: XCircle },
  };
  const StatusBadge =
    (requerimento && statusConfig[requerimento.status]) || {
      color: "bg-gray-100 text-gray-800",
      icon: FileText,
    };

  const dados = requerimento?.dados || {};
  const cidadao = dados?.cidadao || null;

  // monta uma lista “bonita” dos campos do tipo (se existir config)
  const camposDoTipo = useMemo(() => {
    if (!tipoCfg?.fields?.length) return [];
    return tipoCfg.fields.map((f) => ({
      label: f.label,
      name: f.name,
      value: dados?.[f.name],
    }));
  }, [tipoCfg, dados]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Carregando detalhes...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        {error}
      </div>
    );
  if (!requerimento)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Requerimento não encontrado
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <h1 className="text-xl font-bold">
              Detalhes do Requerimento #{requerimento.numero}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/requerimentos/${slug}`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Requerimentos
            </button>
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
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Cabeçalho */}
          <div className="p-6 border-b flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {requerimento.tipo}
              </h2>
              <p className="text-gray-600 mt-1">
                Solicitante: <span className="font-medium">{requerimento.solicitante || "—"}</span>
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Criado em:{" "}
                {new Date(requerimento.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>

            <div
              className={`px-4 py-2 rounded-full ${StatusBadge.color} inline-flex items-center gap-2 self-start`}
            >
              <StatusBadge.icon className="h-5 w-5" />
              <span className="font-medium">{requerimento.status}</span>
            </div>
          </div>

          {/* Corpo */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Informações Gerais */}
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Informações gerais
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">Número</span>
                  <span className="font-medium text-gray-800">
                    {requerimento.numero}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">Tipo</span>
                  <span className="font-medium text-gray-800">
                    {requerimento.tipo}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium text-gray-800">
                    {requerimento.status}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">Criado por (ID)</span>
                  <span className="font-medium text-gray-800">
                    {requerimento.userId ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna 2: Dados do Requerimento (bonito) */}
            <div className="bg-white border rounded-lg p-5 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Dados do requerimento
              </h3>

              {camposDoTipo.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {camposDoTipo.map((c) => (
                    <div
                      key={c.name}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
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
                  <span className="font-medium">{slug}</span>). Vou exibir o JSON
                  abaixo.
                </div>
              )}

              {/* JSON cru opcional */}
              <button
                onClick={() => setShowRaw((p) => !p)}
                className="mt-5 inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900"
              >
                {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showRaw ? "Ocultar JSON bruto" : "Ver JSON bruto (debug)"}
              </button>

              {showRaw && (
                <div className="mt-3 bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(requerimento.dados, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Anexo Cartório */}
            <div className="bg-white border rounded-lg p-5 lg:col-span-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Dados do cartório (anexo)
              </h3>

              {cidadao ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <User className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Nome completo</p>
                      <p className="text-sm font-medium text-gray-800">
                        {cidadao.nomeCompleto || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <IdCard className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Identidade</p>
                      <p className="text-sm font-medium text-gray-800">
                        {cidadao.identidade || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <ShieldCheck className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Status do cadastro</p>
                      <p className="text-sm font-medium text-gray-800">
                        {cidadao.status || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <Briefcase className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Profissão</p>
                      <p className="text-sm font-medium text-gray-800">
                        {cidadao.profissao || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50 md:col-span-2">
                    <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Residência</p>
                      <p className="text-sm font-medium text-gray-800">
                        {cidadao.residencia || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <User className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Discord ID</p>
                      <p className="text-sm font-medium text-gray-800">
                        {cidadao.discordId || "—"}
                      </p>
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

        {/* Ações */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => navigate(`/requerimentos/${slug}`)}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-md"
          >
            Voltar
          </button>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>
          © {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos
          reservados
        </p>
      </footer>
    </div>
  );
}