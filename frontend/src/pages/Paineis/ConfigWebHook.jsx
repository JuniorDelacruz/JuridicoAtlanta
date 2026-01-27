// frontend/src/pages/WebhookConfig.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * Ajuste se seu front usa outro baseURL.
 * Se você já tiver axios/service, pode trocar fetch por ele.
 */
const API_BASE = import.meta?.env?.VITE_API_BASE_URL || ""; // ex: "https://juridicoatlanta.starkstore.dev.br"

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
    // Discord webhooks normalmente começam com https://discord.com/api/webhooks/...
    // mas se você usar outro provedor, mantém só o básico:
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // se seu auth usa cookie/sessão
    ...options,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Erro HTTP ${res.status} em ${path}`;
    throw new Error(msg);
  }
  return data;
}

export default function WebhookConfigPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  // Form (create/edit)
  const [editingId, setEditingId] = useState(null);
  const [tipo, setTipo] = useState(WEBHOOK_TYPES[0]?.key || "");
  const [tipoCustom, setTipoCustom] = useState("");
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text:''}

  const tipoFinal = useMemo(() => {
    if (tipo === "__custom__") return (tipoCustom || "").trim();
    return tipo;
  }, [tipo, tipoCustom]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) =>
      String(i.tipo || "")
        .toLowerCase()
        .includes(term)
    );
  }, [items, q]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      // esperado: [{id, tipo, url, enabled, createdAt, updatedAt}, ...]
      const data = await apiFetch("/api/webhooks");
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTipo(WEBHOOK_TYPES[0]?.key || "");
    setTipoCustom("");
    setUrl("");
    setEnabled(true);
  }

  function startEdit(row) {
    setEditingId(row.id);
    const known = WEBHOOK_TYPES.some((t) => t.key === row.tipo);
    setTipo(known ? row.tipo : "__custom__");
    setTipoCustom(known ? "" : row.tipo);
    setUrl(row.url || "");
    setEnabled(Boolean(row.enabled));
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (!tipoFinal) {
      setMsg({ type: "err", text: "Informe o tipo do webhook." });
      return;
    }
    if (!url || !isValidWebhookUrl(url)) {
      setMsg({ type: "err", text: "Informe uma URL válida." });
      return;
    }

    setSaving(true);
    try {
      const payload = { tipo: tipoFinal, url: url.trim(), enabled };

      if (editingId) {
        await apiFetch(`/api/webhooks/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMsg({ type: "ok", text: "Webhook atualizado." });
      } else {
        await apiFetch(`/api/webhooks`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMsg({ type: "ok", text: "Webhook criado." });
      }

      resetForm();
      await load();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row) {
    const ok = confirm(
      `Deletar webhook do tipo "${row.tipo}"? Isso não tem volta.`
    );
    if (!ok) return;

    setMsg(null);
    try {
      await apiFetch(`/api/webhooks/${row.id}`, { method: "DELETE" });
      setMsg({ type: "ok", text: "Webhook deletado." });
      await load();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 6 }}>Configurar Webhooks</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Cada tipo de requerimento pode enviar para um webhook diferente.
      </p>

      {msg?.type === "err" && (
        <div
          style={{
            padding: 12,
            border: "1px solid #ffb4b4",
            background: "#ffe9e9",
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <b>Erro:</b> {msg.text}
        </div>
      )}
      {msg?.type === "ok" && (
        <div
          style={{
            padding: 12,
            border: "1px solid #b5f5c8",
            background: "#eafff0",
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* FORM */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>
          {editingId ? "Editar Webhook" : "Novo Webhook"}
        </h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Tipo</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                style={{ padding: 10, borderRadius: 10, minWidth: 260 }}
              >
                {WEBHOOK_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label} ({t.key})
                  </option>
                ))}
                <option value="__custom__">Custom (digitar chave)</option>
              </select>

              {tipo === "__custom__" && (
                <input
                  value={tipoCustom}
                  onChange={(e) => setTipoCustom(e.target.value)}
                  placeholder='Ex: "meuTipoNovo"'
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    minWidth: 260,
                    flex: 1,
                  }}
                />
              )}
            </div>

            <small style={{ opacity: 0.75 }}>
              Dica: no backend você usa isso como <code>tipo</code> pra resolver o webhook.
            </small>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>URL do Webhook</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/...."
              style={{ padding: 10, borderRadius: 10 }}
            />
            {!url ? null : isValidWebhookUrl(url) ? (
              <small style={{ color: "green" }}>URL ok.</small>
            ) : (
              <small style={{ color: "crimson" }}>URL inválida.</small>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              id="enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <label htmlFor="enabled" style={{ fontWeight: 600 }}>
              Ativo (enabled)
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: 0,
                cursor: "pointer",
              }}
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar webhook"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.2)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LISTA */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, flex: 1 }}>Webhooks cadastrados</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar por tipo..."
            style={{ padding: 10, borderRadius: 10, minWidth: 260 }}
          />
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.2)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 900,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.85 }}>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
                  Tipo
                </th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
                  URL
                </th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
                  Enabled
                </th>
                <th style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: 14 }}>
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 14, opacity: 0.75 }}>
                    Nenhum webhook encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid rgba(255,255,255,.08)",
                        fontFamily: "monospace",
                      }}
                    >
                      {row.tipo}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid rgba(255,255,255,.08)",
                        fontFamily: "monospace",
                        opacity: 0.9,
                      }}
                      title={row.url}
                    >
                      {String(row.url || "").slice(0, 80)}
                      {String(row.url || "").length > 80 ? "..." : ""}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid rgba(255,255,255,.08)",
                      }}
                    >
                      {row.enabled ? "✅" : "❌"}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid rgba(255,255,255,.08)",
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => startEdit(row)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,.2)",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(row)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,0,0,.35)",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 10, opacity: 0.75 }}>
            Total: <b>{filtered.length}</b>
          </div>
        </div>
      </div>
    </div>
  );
}