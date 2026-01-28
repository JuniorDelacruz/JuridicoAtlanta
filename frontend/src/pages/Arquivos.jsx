// frontend/src/pages/Arquivos.jsx
import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Briefcase, FileSearch, ShieldCheck, Folder, ArrowLeft } from "lucide-react";

/** ======= MESMO ESQUEMA DO DASHBOARD ======= */
const normalize = (v) => String(v || "").trim().toLowerCase();

const hasRole = (user, roles = []) =>
  roles.map(normalize).includes(normalize(user?.role));

const hasSubRole = (user, subRoles = []) =>
  subRoles.map(normalize).includes(normalize(user?.subRole));

const canAccess = (user, module) => {
  const okRole =
    (module.allowedRoles?.length ?? 0) === 0 || hasRole(user, module.allowedRoles);
  const okSub =
    (module.allowedSubRoles?.length ?? 0) === 0 || hasSubRole(user, module.allowedSubRoles);

  // se tem os dois definidos: permite se cumprir UM (igual seu dashboard)
  if (module.allowedRoles?.length && module.allowedSubRoles?.length) return okRole || okSub;
  if (module.allowedRoles?.length) return okRole;
  if (module.allowedSubRoles?.length) return okSub;
  return true;
};

export default function Arquivos() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect igual dashboard
  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
        Carregando usuário...
      </div>
    );
  }

  /** ======= CONFIG DOS CARDS (VOCÊ VAI EDITAR AS PERMISSÕES) =======
   * - link: rota final da subpágina
   * - allowedRoles / allowedSubRoles: igual Dashboard
   */
  const allCards = [
    {
      name: "Consultar Cidadão",
      link: "/arquivos/consultar-cidadao",
      description: "Buscar dados do cartório e informações do cidadão.",
      icon: FileSearch,
      bgColor: "bg-indigo-600",
      allowedRoles: [
        // TODO: defina cargos
        // "juiz", "tabeliao"
      ],
      allowedSubRoles: [
        // TODO: defina subcargos
        // "equipejuridico"
      ],
    },
    {
      name: "Consultar Porte de Armas",
      link: "/arquivos/consultar-porte-armas",
      description: "Consultar portes e validações relacionadas.",
      icon: ShieldCheck,
      bgColor: "bg-purple-600",
      allowedRoles: [
        // TODO
      ],
      allowedSubRoles: [
        // TODO
      ],
    },

    // ✅ DUPLICA ESSE BLOCO PRA CRIAR MAIS
    // {
    //   name: "Outro Arquivo",
    //   link: "/arquivos/outro",
    //   description: "Descrição...",
    //   icon: Folder,
    //   bgColor: "bg-blue-600",
    //   allowedRoles: [],
    //   allowedSubRoles: [],
    // },
  ];

  const cards = useMemo(() => allCards.filter((m) => canAccess(user, m)), [user]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8" />
            <h1 className="text-xl font-bold">Arquivos - Jurídico Atlanta RP</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>

            <span className="text-sm font-medium">
              Bem-vindo, {user?.username || "Usuário Discord"}
            </span>
            <span className="text-sm bg-blue-700 px-3 py-1 rounded">
              Cargo: {user?.role || "-"}
            </span>

            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto py-10 px-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Central de Arquivos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((c, index) => {
            const Icon = c.icon;
            const bgColor = c.bgColor || "bg-gray-600";

            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden cursor-pointer"
                onClick={() => navigate(c.link)}
              >
                <div className={`${bgColor} p-6 text-white`}>
                  {Icon ? (
                    <Icon className="h-10 w-10 mb-2" />
                  ) : (
                    <div className="h-10 w-10 mb-2 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold">{c.name[0]}</span>
                    </div>
                  )}
                  <h4 className="text-xl font-semibold">{c.name}</h4>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{c.description}</p>
                  <span className="text-blue-600 font-medium hover:underline">Entrar →</span>
                </div>
              </div>
            );
          })}
        </div>

        {cards.length === 0 && (
          <div className="text-center text-gray-600 text-xl mt-10">
            Nenhum arquivo disponível para o seu cargo/subcargo no momento.
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-3">
            <Link to="/codigo-etica" className="hover:text-white underline-offset-4 hover:underline">
              Código de Ética
            </Link>
            <Link to="/manual-advogado" className="hover:text-white underline-offset-4 hover:underline">
              Manual do Advogado
            </Link>
            <Link
              to="/diretrizes-tribunal"
              className="hover:text-white underline-offset-4 hover:underline"
            >
              Diretrizes do Tribunal
            </Link>
            <Link to="/codigo-penal" className="hover:text-white underline-offset-4 hover:underline">
              Código Penal
            </Link>
          </div>

          <p className="text-sm">
            © {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}