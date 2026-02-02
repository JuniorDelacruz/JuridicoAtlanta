import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useToast } from "../../utils/toast";
import { useNavigate, useParams } from "react-router-dom";

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

  async function reload() {
    setLoading(true);
    try {
      // Mantém o mesmo endpoint, só que agora filtramos no front
      const { data } = await api.get("/api/admin/perms");
      const allPerms = Array.isArray(data?.perms) ? data.perms : [];
      const allGrants = Array.isArray(data?.grants) ? data.grants : [];

      setPerms(allPerms);

      // filtra só grants desse subject
      const filtered = allGrants.filter(
        (g) =>
          g.subjectType === subjectType &&
          norm(g.subjectValue) === norm(subjectValue)
      );
      setGrants(filtered);
    } catch (err) {
      push({ type: "error", title: "Negado", message: err?.response?.data?.msg || err.message });
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

  async function setEffect(permissionKey, next) {
    try {
      if (next === "none") {
        await api.delete("/api/admin/grants", {
          data: { subjectType, subjectValue, permissionKey },
        });
      } else {
        await api.post("/api/admin/grants/upsert", {
          subjectType,
          subjectValue,
          permissionKey,
          effect: next, // allow/deny
        });
      }
      await reload();
    } catch (err) {
      push({ type: "warning", title: "Erro", message: err?.response?.data?.msg || err.message });
    }
  }

  const permsByGroup = useMemo(() => groupBy(perms, (p) => p.group), [perms]);

  function cycle(eff) {
    return eff === "none" ? "allow" : eff === "allow" ? "deny" : "none";
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Permissões do Cargo</h1>
            <p className="text-sm text-gray-600">
              <b>{subjectType}:{subjectValue}</b> — clique para alternar: <b>none → allow → deny → none</b>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/admin/permissoes")}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium"
            >
              Voltar
            </button>
            <button
              onClick={reload}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              Recarregar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <div className="font-bold text-gray-900">Configurar permissões</div>
            <div className="text-xs text-gray-500">
              Dica: use <b>DENY</b> pra bloquear mesmo se futuramente esse cargo ganhar permissões por outra regra.
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Carregando...</div>
          ) : perms.length === 0 ? (
            <div className="p-10 text-center text-gray-500">Nenhuma permissão cadastrada.</div>
          ) : (
            <div className="p-5 space-y-6">
              {permsByGroup.map(([groupName, groupPerms]) => (
                <div key={groupName} className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b font-bold text-gray-900">{groupName}</div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white">
                        <tr className="border-b">
                          <th className="text-left px-3 py-2 text-gray-500">Permissão</th>
                          <th className="text-left px-3 py-2 text-gray-500">Ação</th>
                        </tr>
                      </thead>

                      <tbody>
                        {groupPerms.map((p) => {
                          const eff = getEffect(p.key);

                          const cls =
                            eff === "allow"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : eff === "deny"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-gray-50 text-gray-700 border-gray-200";

                          const label = eff === "allow" ? "ALLOW" : eff === "deny" ? "DENY" : "—";

                          return (
                            <tr key={p.key} className="border-b last:border-b-0">
                              <td className="px-3 py-2">
                                <div className="font-semibold text-gray-900">{p.label}</div>
                                <div className="text-xs text-gray-500">{p.key}</div>
                                {p.description ? (
                                  <div className="text-xs text-gray-400 mt-1">{p.description}</div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  className={`px-3 py-1 rounded-md border text-xs font-bold ${cls}`}
                                  onClick={() => setEffect(p.key, cycle(eff))}
                                >
                                  {label}
                                </button>
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

        <div className="text-xs text-gray-500">
          Essa tela só mexe nos grants do <b>{subjectType}:{subjectValue}</b>.
        </div>
      </div>
    </div>
  );
}
