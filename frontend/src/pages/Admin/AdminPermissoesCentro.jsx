import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useToast } from "../../utils/toast";
import { useNavigate } from "react-router-dom";

function groupBy(arr, getKey) {
  const map = new Map();
  for (const item of arr) {
    const k = getKey(item) || "Outros";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return [...map.entries()];
}

export default function AdminPermissoesCentro() {
  const { push } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [perms, setPerms] = useState([]);

  // Lista de cargos/subjects (por enquanto fixo, depois você pode puxar do backend)
  const [subjects] = useState([
    { subjectType: "role", subjectValue: "juiz", label: "Juiz" },
    { subjectType: "role", subjectValue: "conselheiro", label: "Conselheiro" },
    { subjectType: "role", subjectValue: "promotor", label: "Promotor" },
    { subjectType: "role", subjectValue: "tabeliao", label: "Tabelião" },
    { subjectType: "role", subjectValue: "escrivao", label: "Escrivão" },
    { subjectType: "subRole", subjectValue: "equipejuridico", label: "Equipe Jurídico" },
    { subjectType: "subRole", subjectValue: "responsaveljuridico", label: "Responsável Jurídico" },
    { subjectType: "subRole", subjectValue: "master", label: "Master" },
  ]);

  const [newPerm, setNewPerm] = useState({
    key: "",
    label: "",
    group: "Geral",
    description: "",
  });

  async function reload() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/perms");
      setPerms(Array.isArray(data?.perms) ? data.perms : []);
    } catch (err) {
      push({ type: "error", title: "Negado", message: err?.response?.data?.msg || err.message });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function openSubject(s) {
    const st = encodeURIComponent(s.subjectType);
    const sv = encodeURIComponent(s.subjectValue);
    navigate(`/admin/permissoes/${st}/${sv}`);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Centro de Permissões</h1>
            <p className="text-sm text-gray-600">Crie permissões e configure cargo por cargo.</p>
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

          <div className="mt-4 text-xs text-gray-500">
            Permissões existentes: <b>{perms.length}</b>
          </div>

          {perms.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {permsByGroup.map(([g, arr]) => (
                <div key={g} className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-bold text-gray-900">{g}</div>
                  <div className="mt-2 space-y-1">
                    {arr.map((p) => (
                      <div key={p.key} className="text-sm text-gray-700">
                        <b>{p.label}</b> <span className="text-xs text-gray-500">({p.key})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de cargos */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <div className="font-bold text-gray-900">Cargos / Subjects</div>
            <div className="text-xs text-gray-500">Clique em um cargo para configurar as permissões dele.</div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Carregando...</div>
          ) : (
            <div className="divide-y">
              {subjects.map((s) => (
                <button
                  key={`${s.subjectType}:${s.subjectValue}`}
                  onClick={() => openSubject(s)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50"
                >
                  <div className="font-semibold text-gray-900">{s.label}</div>
                  <div className="text-xs text-gray-500">
                    {s.subjectType}:{s.subjectValue}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Depois a gente troca a lista fixa de cargos por uma lista vinda do backend (roles/subRoles existentes).
        </div>
      </div>
    </div>
  );
}
