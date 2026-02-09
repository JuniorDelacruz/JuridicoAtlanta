import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useToast } from "../../utils/toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Shield,
  CheckCircle2,
  Slash,
  XCircle,
  Loader2,
} from "lucide-react";

const norm = (v) => (v ?? "").toString().trim().toLowerCase();

function groupBy(arr, getKey) {
  const map = new Map();
  for (const item of arr) {
    const k = getKey(item) || "Outros";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return [...map.entries()];
}

export default function AdminPermissoesCargo() {
  const { push } = useToast();
  const navigate = useNavigate();
  const params = useParams();

  const subjectType = decodeURIComponent(params.subjectType || "");
  const subjectValue = decodeURIComponent(params.subjectValue || "");

  const [loading, setLoading] = useState(false);
  const [perms, setPerms] = useState([]);
  const [grants, setGrants] = useState([]);
  const [savingKey, setSavingKey] = useState(null);

  async function reload() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/perms");
      const allPerms = Array.isArray(data?.perms) ? data.perms : [];
      const allGrants = Array.isArray(data?.grants) ? data.grants : [];

      setPerms(allPerms);

      const filtered = allGrants.filter(
        (g) =>
          g.subjectType === subjectType &&
          norm(g.subjectValue) === norm(subjectValue)
      );
      setGrants(filtered);
    } catch (err) {
      push({ type: "error", title: "Erro", message: err?.response?.data?.msg || err.message });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!subjectType || !subjectValue) {
      navigate("/admin/permissoes");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectType, subjectValue]);

  const grantsIndex = useMemo(() => {
    const m = new Map();
    for (const g of grants) m.set(g.permissionKey, g.effect);
    return m;
  }, [grants]);

  function getEffect(permissionKey) {
    return grantsIndex.get(permissionKey) || "none";
  }

  async function setEffect(permissionKey, nextEffect) {
    const prevGrants = grants; // snapshot para rollback

    // Optimistic update
    setGrants((curr) => {
      const idx = curr.findIndex((g) => g.permissionKey === permissionKey);

      if (nextEffect === "none") {
        if (idx === -1) return curr;
        const copy = curr.slice();
        copy.splice(idx, 1);
        return copy;
      }

      const newGrant = { subjectType, subjectValue, permissionKey, effect: nextEffect };

      if (idx === -1) {
        return [...curr, newGrant];
      }

      const copy = curr.slice();
      copy[idx] = newGrant;
      return copy;
    });

    setSavingKey(permissionKey);

    try {
      if (nextEffect === "none") {
        await api.delete("/api/admin/grants", {
          data: { subjectType, subjectValue, permissionKey },
        });
      } else {
        await api.post("/api/admin/grants/upsert", {
          subjectType,
          subjectValue,
          permissionKey,
          effect: nextEffect,
        });
      }
      // Sucesso: mantém o optimistic update
    } catch (err) {
      // Rollback
      setGrants(prevGrants);
      push({
        type: "error",
        title: "Erro",
        message: err?.response?.data?.msg || "Falha ao salvar permissão",
      });
    } finally {
      setSavingKey(null);
    }
  }

  const permsByGroup = useMemo(() => groupBy(perms, (p) => p.group), [perms]);

  const subjectLabel = `${subjectType}:${subjectValue}`;

  return (
    <div className="min-h-screen bg-gray-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Permissões do Cargo</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configurando <strong className="font-medium text-indigo-700">{subjectLabel}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/permissoes")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <button
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Recarregar
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={20} className="text-indigo-600" />
              Configurar permissões
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Escolha o estado desejado para cada permissão:
            </p>
            <div className="mt-2 flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> <span className="text-emerald-700 font-medium">Permitir</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Slash size={14} className="text-gray-500" /> <span className="text-gray-600">Neutro / Herdar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle size={14} className="text-rose-600" /> <span className="text-rose-700 font-medium">Negar</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-600" />
              <span className="text-lg">Carregando permissões...</span>
            </div>
          ) : perms.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Nenhuma permissão cadastrada no sistema ainda.</p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {permsByGroup.map(([groupName, groupPerms]) => (
                <div
                  key={groupName}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                >
                  <div className="px-5 py-3 bg-gray-50/80 border-b font-semibold text-gray-800 flex items-center justify-between">
                    <span>{groupName}</span>
                    <span className="text-xs text-gray-500 font-normal">
                      {groupPerms.length} permissões
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-5 py-3 text-gray-600 font-medium">Permissão</th>
                          <th className="text-center px-5 py-3 text-gray-600 font-medium w-48">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {groupPerms.map((perm) => {
                          const currentEffect = getEffect(perm.key);
                          const isSaving = savingKey === perm.key;

                          return (
                            <tr
                              key={perm.key}
                              className="hover:bg-gray-50/70 transition-colors"
                            >
                              <td className="px-5 py-4">
                                <div className="font-medium text-gray-900">{perm.label}</div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">{perm.key}</div>
                                {perm.description && (
                                  <div className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                                    {perm.description}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  {/* Botão ALLOW */}
                                  <button
                                    onClick={() => setEffect(perm.key, "allow")}
                                    disabled={isSaving}
                                    className={`inline-flex items-center justify-center w-10 h-8 rounded-md border text-sm font-bold transition-all ${
                                      currentEffect === "allow"
                                        ? "bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm"
                                        : "bg-white border-gray-300 text-gray-500 hover:bg-emerald-50 hover:border-emerald-300"
                                    }`}
                                    title="Permitir (ALLOW)"
                                  >
                                    {isSaving && currentEffect === "allow" ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={16} />
                                    )}
                                  </button>

                                  {/* Botão NEUTRAL */}
                                  <button
                                    onClick={() => setEffect(perm.key, "none")}
                                    disabled={isSaving}
                                    className={`inline-flex items-center justify-center w-10 h-8 rounded-md border text-sm font-bold transition-all ${
                                      currentEffect === "none"
                                        ? "bg-gray-100 border-gray-400 text-gray-700 shadow-sm"
                                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-100 hover:border-gray-400"
                                    }`}
                                    title="Neutro / Herdar (NONE)"
                                  >
                                    {isSaving && currentEffect === "none" ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <Slash size={16} />
                                    )}
                                  </button>

                                  {/* Botão DENY */}
                                  <button
                                    onClick={() => setEffect(perm.key, "deny")}
                                    disabled={isSaving}
                                    className={`inline-flex items-center justify-center w-10 h-8 rounded-md border text-sm font-bold transition-all ${
                                      currentEffect === "deny"
                                        ? "bg-rose-100 border-rose-400 text-rose-800 shadow-sm"
                                        : "bg-white border-gray-300 text-gray-500 hover:bg-rose-50 hover:border-rose-300"
                                    }`}
                                    title="Negar (DENY)"
                                  >
                                    {isSaving && currentEffect === "deny" ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <XCircle size={16} />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center pt-4">
          Alterações afetam exclusivamente o subject <strong>{subjectLabel}</strong>
        </p>
      </div>
    </div>
  );
}