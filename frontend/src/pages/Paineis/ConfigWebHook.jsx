// frontend/src/pages/WebhookConfig.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import {
  Webhook,
  Settings,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  Search,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

/**
 * Tipos oficiais (mesmos do backend)
 */
const WEBHOOK_TYPES = [
  { key: "cadastroCidadao", label: "Cadastro de Cidadão" },
  { key: "porteArma", label: "Porte de Arma" },
  { key: "registroArma", label: "Registro de Arma" },
  { key: "trocaNome", label: "Troca de Nome" },
  { key: "casamento", label: "Casamento" },
  { key: "divorcio", label: "Divórcio" },
  { key: "limpezaFicha", label: "Limpeza de Ficha" },
  { key: "porteSuspenso", label: "Porte Suspenso" },
  { key: "alvara", label: "Alvará" },
  { key: "carimboPorteArma", label: "Carimbo do Porte de Arma" },
];

function isValidWebhookUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function typeLabel(tipo) {
  const found = WEBHOOK_TYPES.find((t) => t.key === tipo);
  return found ? found.label : tipo;
}

export default function WebhookConfig() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  // modal
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null); // {id,...} | null

  // form
  const [tipo, setTipo] = useState(WEBHOOK_TYPES[0]?.key || "");
  const [customTipo, setCustomTipo] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // {type:'ok'|'err', text:''}

  // ===== permissão =====
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Ajuste os roles como quiser (aqui deixei restrito)
    const allowedRoles = ["admin", "juiz", "admin"];
    if (!allowedRoles.includes(user.role)) {
      alert("Acesso negado. Você não tem permissão para configurar Webhooks.");
      navigate("/dashboard");
      return;
    }
  }, [isAuthenticated, user.role, navigate]);

  const tipoFinal = useMemo(() => {
    return useCustom ? (customTipo || "").trim() : tipo;
  }, [useCustom, customTipo, tipo]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => String(i.tipo || "").toLowerCase().includes(term));
  }, [items, q]);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  async function load() {
    setLoading(true);
    setToast(null);
    try {
      // esperado: [{ id, tipo, url, enabled, createdAt, updatedAt }]
      const res = await axios.get(`${API_URL}/api/webhooks`, {
        headers: authHeaders(),
      });
      const data = res.data;
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setToast({
        type: "err",
        text: err.response?.data?.msg || err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  function resetForm() {
    setEditing(null);
    setTipo(WEBHOOK_TYPES[0]?.key || "");
    setUseCustom(false);
    setCustomTipo("");
    setUrl("");
    setEnabled(true);
  }

  function openCreate() {
    resetForm();
    setOpenModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    const known = WEBHOOK_TYPES.some((t) => t.key === row.tipo);
    setUseCustom(!known);
    setTipo(known ? row.tipo : WEBHOOK_TYPES[0]?.key || "");
    setCustomTipo(known ? "" : row.tipo);
    setUrl(row.url || "");
    setEnabled(Boolean(row.enabled));
    setOpenModal(true);
    setToast(null);
  }

  function closeModal() {
    setOpenModal(false);
    resetForm();
  }

  async function onSubmit(e) {
    e.preventDefault();
    setToast(null);

    if (!tipoFinal) {
      setToast({ type: "err", text: "Informe o tipo do webhook." });
      return;
    }
    if (!url || !isValidWebhookUrl(url)) {
      setToast({ type: "err", text: "Informe uma URL válida." });
      return;
    }

    setSaving(true);
    try {
      const payload = { tipo: tipoFinal, url: url.trim(), enabled };

      if (editing?.id) {
        await axios.put(`${API_URL}/api/webhooks/${editing.id}`, payload, {
          headers: authHeaders(),
        });
        setToast({ type: "ok", text: "Webhook atualizado com sucesso." });
      } else {
        await axios.post(`${API_URL}/api/webhooks`, payload, {
          headers: authHeaders(),
        });
        setToast({ type: "ok", text: "Webhook criado com sucesso." });
      }

      await load();
      closeModal();
    } catch (err) {
      setToast({
        type: "err",
        text: err.response?.data?.msg || err.response?.data?.message || err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row) {
    const ok = confirm(`Deletar o webhook do tipo "${row.tipo}"? Isso não tem volta.`);
    if (!ok) return;

    setToast(null);
    try {
      await axios.delete(`${API_URL}/api/webhooks/${row.id}`, {
        headers: authHeaders(),
      });
      setToast({ type: "ok", text: "Webhook deletado." });
      await load();
    } catch (err) {
      setToast({
        type: "err",
        text: err.response?.data?.msg || err.response?.data?.message || err.message,
      });
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8" />
            <h1 className="text-xl font-bold">Configuração de Webhooks - Jurídico Atlanta RP</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </button>

            <span className="text-sm">Bem-vindo, {user.username || "Usuário"}</span>

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
      <main className="flex-grow max-w-7xl mx-auto py-8 px-6 w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-3 text-center">Configurar Webhooks</h2>

        <p className="text-center text-gray-600 mb-8 max-w-3xl mx-auto">
          Aqui você define para qual webhook do Discord cada tipo de requerimento vai notificar.
          Você pode ativar/desativar e trocar URLs sem mexer no código.
        </p>

        {/* Toast */}
        {toast?.type === "err" && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
            <b>Erro:</b> {toast.text}
          </div>
        )}
        {toast?.type === "ok" && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg">
            {toast.text}
          </div>
        )}

        {/* Cards (ações) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white border border-blue-200 hover:shadow-lg rounded-xl p-6 transition">
            <div className="flex items-center gap-3 mb-3">
              <Webhook className="h-8 w-8 text-blue-700" />
              <h3 className="text-xl font-semibold">Gerenciar Webhooks</h3>
            </div>
            <p className="text-gray-600 mb-5">
              Crie/edite webhooks por tipo de requerimento.
            </p>
            <button
              onClick={openCreate}
              className="w-full flex items-center justify-center gap-2 px-6 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Novo Webhook
            </button>
          </div>

          <div className="bg-white border border-gray-200 hover:shadow-lg rounded-xl p-6 transition">
            <div className="flex items-center gap-3 mb-3">
              <Search className="h-8 w-8 text-gray-700" />
              <h3 className="text-xl font-semibold">Filtrar por tipo</h3>
            </div>
            <p className="text-gray-600 mb-3">Procure por chave do tipo (ex: registroArma).</p>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite para filtrar..."
            />
          </div>

          <div className="bg-white border border-gray-200 hover:shadow-lg rounded-xl p-6 transition">
            <div className="flex items-center gap-3 mb-3">
              <RefreshCcw className="h-8 w-8 text-gray-700" />
              <h3 className="text-xl font-semibold">Sincronizar</h3>
            </div>
            <p className="text-gray-600 mb-5">
              Atualiza a lista direto do banco.
            </p>
            <button
              onClick={load}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 px-6 py-2 rounded-md font-medium ${
                loading ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"
              }`}
            >
              <RefreshCcw className="h-4 w-4" />
              {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">Webhooks cadastrados</h3>
            <span className="text-sm text-gray-500">
              Total: <b>{filtered.length}</b>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-700">
                  <th className="p-4 font-semibold">Tipo</th>
                  <th className="p-4 font-semibold">URL</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-4 text-gray-600" colSpan={4}>
                      Carregando...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="p-4 text-gray-600" colSpan={4}>
                      Nenhum webhook encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{typeLabel(row.tipo)}</div>
                        <div className="text-xs text-gray-500 font-mono">{row.tipo}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-mono text-sm text-gray-700">
                          {String(row.url || "").slice(0, 85)}
                          {String(row.url || "").length > 85 ? "..." : ""}
                        </div>
                      </td>

                      <td className="p-4">
                        {row.enabled ? (
                          <span className="inline-flex items-center gap-2 text-green-700 bg-green-100 px-3 py-1 rounded-full text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-red-700 bg-red-100 px-3 py-1 rounded-full text-sm">
                            <XCircle className="h-4 w-4" />
                            Desativado
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => openEdit(row)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>

                          <button
                            onClick={() => onDelete(row)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm font-medium transition"
                          >
                            <Trash2 className="h-4 w-4" />
                            Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {openModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-2xl font-bold">
                  {editing?.id ? "Editar Webhook" : "Novo Webhook"}
                </h3>
                <button onClick={closeModal} className="text-gray-600 hover:text-gray-800">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo do requerimento
                    </label>

                    <div className="flex flex-col md:flex-row gap-3">
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        disabled={useCustom}
                        className={`w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          useCustom ? "bg-gray-100 text-gray-500" : ""
                        }`}
                      >
                        {WEBHOOK_TYPES.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label} ({t.key})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <input
                          id="useCustom"
                          type="checkbox"
                          checked={useCustom}
                          onChange={(e) => setUseCustom(e.target.checked)}
                        />
                        <label htmlFor="useCustom" className="text-sm text-gray-700">
                          Custom
                        </label>
                      </div>
                    </div>

                    {useCustom && (
                      <div className="mt-3">
                        <input
                          value={customTipo}
                          onChange={(e) => setCustomTipo(e.target.value)}
                          placeholder='Ex: "porteArmaEspecial"'
                          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use essa chave no backend ao salvar o requerimento (<span className="font-mono">tipo</span>).
                        </p>
                      </div>
                    )}
                  </div>

                  {/* URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL do Webhook
                    </label>
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {url ? (
                      isValidWebhookUrl(url) ? (
                        <p className="text-xs text-green-700 mt-1">URL válida.</p>
                      ) : (
                        <p className="text-xs text-red-700 mt-1">URL inválida.</p>
                      )
                    ) : null}
                  </div>

                  {/* Enabled */}
                  <div className="flex items-center gap-2">
                    <input
                      id="enabled"
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                    />
                    <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                      Ativo (enabled)
                    </label>
                  </div>

                  {/* Ações */}
                  <div className="mt-8 flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                      disabled={saving}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {saving ? "Salvando..." : editing?.id ? "Salvar alterações" : "Criar webhook"}
                    </button>
                  </div>
                </form>

                <div className="mt-6 text-xs text-gray-500">
                  <b>Dica:</b> você pode ter 1 webhook por tipo. Se quiser múltiplos por tipo, a gente muda o schema pra
                  ter “canal”/“categoria” também.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}