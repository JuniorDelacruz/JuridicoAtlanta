import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useToast } from "../utils/toast";
import { useNavigate } from "react-router-dom";

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

export default function AdminPermissoes() {
  const { push } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [perms, setPerms] = useState([]);
  const [grants, setGrants] = useState([]);

  // “tabela” de sujeitos (role/subRole) que você quer gerenciar.
  // Você pode trocar depois para buscar do backend automaticamente.
  const [subjects, setSubjects] = useState([
    { subjectType: "role", subjectValue: "juiz" },
    { subjectType: "role", subjectValue: "conselheiro" },
    { subjectType: "role", subjectValue: "promotor" },
    { subjectType: "role", subjectValue: "tabeliao" },
    { subjectType: "role", subjectValue: "escrivao" },
    { subjectType: "subRole", subjectValue: "equipejuridico" },
    { subjectType: "subRole", subjectValue: "responsaveljuridico" },
    { subjectType: "subRole", subjectValue: "master" },
  ]);

  const [newPerm, setNewPerm] = useState({ key: "", label: "", group: "Geral", description: "" });

  async function reload() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/perms");
      setPerms(Array.isArray(data?.perms) ? data.perms : []);
      setGrants(Array.isArray(data?.grants) ? data.grants : []);
    } catch (err) {
      push({ type: "error", title: "Negado", message: err?.response?.data?.msg || err.message });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const grantsIndex = useMemo(() => {
    const m = new Map();
    for (const g of grants) {
      const k = `${g.subjectType}:${norm(g.subjectValue)}|${g.permissionKey}`;
      m.set(k, g.effect);
    }
    return m;
  }, [grants]);

  function getEffect(subjectType, subjectValue, permissionKey) {
    const k = `${subjectType}:${norm(subjectValue)}|${permissionKey}`;
    return grantsIndex.get(k) || "none";
  }

  async function setEffect(subjectType, subjectValue, permissionKey, next) {
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

  async function createPermission() {
    try {
      await api.post("/api/admin/perms", newPerm);
      setNewPerm({ key: "", label: "", group: "Geral", description: "" });
      await reload();
      push({ type: "success", title: "OK", message: "Permissão criada." });
    } catch (err) {
      push({ type: "warning", title: "Erro", message: err?.response?.data?.msg || err.message });
    }
  }

  const permsByGroup = useMemo(() => groupBy(perms, (p) => p.group), [perms]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Centro de Permissões</h1>
            <p className="text-sm text-gray-600">Configure cargo por cargo, permissão por permissão.</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium"
          >
            Voltar
          </button>
        </div>

        {/* Criar permissão */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
          <div className="font-bold text-gray-900 mb-3">Criar nova permissão</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="key (ex: lancamentos.view_all)"
              value={newPerm.key}
              onChange={(e) => setNewPerm((p) => ({ ...p, key: e.target.value }))}
            />
            <input
              className="border rounded-md px-3 py-2"
              placeholder="label (nome na UI)"
              value={newPerm.label}
              onChange={(e) => setNewPerm((p) => ({ ...p, label: e.target.value }))}
            />
            <input
              className="border rounded-md px-3 py-2"
              placeholder="group (ex: Lançamentos)"
              value={newPerm.group}
              onChange={(e) => setNewPerm((p) => ({ ...p, group: e.target.value }))}
            />
            <button
              onClick={createPermission}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Criar
            </button>
          </div>
          <textarea
            className="border rounded-md px-3 py-2 w-full mt-3"
            placeholder="description (opcional)"
            value={newPerm.description}
            onChange={(e) => setNewPerm((p) => ({ ...p, description: e.target.value }))}
          />
        </div>

        {/* Matriz de permissões */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <div className="font-bold text-gray-900">Matriz (Role/SubRole x Permissões)</div>
            <div className="text-xs text-gray-500">
              Clique para alternar: <b>none → allow → deny → none</b>
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
                          <th className="text-left px-3 py-2 text-gray-500">Cargo</th>
                          {groupPerms.map((p) => (
                            <th key={p.key} className="text-left px-3 py-2 text-gray-500 whitespace-nowrap">
                              {p.label}
                              <div className="text-[10px] text-gray-400">{p.key}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {subjects.map((s) => (
                          <tr key={`${s.subjectType}:${s.subjectValue}`} className="border-b last:border-b-0">
                            <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                              {s.subjectType}:{s.subjectValue}
                            </td>

                            {groupPerms.map((p) => {
                              const eff = getEffect(s.subjectType, s.subjectValue, p.key);

                              const cls =
                                eff === "allow"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : eff === "deny"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200";

                              const label = eff === "allow" ? "ALLOW" : eff === "deny" ? "DENY" : "—";

                              return (
                                <td key={`${s.subjectType}:${s.subjectValue}|${p.key}`} className="px-3 py-2">
                                  <button
                                    className={`px-3 py-1 rounded-md border text-xs font-bold ${cls}`}
                                    onClick={() => {
                                      const next = eff === "none" ? "allow" : eff === "allow" ? "deny" : "none";
                                      setEffect(s.subjectType, s.subjectValue, p.key, next);
                                    }}
                                  >
                                    {label}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Dica: depois eu posso te ajudar a trocar a lista fixa de cargos por uma lista vinda do backend (roles/subRoles existentes).
        </div>
      </div>
    </div>
  );
}
