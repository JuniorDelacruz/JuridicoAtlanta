import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useToast } from "../../utils/toast";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  ArrowLeft,
  Users,
  ShieldCheck,
  Loader2,
  ChevronRight,
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
    { subjectType: "role", subjectValue: "cidadao", label: "Cidadão" },
    { subjectType: "role", subjectValue: "auxiliar", label: "Auxiliar" },
    { subjectType: "role", subjectValue: "advogado", label: "Advogado" },
    { subjectType: "role", subjectValue: "promotor_chefe", label: "Promotor Chefe" }, // corrigido para snake_case consistente
    { subjectType: "role", subjectValue: "desembargador", label: "Desembargador" },
    { subjectType: "subRole", subjectValue: "alterarcargo", label: "Alterar Cargo" },
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
      push({ type: "error", title: "Erro", message: err?.response?.data?.msg || err.message });
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
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <ShieldCheck className="h-10 w-10 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Centro de Permissões</h1>
              <p className="mt-1.5 text-base text-gray-600">
                Gerencie permissões do sistema e configure acesso por cargo ou função
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
            Voltar ao Dashboard
          </button>
        </div>

        {/* Card - Criar nova permissão */}
        <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          <div className="px-7 py-5 border-b bg-gray-50/80">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
              <PlusCircle className="h-6 w-6 text-indigo-600" />
              Criar Nova Permissão
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Adicione permissões granulares para controle de acesso no sistema.
            </p>
          </div>

          <div className="p-7">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm placeholder-gray-500"
                placeholder="Key única (ex: processos.editar_todos)"
                value={newPerm.key}
                onChange={(e) => setNewPerm((p) => ({ ...p, key: e.target.value }))}
              />
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm placeholder-gray-500"
                placeholder="Nome visível (Label)"
                value={newPerm.label}
                onChange={(e) => setNewPerm((p) => ({ ...p, label: e.target.value }))}
              />
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm placeholder-gray-500"
                placeholder="Grupo/categoria (ex: Processos)"
                value={newPerm.group}
                onChange={(e) => setNewPerm((p) => ({ ...p, group: e.target.value }))}
              />
              <button
                onClick={createPermission}
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                Criar Permissão
              </button>
            </div>

            <textarea
              className="mt-5 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm resize-y min-h-[90px] placeholder-gray-500"
              placeholder="Descrição detalhada da permissão (opcional)"
              value={newPerm.description}
              onChange={(e) => setNewPerm((p) => ({ ...p, description: e.target.value }))}
            />

            <div className="mt-6 flex items-center gap-3 text-sm text-gray-600">
              <span>Total de permissões cadastradas:</span>
              <strong className="text-gray-900 font-semibold text-base">{perms.length}</strong>
            </div>

            {perms.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {permsByGroup.map(([group, items]) => (
                  <div
                    key={group}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-200"
                  >
                    <h3 className="font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                      {group}
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                        {items.length}
                      </span>
                    </h3>
                    <div className="space-y-2 text-sm">
                      {items.map((perm) => (
                        <div key={perm.key} className="flex flex-col">
                          <span className="font-medium text-gray-800">{perm.label}</span>
                          <span className="text-xs text-gray-500 font-mono mt-0.5 break-all">
                            {perm.key}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card - Cargos / Subjects */}
        <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          <div className="px-7 py-5 border-b bg-gray-50/80">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
              <Users className="h-6 w-6 text-indigo-600" />
              Cargos e Funções
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Selecione um cargo ou sub-função para configurar permissões específicas.
            </p>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-600" />
              <span className="text-lg font-medium">Carregando lista de cargos...</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {subjects.map((subject) => (
                <button
                  key={`${subject.subjectType}:${subject.subjectValue}`}
                  onClick={() => openSubject(subject)}
                  className="w-full text-left px-7 py-5 hover:bg-indigo-50/30 transition-colors group flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors text-lg">
                      {subject.label}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-1">
                      {subject.subjectType} • {subject.subjectValue}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center pt-6 italic">
          Em breve: carregamento dinâmico de cargos e sub-roles diretamente do backend.
        </p>
      </div>
    </div>
  );
}