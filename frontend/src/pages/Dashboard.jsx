// frontend/src/pages/Dashboard.jsx
import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Scale, FileText, Search, FileCheck, Briefcase, Calendar } from "lucide-react";

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

  if (module.allowedRoles?.length && module.allowedSubRoles?.length) return okRole || okSub;
  if (module.allowedRoles?.length) return okRole;
  if (module.allowedSubRoles?.length) return okSub;
  return true;
};

export default function Dashboard() {
  const { user, displayName, logout, isAuthenticated, } = useAuth();
  const navigate = useNavigate();

  // 1) Redirect SEM side-effect no render
  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  // 2) Enquanto user não chegou ainda, renderiza loading ao invés de crashar
  if (!isAuthenticated) return null;
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
        Carregando usuário...
      </div>
    );
  }

  const moduleConfig = {
    "Painéis": { icon: Scale, bgColor: "bg-blue-600" },
    "Requerimentos": { icon: FileText, bgColor: "bg-indigo-600" },
    "Triagem": { icon: Search, bgColor: "bg-amber-600" },
    "Cartório": { icon: FileCheck, bgColor: "bg-green-600" },
    "Arquivos": { icon: Briefcase, bgColor: "bg-purple-600" },
    "Processos": { icon: Calendar, bgColor: "bg-red-600" },
  };

  const allModules = [
    { name: "Painéis", link: "/paineis", allowedRoles: ["juiz"], allowedSubRoles: ["equipejuridico"] },
    { name: "Cartório", link: "/cartorio", allowedRoles: ["tabeliao", "escrivao", "juiz"], allowedSubRoles: ["equipejuridico"] },
    { name: "Requerimentos", link: "/requerimentos", allowedRoles: ["advogado", "promotor", "juiz", "conselheiro"], allowedSubRoles: ["equipejuridico"] },
    { name: "Triagem", link: "/triagem", allowedRoles: ["promotor", "tabeliao", "juiz", "escrivao"], allowedSubRoles: ["equipejuridico"] },
    { name: "Arquivos", link: "/arquivos", allowedRoles: ["advogado", "tabeliao", "auxiliar", 'juiz'], allowedSubRoles: ["equipejuridico"] },
    { name: "Processos", link: "/processos", allowedRoles: ["advogado", "conselheiro"], allowedSubRoles: ["equipejuridico"] },
    { name: "Lançamentos", link: "/processos", allowedRoles: ["advogado", "conselheiro"], allowedSubRoles: ["equipejuridico", 'responsaveljuridico', 'master'] },
  ];

  const modules = useMemo(() => allModules.filter((m) => canAccess(user, m)), [user]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8" />
            <h1 className="text-xl font-bold">Dashboard - Jurídico Atlanta RP</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Bem-vindo, {displayName}</span>
            <span className="text-sm bg-blue-700 px-3 py-1 rounded">Cargo: {user?.role || "-"}</span>

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
          Bem-vindo ao Sistema, {displayName}!
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module, index) => {
            const config = moduleConfig[module.name];
            const Icon = config?.icon;
            const bgColor = config?.bgColor || "bg-gray-600";

            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden cursor-pointer"
                onClick={() => navigate(module.link)}
              >
                <div className={`${bgColor} p-6 text-white`}>
                  {Icon ? (
                    <Icon className="h-10 w-10 mb-2" />
                  ) : (
                    <div className="h-10 w-10 mb-2 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold">{module.name[0]}</span>
                    </div>
                  )}
                  <h4 className="text-xl font-semibold">{module.name}</h4>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">Acesse e gerencie {module.name.toLowerCase()} do sistema.</p>
                  <span className="text-blue-600 font-medium hover:underline">Entrar →</span>
                </div>
              </div>
            );
          })}
        </div>

        {modules.length === 0 && (
          <div className="text-center text-gray-600 text-xl mt-10">
            Nenhum módulo disponível para o seu cargo/subcargo no momento.
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
            <Link to="/diretrizes-tribunal" className="hover:text-white underline-offset-4 hover:underline">
              Diretrizes do Tribunal
            </Link>
            <Link to="/codigo-penal" className="hover:text-white underline-offset-4 hover:underline">
              Código Penal
            </Link>
            <Link to="/valores" className="hover:text-white underline-offset-4 hover:underline">
              Valores de Serviços
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