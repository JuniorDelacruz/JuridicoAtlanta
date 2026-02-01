import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../utils/toast";
import { Plus, ArrowLeft, FileText, Eye, X } from "lucide-react";

/**
 * =========================================================
 * ✅ CONFIG DO SELECT (VOCÊ EDITA AQUI)
 * =========================================================
 * - label: texto no select
 * - value: valor salvo no DB
 * - allow: regras de visibilidade:
 *    - roles: lista de roles que podem ver
 *    - subRoles: lista de subRoles que podem ver
 *    - any: se true, qualquer um vê
 *
 * DICA: se quiser liberar pra “master” e “responsaveljuridico” SEMPRE,
 * coloca subRoles: ["master", "responsaveljuridico"] em cada opção,
 * ou trata no helper (já tratei).
 */
const LANCAMENTO_TIPOS = [
  {
    label: "Registro de Arma",
    value: "registro_arma",
    allow: { roles: ["escrivao", "tabeliao", "promotor", "conselheiro", "juiz"], subRoles: ["equipejuridico"] },
  },
  {
    label: "Troca de Nome",
    value: "troca_nome",
    allow: { roles: ["escrivao", "tabeliao", "conselheiro"], subRoles: ["equipejuridico"] },
  },
  {
    label: "Casamento",
    value: "casamento",
    allow: { roles: ["tabeliao", "conselheiro", "juiz"], subRoles: ["equipejuridico"] },
  },
  {
    label: "Despacho Interno",
    value: "despacho_interno",
    allow: { any: true }, // qualquer role pode ver
  },
  // 👇 adiciona mais opções aqui...
];

/**
 * =========================================================
 * HELPERS DE PERMISSÃO (role/subRole)
 * =========================================================
 */
const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function isHighSubRole(subRole) {
  const s = norm(subRole);
  return s === "master" || s === "responsaveljuridico";
}

function canSeeTipo(user, tipo) {
  // master/responsavel sempre vê tudo
  if (isHighSubRole(user?.subRole)) return true;

  const role = norm(user?.role);
  const sub = norm(user?.subRole);

  const allow = tipo?.allow || {};
  if (allow.any) return true;

  const roles = (allow.roles || []).map(norm);
  const subRoles = (allow.subRoles || []).map(norm);

  return (roles.length && roles.includes(role)) || (subRoles.length && subRoles.includes(sub));
}

function getTiposDisponiveis(user) {
  return LANCAMENTO_TIPOS.filter((t) => canSeeTipo(user, t));
}

/**
 * =========================================================
 * COMPONENTE PRINCIPAL
 * =========================================================
 */
