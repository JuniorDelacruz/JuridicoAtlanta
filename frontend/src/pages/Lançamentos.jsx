import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../utils/toast";
import { Plus, ArrowLeft, FileText, Eye, X, Users } from "lucide-react";

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
 */
const LANCAMENTO_TIPOS = [
  {
    label: "Registro de Arma",
    value: "registro_arma",
    allow: {
      roles: ["escrivao", "tabeliao", "promotor", "conselheiro", "juiz"],
      subRoles: ["equipejuridico"],
    },
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
    allow: { any: true },
  },
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
 * MONEY HELPERS
 * =========================================================
 */
function parseMoneyToCents(v) {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function fmtBRLFromCents(cents) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

  const [view, setView] = useState("home");
  // home | meus | ver | membros | membro
  const [tabVer, setTabVer] = useState("pendentes"); // pendentes | pagos
  const [membros, setMembros] = useState([]);
  const [membroSelecionado, setMembroSelecionado] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const [meus, setMeus] = useState([]);
  const [todos, setTodos] = useState([]);

  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  // carregamento conforme view
  useEffect(() => {
    if (view === "meus") fetchMeus();

    if (view === "ver") {
      fetchTodosFiltrado({ paid: tabVer === "pagos" ? 1 : 0 });
    }

    if (view === "membros") fetchMembros();

    if (view === "membro" && membroSelecionado?.id) {
      fetchTodosFiltrado({
        paid: tabVer === "pagos" ? 1 : 0,
        createdBy: membroSelecionado.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // recarrega quando muda a tab ou troca membro selecionado
  useEffect(() => {
    if (view === "ver") {
      fetchTodosFiltrado({ paid: tabVer === "pagos" ? 1 : 0 });
    }
    if (view === "membro" && membroSelecionado?.id) {
      fetchTodosFiltrado({
        paid: tabVer === "pagos" ? 1 : 0,
        createdBy: membroSelecionado.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabVer, membroSelecionado?.id]);

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

  async function fetchMembros() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/lancamentos/membros-juridico");
      setMembros(Array.isArray(data) ? data : []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        push({ type: "error", title: "Negado", message: "Você não tem permissão." });
        setView("home");
        return;
      }
      push({ type: "warning", title: "Erro", message: err?.response?.data?.msg || err.message });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTodosFiltrado({ paid, createdBy } = {}) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (paid === 0) params.set("paid", "0");
      if (paid === 1) params.set("paid", "1");
      if (createdBy) params.set("createdBy", String(createdBy));

      const { data } = await api.get(`/api/lancamentos?${params.toString()}`);
      setTodos(Array.isArray(data) ? data : []);
      setSelectedIds([]);
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

  async function registrarRepasse(ids) {
    try {
      const { data } = await api.post("/api/lancamentos/registrar-repasse", { ids });
      push({
        type: "success",
        title: "OK",
        message: `${data?.updatedCount || 0} lançamento(s) marcados como pagos.`,
      });

      if (view === "ver") {
        await fetchTodosFiltrado({ paid: tabVer === "pagos" ? 1 : 0 });
      }
      if (view === "membro" && membroSelecionado?.id) {
        await fetchTodosFiltrado({
          paid: tabVer === "pagos" ? 1 : 0,
          createdBy: membroSelecionado.id,
        });
      }
    } catch (err) {
      push({ type: "warning", title: "Erro", message: err?.response?.data?.msg || err.message });
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
        {/* HOME */}
        {view === "home" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              title="Meus Lançamentos"
              icon={<FileText className="h-5 w-5" />}
              desc="Veja seus lançamentos e adicione novos."
              onClick={() => setView("meus")}
            />
            <Card
              title="Ver Lançamentos"
              icon={<Eye className="h-5 w-5" />}
              desc="Visão geral (somente com permissão)."
              onClick={() => {
                setTabVer("pendentes");
                setView("ver");
              }}
            />
            <Card
              title="Membros Jurídico"
              icon={<Users className="h-5 w-5" />}
              desc="Clique em um membro para ver os lançamentos dele."
              onClick={() => setView("membros")}
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
                <TableLancamentosMeus rows={meus} />
              )}
            </Box>
          </div>
        )}

        {/* MEMBROS */}
        {view === "membros" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Membros do Jurídico</h2>
                <p className="text-sm text-gray-500">Clique em um membro para ver os lançamentos dele.</p>
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
              ) : membros.length === 0 ? (
                <div className="py-10 text-center text-gray-500">Nenhum membro encontrado.</div>
              ) : (
                <div className="divide-y">
                  {membros.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMembroSelecionado(m);
                        setSelectedIds([]);
                        setTabVer("pendentes");
                        setView("membro");
                      }}
                      className="w-full text-left px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="font-semibold text-gray-900">{m.nomeCompleto || m.username}</div>
                      <div className="text-xs text-gray-500">
                        @{m.username} • role: {m.role || "—"} • subRole: {m.subRole || "—"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Box>
          </div>
        )}

        {/* VER (GERAL) */}
        {view === "ver" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Lançamentos (Geral)</h2>
                <p className="text-sm text-gray-500">Pendentes e pagos em abas separadas.</p>
              </div>

              <button
                onClick={() => setView("home")}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium"
              >
                Voltar
              </button>
            </div>

            <LancamentosTabs tab={tabVer} setTab={setTabVer} />

            <Box>
              <LancamentosResumo rows={todos} />

              <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  Selecionados: <b>{selectedIds.length}</b>
                </div>

                {tabVer === "pendentes" && (
                  <button
                    disabled={selectedIds.length === 0}
                    onClick={() => registrarRepasse(selectedIds)}
                    className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium"
                  >
                    Registrar repasse
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-10 text-center text-gray-500">Carregando...</div>
              ) : todos.length === 0 ? (
                <div className="py-10 text-center text-gray-500">Nenhum lançamento encontrado.</div>
              ) : (
                <TableLancamentosGeral
                  rows={todos}
                  tab={tabVer}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                />
              )}
            </Box>
          </div>
        )}

        {/* MEMBRO (LANÇAMENTOS DO MEMBRO) */}
        {view === "membro" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Lançamentos — {membroSelecionado?.nomeCompleto || membroSelecionado?.username || "Membro"}
                </h2>
                <p className="text-sm text-gray-500">Filtrado por membro.</p>
              </div>

              <button
                onClick={() => setView("membros")}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium"
              >
                Voltar
              </button>
            </div>

            <LancamentosTabs tab={tabVer} setTab={setTabVer} />

            <Box>
              <LancamentosResumo rows={todos} />

              <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  Selecionados: <b>{selectedIds.length}</b>
                </div>

                {tabVer === "pendentes" && (
                  <button
                    disabled={selectedIds.length === 0}
                    onClick={() => registrarRepasse(selectedIds)}
                    className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium"
                  >
                    Registrar repasse
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-10 text-center text-gray-500">Carregando...</div>
              ) : todos.length === 0 ? (
                <div className="py-10 text-center text-gray-500">Nenhum lançamento encontrado.</div>
              ) : (
                <TableLancamentosGeral
                  rows={todos}
                  tab={tabVer}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                />
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

function LancamentosTabs({ tab, setTab }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTab("pendentes")}
        className={`px-4 py-2 rounded-md text-sm font-medium ${
          tab === "pendentes" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
        }`}
      >
        Pendentes
      </button>
      <button
        onClick={() => setTab("pagos")}
        className={`px-4 py-2 rounded-md text-sm font-medium ${
          tab === "pagos" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
        }`}
      >
        Pagos
      </button>
    </div>
  );
}

function LancamentosResumo({ rows }) {
  const total = rows.reduce((a, r) => a + (r.valorTotalCents || 0), 0);
  const repAdv = rows.reduce((a, r) => a + (r.repasseAdvogadoCents || 0), 0);
  const repJur = rows.reduce((a, r) => a + (r.repasseJuridicoCents || 0), 0);

  return (
    <div className="px-6 py-4 border-b bg-white">
      <div className="text-sm text-gray-600">Totais dos lançamentos listados:</div>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-500">Valor Total</div>
          <div className="font-bold">{fmtBRLFromCents(total)}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-500">Repasse Advogado</div>
          <div className="font-bold">{fmtBRLFromCents(repAdv)}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-500">Repasse Jurídico</div>
          <div className="font-bold">{fmtBRLFromCents(repJur)}</div>
        </div>
      </div>
    </div>
  );
}

function TableLancamentosMeus({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Req</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valores</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {r.data ? new Date(r.data).toLocaleString("pt-BR") : "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.requerimentoNumero || "—"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.tipo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{r.titulo || "—"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <div>Total: <b>{fmtBRLFromCents(r.valorTotalCents)}</b></div>
                <div>Adv: {fmtBRLFromCents(r.repasseAdvogadoCents)}</div>
                <div>Jur: {fmtBRLFromCents(r.repasseJuridicoCents)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.pagoEm ? "PAGO" : "PENDENTE"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableLancamentosGeral({ rows, tab, selectedIds, setSelectedIds }) {
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  function toggleAll() {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(rows.map((r) => r.id));
  }

  function toggleOne(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {tab === "pendentes" && (
              <th className="px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Req</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advogado</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valores</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            {tab === "pagos" && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago por</th>
            )}
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              {tab === "pendentes" && (
                <td className="px-4 py-4">
                  <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleOne(r.id)} />
                </td>
              )}

              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {r.data ? new Date(r.data).toLocaleString("pt-BR") : "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.requerimentoNumero || "—"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.solicitanteNome || "—"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.advogadoNome || "—"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.tipo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <div>Total: <b>{fmtBRLFromCents(r.valorTotalCents)}</b></div>
                <div>Adv: {fmtBRLFromCents(r.repasseAdvogadoCents)}</div>
                <div>Jur: {fmtBRLFromCents(r.repasseJuridicoCents)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.pagoEm ? "PAGO" : "PENDENTE"}</td>

              {tab === "pagos" && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div>{r.pagoPorNome || "—"}</div>
                  <div className="text-xs text-gray-500">
                    {r.pagoEm ? new Date(r.pagoEm).toLocaleString("pt-BR") : ""}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Wizard:
 * 1) Tipo
 * 2) Requerimento
 * 3) Título/Descrição
 * 4) Valores + Salvar
 */
function NovoLancamentoWizard({ user, tiposDisponiveis, onCancel, onCreated }) {
  const { push } = useToast();
  const [step, setStep] = useState(1);

  const [tipo, setTipo] = useState("");
  const [requerimentoNumero, setRequerimentoNumero] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const [valorTotal, setValorTotal] = useState("");
  const [repasseAdvogado, setRepasseAdvogado] = useState("");

  const [saving, setSaving] = useState(false);

  const canNext1 = !!tipo;
  const canNext2 = !!String(requerimentoNumero || "").trim();

  const totalCents = parseMoneyToCents(valorTotal);
  const repAdvCents = parseMoneyToCents(repasseAdvogado);
  const repJurCents = Math.max(0, totalCents - repAdvCents);

  const canSave =
    totalCents > 0 &&
    repAdvCents >= 0 &&
    repAdvCents <= totalCents &&
    !!String(requerimentoNumero || "").trim() &&
    !!tipo;

  async function salvar() {
    setSaving(true);
    try {
      await api.post("/api/lancamentos", {
        tipo,
        titulo,
        descricao,
        requerimentoNumero,
        valorTotal,
        repasseAdvogado,
      });

      push({ type: "success", title: "Criado", message: "Lançamento criado e vinculado ao requerimento." });
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
          <div className="font-semibold text-gray-900">2) Vincular ao Requerimento</div>
          <input
            value={requerimentoNumero}
            onChange={(e) => setRequerimentoNumero(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Número do Requerimento (ID)"
          />
          <div className="text-xs text-gray-500">
            Esse lançamento ficará vinculado ao requerimento informado. Se já existir vínculo, o backend bloqueia.
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="font-semibold text-gray-900">3) Detalhes</div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Título</div>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Ex: Registro aprovado, despacho, etc..."
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Descrição</div>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[120px]"
              placeholder="Detalhes do lançamento..."
            />
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-3">
          <div className="font-semibold text-gray-900">4) Valores</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-medium text-gray-700">Valor total do serviço</div>
              <input
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Ex: 1000,00"
              />
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Repasse do advogado</div>
              <input
                value={repasseAdvogado}
                onChange={(e) => setRepasseAdvogado(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Ex: 600,00"
              />
            </div>
          </div>

          <div className="text-sm text-gray-700">
            Repasse do Jurídico (calculado): <b>{fmtBRLFromCents(repJurCents)}</b>
          </div>

          {repAdvCents > totalCents && (
            <div className="text-sm text-red-600">Repasse do advogado não pode ser maior que o valor total.</div>
          )}
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

          {step < 4 && (
            <button
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm"
            >
              Próximo
            </button>
          )}

          {step === 4 && (
            <button
              disabled={saving || !canSave}
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
