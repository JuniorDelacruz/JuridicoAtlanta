// frontend/src/pages/triagem/TriagemAlvaraDetalhes.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { getTriagemTipoBySlug } from "../../config/triagemTipos";
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
  Building2,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

const PERM_TRIAGEM_ALVARA = "triagem.acessar.alvara"; // ✅ perm específica do alvará

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

function buildFileUrl(v) {
  if (!v) return null;
  const s = String(v);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${API_URL}${s}`;
  return s;
}

function bytesToSize(bytes = 0) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = n;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export default function TriagemAlvaraDetalhes() {
  const { slug, numero } = useParams();
  const triagemCfg = getTriagemTipoBySlug(slug);

  const { user, logout, isAuthenticated, hasPerm } = useAuth();
  const navigate = useNavigate();

  const isEquipeJuridica = user?.subRole === "equipejuridico";

  // ✅ perm SOMENTE do alvará
  const permitido = useMemo(() => {
    if (!triagemCfg) return false;

    return !!hasPerm?.(PERM_TRIAGEM_ALVARA);
    
  }, [triagemCfg, user?.role, isEquipeJuridica, hasPerm]);

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

    // ✅ bloqueia sem perm
    if (!permitido) {
      alert("Acesso negado. Você não tem permissão para ver detalhes de triagem (Alvará).");
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

        // ✅ garante que é ALVARÁ mesmo
        const expectedTipo = "Emitir Alvará"; // ajuste se seu DB tiver outro texto
        if (res.data?.tipo !== expectedTipo) {
          setError("Este requerimento não é do tipo Emitir Alvará.");
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
  }, [isAuthenticated, permitido, navigate, numero]);

  async function aprovar() {
    if (!confirm("Tem certeza que deseja APROVAR este requerimento de Alvará?")) return;
    setActing(true);
    try {
      await axios.patch(
        `${API_URL}/api/triagem/requerimentos/${numero}/aprovar`,
        {},
        { headers: authHeaders() }
      );
      alert("Requerimento aprovado!");
      voltar();
    } catch (err) {
      alert("Erro ao aprovar: " + (err.response?.data?.msg || err.message));
    } finally {
      setActing(false);
    }
  }

  async function indeferir() {
    if (!confirm("Tem certeza que deseja INDEFERIR este requerimento de Alvará?")) return;
    setActing(true);
    try {
      await axios.patch(
        `${API_URL}/api/triagem/requerimentos/${numero}/indeferir`,
        {},
        { headers: authHeaders() }
      );
      alert("Requerimento indeferido!");
      voltar();
    } catch (err) {
      alert("Erro ao indeferir: " + (err.response?.data?.msg || err.message));
    } finally {
      setActing(false);
    }
  }

  const statusConfig = {
    AGUARDANDO_CARIMBO: { color: "bg-indigo-100 text-indigo-800", icon: FileText },
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

  const infoEmpresa = useMemo(() => {
    return [
      { label: "Razão Social", value: dados?.razaosocial },
      { label: "Setor", value: dados?.setor },
      { label: "Estado", value: dados?.nomeEstado },
      { label: "Cidade", value: dados?.cidade },
      { label: "Número Identificação (Cartório)", value: dados?.numeroIdentificacao },
    ];
  }, [dados]);

  const imagens = useMemo(() => {
    return [
      {
        key: "fotoNomeEmpresaMapa",
        titulo: "Localização no mapa (nome visível)",
        url: buildFileUrl(dados?.fotoNomeEmpresaMapaUrl),
        meta: dados?.uploads?.fotoNomeEmpresaMapa,
      },
      {
        key: "fotoFachada",
        titulo: "Fachada da empresa",
        url: buildFileUrl(dados?.fotoFachadaUrl),
        meta: dados?.uploads?.fotoFachada,
      },
      {
        key: "fotoInv",
        titulo: "Inventário da loja",
        url: buildFileUrl(dados?.fotoInvUrl),
        meta: dados?.uploads?.fotoInv,
      },
    ].filter((x) => x.url);
  }, [dados]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <h1 className="text-xl font-bold">Triagem — Detalhes (Alvará)</h1>
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
              <div className="p-6 border-b flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Requerimento #{data.numero} — Emitir Alvará
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

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-5 lg:col-span-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 inline-flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Empresa
                  </h3>

                  <div className="space-y-3 text-sm">
                    {infoEmpresa.map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-4">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-medium text-gray-800 text-right">{item.value ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-5 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 inline-flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" /> Fotos (Uploads)
                  </h3>

                  {imagens.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {imagens.map((img) => (
                        <div key={img.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{img.titulo}</p>
                              <p className="text-xs text-gray-500 mt-1 break-all">
                                {img.meta?.originalName ? (
                                  <>
                                    {img.meta.originalName} • {bytesToSize(img.meta.size)} •{" "}
                                    {img.meta.mimetype || "—"}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </p>
                            </div>

                            <a
                              href={img.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900"
                              title="Abrir imagem"
                            >
                              <ExternalLink className="h-4 w-4" /> Abrir
                            </a>
                          </div>

                          <div className="mt-3">
                            <img
                              src={img.url}
                              alt={img.titulo}
                              className="w-full max-h-72 object-contain rounded-md border border-gray-200 bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm">Nenhuma imagem disponível neste requerimento.</div>
                  )}
                </div>

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
