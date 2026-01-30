import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  Search,
  Loader2,
  User,
  BadgeCheck,
  FileText,
  ShieldCheck,
  PenLine,
} from "lucide-react";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

const safe = (v) =>
  v === undefined || v === null || String(v).trim() === "" ? "—" : String(v);

function isLikelyIdCartorio(q) {
  const s = String(q || "").trim();
  if (!s) return false;
  if (/^\d+$/.test(s)) return true;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  )
    return true;
  return false;
}

export default function ConsultarCidadao() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [cidadao, setCidadao] = useState(null);
  const [vinculos, setVinculos] = useState(null);

  // ✅ mantém “pelo menos 1 numero” => 1 char já libera buscar
  const canSearch = useMemo(() => String(query || "").trim().length >= 1, [query]);

  // ===== Autocomplete =====
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestItems, setSuggestItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  async function fetchCidadaoAndVinculos() {
    const q = String(query || "").trim();
    if (!q) return;

    setLoading(true);
    setErr(null);
    setCidadao(null);
    setVinculos(null);

    try {
      const res = await axios.get(`${API_URL}/api/arquivos/cidadao`, {
        headers: authHeaders(),
        params: { query: q, mode: isLikelyIdCartorio(q) ? "id" : "nome" },
      });

      const c = res.data?.cidadao || null;
      if (!c) {
        setCidadao(null);
        setVinculos(null);
        return;
      }
      setCidadao(c);

      const cidadaoId = c.id || c.cidadaoId || c.cartorioId;
      const identidade = c.identidade;

      const res2 = await axios.get(`${API_URL}/api/arquivos/cidadao/vinculos`, {
        headers: authHeaders(),
        params: {
          cidadaoId: cidadaoId || undefined,
          identidade: identidade || undefined,
        },
      });

      setVinculos(res2.data || {});
    } catch (e) {
      setErr(e.response?.data?.msg || e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCidadaoAndVinculosById(cidadaoId, identidade) {
    if (!cidadaoId && !identidade) return;

    setLoading(true);
    setErr(null);
    setCidadao(null);
    setVinculos(null);

    try {
      // Ajuste aqui conforme seu backend aceitar:
      // - se não aceitar cidadaoId/identidade separados, troca por query/mode.
      const res = await axios.get(`${API_URL}/api/arquivos/cidadao`, {
        headers: authHeaders(),
        params: {
          cidadaoId: cidadaoId || undefined,
          identidade: identidade || undefined,
        },
      });

      const c = res.data?.cidadao || null;
      if (!c) {
        setCidadao(null);
        setVinculos(null);
        return;
      }
      setCidadao(c);

      const res2 = await axios.get(`${API_URL}/api/arquivos/cidadao/vinculos`, {
        headers: authHeaders(),
        params: {
          cidadaoId: c.id || cidadaoId || undefined,
          identidade: c.identidade || identidade || undefined,
        },
      });

      setVinculos(res2.data || {});
    } catch (e) {
      setErr(e.response?.data?.msg || e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!canSearch) return;
    setSuggestOpen(false);
    fetchCidadaoAndVinculos();
  }

  function onSelectSuggestion(item) {
    setSuggestOpen(false);
    setSuggestItems([]);
    setActiveIndex(-1);
    setQuery(item?.nomeCompleto || "");
    fetchCidadaoAndVinculosById(item?.id, item?.identidade);
  }

  // debounce do autocomplete
  useEffect(() => {
    const q = String(query || "").trim();

    // se for id, não sugere
    if (!q || q.length < 2 || isLikelyIdCartorio(q)) {
      setSuggestItems([]);
      setSuggestOpen(false);
      setActiveIndex(-1);
      return;
    }

    setSuggestLoading(true);

    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/arquivos/cidadao/suggest`, {
          headers: authHeaders(),
          params: { q, limit: 8 },
        });

        const items = res.data?.items || [];
        setSuggestItems(items);
        setSuggestOpen(items.length > 0);
        setActiveIndex(items.length ? 0 : -1);
      } catch {
        setSuggestItems([]);
        setSuggestOpen(false);
        setActiveIndex(-1);
      } finally {
        setSuggestLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Search className="h-7 w-7" />
            <h1 className="text-xl font-bold">Consultar Cidadão</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/arquivos")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <span className="text-sm font-medium">
              {user?.username || "Usuário Discord"}
            </span>
            <span className="text-sm bg-blue-700 px-3 py-1 rounded">
              Cargo: {user?.role || "-"}
            </span>

            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto py-8 px-6 w-full">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Search className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-bold text-gray-800">Busca</h2>
          </div>

          {/* ✅ BUSCA COM AUTOCOMPLETE */}
          <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-3 relative">
            <div className="flex-1 relative">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCidadao(null);
                  setVinculos(null);
                  setErr(null);
                }}
                onFocus={() => {
                  if (suggestItems.length > 0) setSuggestOpen(true);
                }}
                onBlur={() => {
                  // delay pra clicar na sugestão sem fechar antes
                  setTimeout(() => setSuggestOpen(false), 120);
                }}
                onKeyDown={(e) => {
                  if (!suggestOpen || suggestItems.length === 0) return;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((p) => Math.min(p + 1, suggestItems.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((p) => Math.max(p - 1, 0));
                  }
                  if (e.key === "Enter") {
                    if (activeIndex >= 0 && suggestItems[activeIndex]) {
                      e.preventDefault();
                      onSelectSuggestion(suggestItems[activeIndex]);
                    }
                  }
                  if (e.key === "Escape") {
                    setSuggestOpen(false);
                  }
                }}
                placeholder="Digite o nome do cidadão ou o ID do cartório..."
                className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* dropdown */}
              {suggestOpen && !isLikelyIdCartorio(query) && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                  <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b flex items-center justify-between">
                    <span>Sugestões</span>
                    {suggestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  </div>

                  {suggestItems.length === 0 ? (
                    <div className="p-3 text-sm text-gray-600">Nenhum resultado.</div>
                  ) : (
                    <div className="max-h-64 overflow-auto">
                      {suggestItems.map((it, idx) => {
                        const active = idx === activeIndex;
                        return (
                          <button
                            type="button"
                            key={it.id || `${it.nomeCompleto}-${idx}`}
                            onMouseDown={(ev) => ev.preventDefault()} // evita blur antes do click
                            onClick={() => onSelectSuggestion(it)}
                            className={`w-full text-left px-4 py-3 border-t hover:bg-gray-50 ${
                              active ? "bg-blue-50" : "bg-white"
                            }`}
                          >
                            <div className="text-sm font-semibold text-gray-900">
                              {safe(it.nomeCompleto)}
                            </div>
                            <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                              <span>
                                ID: <b>{safe(it.id)}</b>
                              </span>
                              <span>
                                Identidade: <b>{safe(it.identidade)}</b>
                              </span>
                              <span>
                                Status: <b>{safe(it.status)}</b>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSearch || loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {err && (
            <div className="mt-4 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
              <b>Erro:</b> {err}
            </div>
          )}

          {!loading && !err && !cidadao && (
            <div className="mt-4 text-sm text-gray-600">
              Digite ao menos <b>1 caractere</b> para buscar.
              <span className="block text-xs text-gray-500 mt-1">
                (Se digitar pelo menos 2 letras no nome, aparecem sugestões.)
              </span>
            </div>
          )}
        </div>

        {/* RESULTADOS */}
        {!loading && cidadao && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DADOS DO CIDADÃO */}
            <div className="bg-white rounded-xl shadow p-6 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <User className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-bold text-gray-800">Cidadão (Cartório)</h3>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <span className="text-gray-500">Nome:</span>{" "}
                  <b>{safe(cidadao.nomeCompleto)}</b>
                </div>
                <div>
                  <span className="text-gray-500">Identidade:</span>{" "}
                  <b>{safe(cidadao.identidade)}</b>
                </div>
                <div>
                  <span className="text-gray-500">ID Cartório:</span>{" "}
                  <b>{safe(cidadao.id)}</b>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{" "}
                  <span className="inline-flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                    <b>{safe(cidadao.status)}</b>
                  </span>
                </div>

                <div className="pt-2 border-t mt-3">
                  <div>
                    <span className="text-gray-500">Discord ID:</span>{" "}
                    <b>{safe(cidadao.discordId)}</b>
                  </div>
                  <div>
                    <span className="text-gray-500">Pombo:</span>{" "}
                    <b>{safe(cidadao.pombo)}</b>
                  </div>
                </div>
              </div>
            </div>

            {/* VÍNCULOS */}
            <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-bold text-gray-800">Vínculos do Cidadão</h3>
              </div>

              {!vinculos ? (
                <div className="text-sm text-gray-600">
                  Nenhum vínculo carregado (backend pode não estar retornando ainda).
                </div>
              ) : (
                <div className="space-y-4">
                  <VinculoSection
                    title="Porte de Armas"
                    icon={ShieldCheck}
                    items={vinculos.portes || vinculos.porteArmas || []}
                    emptyText="Nenhum porte encontrado."
                    renderItem={(it) => (
                      <VinculoRow
                        left={`#${safe(it.numero || it.id)}`}
                        mid={`Status: ${safe(it.status)}`}
                        right={`Validade: ${safe(it.validade)}`}
                      />
                    )}
                  />

                  <VinculoSection
                    title="Troca de Nome"
                    icon={PenLine}
                    items={vinculos.trocasNome || vinculos.trocaNome || []}
                    emptyText="Nenhuma troca de nome encontrada."
                    renderItem={(it) => (
                      <VinculoRow
                        left={`#${safe(it.numero || it.id)}`}
                        mid={`Status: ${safe(it.status)}`}
                        right={`Novo nome: ${safe(it.novoNome || it.nomeNovo)}`}
                      />
                    )}
                  />

                  {Array.isArray(vinculos.requerimentos) && (
                    <VinculoSection
                      title="Outros Requerimentos"
                      icon={FileText}
                      items={vinculos.requerimentos}
                      emptyText="Nenhum requerimento adicional encontrado."
                      renderItem={(it) => (
                        <VinculoRow
                          left={`#${safe(it.numero || it.id)}`}
                          mid={`Tipo: ${safe(it.tipo)}`}
                          right={`Status: ${safe(it.status)}`}
                        />
                      )}
                    />
                  )}
                </div>
              )}

              <div className="mt-6 text-xs text-gray-500">
                * Aqui você pluga novas sections (antecedentes, multas, processos, etc).
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-3">
            <Link to="/codigo-etica" className="hover:text-white underline-offset-4 hover:underline">
              Código de Ética
            </Link>
            <Link to="/manual-advogado" className="hover:text-white underline-offset-4 hover:underline">
              Manual do Advogado
            </Link>
            <Link to="/diretrizes-tribunal" className="hover:text-white underline-offset-4 hover:underline">
              Diretrizes do Tribunal
            </Link>
            <Link to="/codigo-penal" className="hover:text-white underline-offset-4 hover:underline">
              Código Penal
            </Link>
          </div>

          <p className="text-sm">
            © {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}

/** ======= COMPONENTES AUX ======= */

function VinculoSection({ title, icon: Icon, items, emptyText, renderItem }) {
  const arr = Array.isArray(items) ? items : [];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
        {Icon ? <Icon className="h-4 w-4 text-blue-700" /> : null}
        <div className="font-semibold text-gray-800">{title}</div>
        <div className="ml-auto text-xs text-gray-500">{arr.length} registro(s)</div>
      </div>

      <div className="p-4">
        {arr.length === 0 ? (
          <div className="text-sm text-gray-600">{emptyText}</div>
        ) : (
          <div className="space-y-2">
            {arr.map((it, idx) => (
              <div key={idx}>{renderItem(it)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VinculoRow({ left, mid, right }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border border-gray-200 rounded-lg p-3">
      <div className="text-sm font-semibold text-gray-900">{left}</div>
      <div className="text-sm text-gray-700">{mid}</div>
      <div className="text-sm text-gray-600 sm:ml-auto">{right}</div>
    </div>
  );
}