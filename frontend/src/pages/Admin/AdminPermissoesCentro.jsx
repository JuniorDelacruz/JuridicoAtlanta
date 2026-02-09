// src/pages/admin/AdminPermissoesCentro.jsx (versão simplificada)
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useToast } from "../../utils/toast";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  Loader2,
  ChevronRight,
  PlusCircle,
} from "lucide-react";

export default function AdminPermissoesCentro() {
  const { push } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [subjects] = useState([
    { subjectType: "role", subjectValue: "juiz", label: "Juiz" },
    { subjectType: "role", subjectValue: "conselheiro", label: "Conselheiro" },
    { subjectType: "role", subjectValue: "promotor", label: "Promotor" },
    { subjectType: "role", subjectValue: "tabeliao", label: "Tabelião" },
    { subjectType: "role", subjectValue: "escrivao", label: "Escrivão" },
    { subjectType: "role", subjectValue: "cidadao", label: "Cidadão" },
    { subjectType: "role", subjectValue: "auxiliar", label: "Auxiliar" },
    { subjectType: "role", subjectValue: "advogado", label: "Advogado" },
    { subjectType: "role", subjectValue: "promotor_chefe", label: "Promotor Chefe" },
    { subjectType: "role", subjectValue: "desembargador", label: "Desembargador" },
    { subjectType: "subRole", subjectValue: "alterarcargo", label: "Alterar Cargo" },
    { subjectType: "subRole", subjectValue: "equipejuridico", label: "Equipe Jurídico" },
    { subjectType: "subRole", subjectValue: "responsaveljuridico", label: "Responsável Jurídico" },
    { subjectType: "subRole", subjectValue: "master", label: "Master" },
  ]);

  async function reload() {
    setLoading(true);
    try {
      await api.get("/api/admin/perms"); // só para garantir que a API está ok, mas não usamos os dados aqui
    } catch (err) {
      push({ type: "error", title: "Erro", message: err?.response?.data?.msg || err.message });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

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
                Configure permissões específicas por cargo ou função
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
          
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <ArrowLeft size={18} />
              Voltar ao Dashboard
            </button>
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
              Clique em um cargo ou sub-função para editar suas permissões.
            </p>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-600" />
              <span className="text-lg font-medium">Carregando...</span>
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