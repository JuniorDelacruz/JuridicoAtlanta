import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { TIPOS_REQUERIMENTO } from "../config/requerimentosTipos";
import { FileText, Shield, Users, Search, FileCheck, Calendar, ArrowLeft } from "lucide-react";

const API_URL = import.meta?.env?.VITE_API_URL || "https://apijuridico.starkstore.dev.br";

const ICONS = {
  "porte-de-arma": Shield,
  "troca-de-nome": FileText,
  "casamento": Users,
  "limpeza-de-ficha": Search,
  "alvara": FileCheck,
  "renovacao-alvara": Calendar,
};

export default function RequerimentoHub() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isEquipeJuridica = user?.subRole === "equipejuridico";

  const [resumo, setResumo] = useState({});
  const [loading, setLoading] = useState(true);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const cards = useMemo(() => {
    const pode = (t) =>
      t.roles.includes(user?.role) || isEquipeJuridica || user?.role === "admin";

    return TIPOS_REQUERIMENTO
      // ✅ não exibe se disable === true
      .filter((t) => !t.disable)
      .map((t) => ({
        ...t,
        permitido: pode(t),
        counts: resumo[t.tipoDb] || { PENDENTE: 0, APROVADO: 0, INDEFERIDO: 0, TOTAL: 0 },
        Icon: ICONS[t.slug] || FileText,
      }));
  }, [user?.role, isEquipeJuridica, resumo]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const r = await axios.get(`${API_URL}/api/requerimentos/resumo`, { headers: authHeaders() });
        setResumo(r.data || {});
      } catch {
        setResumo({});
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <h1 className="text-xl font-bold">Requerimentos - Jurídico Atlanta RP</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </button>
            <span className="text-sm">Bem-vindo, {user?.username || "Usuário"}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto py-8 px-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Selecione o tipo de requerimento</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div
              key={c.slug}
              className={`bg-white border ${c.permitido ? "border-indigo-200 hover:shadow-lg hover:border-indigo-300" : "border-gray-200 opacity-60 cursor-not-allowed"
                } rounded-xl p-6 transition`}
            >
              <div className="flex items-center gap-3 mb-3">
                <c.Icon className={`h-10 w-10 ${c.permitido ? "text-indigo-600" : "text-gray-400"}`} />
                <div>
                  <h3 className="text-xl font-semibold">{c.label}</h3>
                  <p className="text-sm text-gray-500">{c.tipoDb}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap mb-4">
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                  Pendente: <b>{c.counts.PENDENTE}</b>
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                  Aprovado: <b>{c.counts.APROVADO}</b>
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                  Indeferido: <b>{c.counts.INDEFERIDO}</b>
                </span>
              </div>

              <button
                onClick={() => c.permitido && navigate(`/requerimentos/${c.slug}`)}
                disabled={!c.permitido || loading}
                className={`w-full px-6 py-2 rounded-md font-medium ${c.permitido && !loading
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
              >
                Acessar
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}