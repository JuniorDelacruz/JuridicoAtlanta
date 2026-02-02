import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useToast } from "../../utils/toast";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  ArrowLeft,
  Users,
  ShieldCheck,
  Loader2
} from "lucide-react";

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

  const [subjects] = useState([
    { subjectType: "role", subjectValue: "juiz", label: "Juiz" },
    { subjectType: "role", subjectValue: "conselheiro", label: "Conselheiro" },
    { subjectType: "role", subjectValue: "promotor", label: "Promotor" },
    { subjectType: "role", subjectValue: "tabeliao", label: "Tabelião" },
    { subjectType: "role", subjectValue: "escrivao", label: "Escrivão" },

    // Novos roles solicitados
    { subjectType: "role", subjectValue: "cidadao", label: "Cidadão" },
    { subjectType: "role", subjectValue: "auxiliar", label: "Auxiliar" },
    { subjectType: "role", subjectValue: "advogado", label: "Advogado" },
    { subjectType: "role", subjectValue: "promotor_chefe", label: "Promotor Chefe" },
    { subjectType: "role", subjectValue: "desembargador", label: "Desembargador" },

    // Sub-roles existentes (mantidos iguais)
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
    if (!newPerm.key.trim() || !newPerm.label.trim()) {
      push({ type: "warning", title: "Atenção", message: "Key e Label são obrigatórios" });
      return;
    }

    try {
      await api.post("/api/admin/perms", newPerm);
      setNewPerm({ key: "", label: "", group: "Geral", description: "" });
      await reload();
      push({ type: "success", title: "Sucesso", message: "Permissão criada com sucesso." });
    } catch (err) {
      push({ type: "error", title: "Erro", message: err?.response?.data?.msg || "Não foi possível criar a permissão" });
    }
  }

  const permsByGroup = useMemo(() => groupBy(perms, (p) => p.group), [perms]);

  function openSubject(s) {
    const st = encodeURIComponent(s.subjectType);
    const sv = encodeURIComponent(s.subjectValue);
    navigate(`/admin/permissoes/${st}/${sv}`);
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Centro de Permissões</h1>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie permissões do sistema e configure por cargo
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        </div>

        {/* Card - Criar permissão */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PlusCircle size={20} className="text-indigo-600" />
              Criar nova permissão
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="key (ex: lancamentos.view_all)"
                value={newPerm.key}
                onChange={(e) => setNewPerm((p) => ({ ...p, key: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="Nome visível (label)"
                value={newPerm.label}
                onChange={(e) => setNewPerm((p) => ({ ...p, label: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="Grupo (ex: Lançamentos)"
                value={newPerm.group}
                onChange={(e) => setNewPerm((p) => ({ ...p, group: e.target.value }))}
              />
              <button
                onClick={createPermission}
                disabled={loading}
                className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                Criar
              </button>
            </div>

            <textarea
              className="mt-4 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm resize-y min-h-[80px]"
              placeholder="Descrição (opcional)"
              value={newPerm.description}
              onChange={(e) => setNewPerm((p) => ({ ...p, description: e.target.value }))}
            />

            <div className="mt-5 text-sm text-gray-500">
              Total de permissões cadastradas: <strong className="text-gray-700">{perms.length}</strong>
            </div>

            {perms.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {permsByGroup.map(([group, items]) => (
                  <div
                    key={group}
                    className="bg-gray-50/60 border border-gray-200 rounded-lg p-4 hover:shadow transition-shadow"
                  >
                    <h3 className="font-medium text-gray-800 mb-2.5 pb-1.5 border-b border-gray-200/70">
                      {group}
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      {items.map((perm) => (
                        <div key={perm.key} className="flex items-baseline gap-2">
                          <span className="font-medium text-gray-800">{perm.label}</span>
                          <span className="text-xs text-gray-500 font-mono">({perm.key})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card - Cargos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-indigo-600" />
              Cargos / Subjects
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Clique em um cargo para editar suas permissões específicas
            </p>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <span>Carregando permissões...</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {subjects.map((subject) => (
                <button
                  key={`${subject.subjectType}:${subject.subjectValue}`}
                  onClick={() => openSubject(subject)}
                  className="w-full text-left px-6 py-4 hover:bg-indigo-50/40 transition-colors group"
                >
                  <div className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">
                    {subject.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 font-mono">
                    {subject.subjectType} • {subject.subjectValue}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center pt-4">
          Futuramente: lista de cargos/sub-roles será carregada dinamicamente do backend
        </p>

      </div>
    </div>
  );
}