export default function Lancamentos() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { push } = useToast();

  const [view, setView] = useState("home"); // home | meus | ver
  const [loading, setLoading] = useState(false);

  // meus lançamentos
  const [meus, setMeus] = useState([]);
  // todos lançamentos (visão geral)
  const [todos, setTodos] = useState([]);

  // modal add
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  // carregamento conforme view
  useEffect(() => {
    if (view === "meus") fetchMeus();
    if (view === "ver") fetchTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function fetchMeus() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/lancamentos/meus");
      setMeus(Array.isArray(data) ? data : []);
    } catch (err) {
      push({ type: "warning", title: "Erro", message: err?.response?.data?.msg || err.message });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTodos() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/lancamentos");
      setTodos(Array.isArray(data) ? data : []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        push({ type: "error", title: "Negado", message: "Você não tem permissão para ver lançamentos." });
        setView("home");
        return;
      }
      push({ type: "warning", title: "Erro", message: err?.response?.data?.msg || err.message });
    } finally {
      setLoading(false);
    }
  }

  const tiposDisponiveis = useMemo(() => getTiposDisponiveis(user), [user]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Lançamentos</h1>
              <div className="text-xs text-blue-200">
                {user?.username ? `Logado como ${user.username}` : "—"}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-grow max-w-7xl mx-auto w-full py-8 px-6">
        {/* HOME (quadros) */}
        {view === "home" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              title="Meus Lançamentos"
              icon={<FileText className="h-5 w-5" />}
              desc="Veja seus lançamentos e adicione novos."
              onClick={() => setView("meus")}
            />
            <Card
              title="Ver Lançamentos"
              icon={<Eye className="h-5 w-5" />}
              desc="Ver lançamentos gerais (somente com permissão)."
              onClick={() => setView("ver")}
            />
          </div>
        )}

        {/* MEUS */}
        {view === "meus" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Meus Lançamentos</h2>
                <p className="text-sm text-gray-500">Organizados por data (mais recentes primeiro).</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setView("home")}
                  className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium"
                >
                  Voltar
                </button>

                <button
                  onClick={() => setOpenAdd(true)}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>
            </div>

            <Box>
              {loading ? (
                <div className="py-10 text-center text-gray-500">Carregando...</div>
              ) : meus.length === 0 ? (
                <div className="py-10 text-center text-gray-500">Você ainda não tem lançamentos.</div>
              ) : (
                <TableLancamentos rows={meus} />
              )}
            </Box>
          </div>
        )}

        {/* VER */}
        {view === "ver" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Ver Lançamentos</h2>
                <p className="text-sm text-gray-500">Visão geral (permissões no backend).</p>
              </div>

              <button
                onClick={() => setView("home")}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium"
              >
                Voltar
              </button>
            </div>

            <Box>
              {loading ? (
                <div className="py-10 text-center text-gray-500">Carregando...</div>
              ) : todos.length === 0 ? (
                <div className="py-10 text-center text-gray-500">Nenhum lançamento encontrado.</div>
              ) : (
                <TableLancamentos rows={todos} />
              )}
            </Box>
          </div>
        )}
      </main>

      {/* Modal adicionar */}
      {openAdd && (
        <Modal onClose={() => setOpenAdd(false)} title="Novo Lançamento">
          <NovoLancamentoWizard
            user={user}
            tiposDisponiveis={tiposDisponiveis}
            onCancel={() => setOpenAdd(false)}
            onCreated={async () => {
              setOpenAdd(false);
              await fetchMeus();
            }}
          />
        </Modal>
      )}

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}

/**
 * =========================================================
 * COMPONENTES AUXILIARES
 * =========================================================
 */
function Card({ title, desc, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow p-6 text-left hover:shadow-md transition border border-gray-100"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-700">{icon}</div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{desc}</p>
    </button>
  );
}

function Box({ children }) {
  return <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">{children}</div>;
}

function TableLancamentos({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {r.data ? new Date(r.data).toLocaleString("pt-BR") : "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.tipo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {r.titulo || "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Wizard simples:
 * 1) Select Tipo (FILTRADO POR role/subRole)
 * 2) Título
 * 3) Descrição
 * 4) Salvar
 */
function NovoLancamentoWizard({ user, tiposDisponiveis, onCancel, onCreated }) {
  const { push } = useToast();
  const [step, setStep] = useState(1);

  const [tipo, setTipo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const canNext1 = !!tipo;

  async function salvar() {
    setSaving(true);
    try {
      await api.post("/api/lancamentos", {
        tipo,
        titulo,
        descricao,
        // data e createdBy o backend resolve (recomendado)
      });

      push({ type: "success", title: "Criado", message: "Lançamento criado com sucesso." });
      onCreated?.();
    } catch (err) {
      push({ type: "warning", title: "Erro", message: err?.response?.data?.msg || err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-500">
        Role: <b>{user?.role ?? "—"}</b> • SubRole: <b>{user?.subRole ?? "—"}</b>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-2">
          <div className="font-semibold text-gray-900">1) Selecione o tipo do lançamento</div>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="" disabled>
              Selecione...
            </option>

            {tiposDisponiveis.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {tiposDisponiveis.length === 0 && (
            <div className="text-sm text-red-600">
              Você não tem nenhum tipo de lançamento liberado. Configure no array <b>LANCAMENTO_TIPOS</b>.
            </div>
          )}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-2">
          <div className="font-semibold text-gray-900">2) Título</div>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Ex: Registro aprovado, despacho, etc..."
          />
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-2">
          <div className="font-semibold text-gray-900">3) Descrição</div>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[120px]"
            placeholder="Detalhes do lançamento..."
          />
        </div>
      )}

      {/* Footer wizard */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm">
          Cancelar
        </button>

        <div className="flex gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
            >
              Voltar
            </button>
          )}

          {step < 3 && (
            <button
              disabled={step === 1 && !canNext1}
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm"
            >
              Próximo
            </button>
          )}

          {step === 3 && (
            <button
              disabled={saving}
              onClick={salvar}
              className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
