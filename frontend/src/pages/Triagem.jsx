import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Scale,
  FileText,
  Shield,
  UserCheck,
  Users,
  Search,
  FileCheck,
  Calendar,
  ArrowLeft,
} from "lucide-react";

const TIPOS_TRIAGEM = [
  {
    nome: "Novo Cadastro",
    path: "/triagem/cadastro",
    icon: UserCheck,
    perm: "triagem.acessar.cadastro",
    desc: "Aprovação de novos cadastros.",
  },
  {
    nome: "Porte de Arma",
    path: "/triagem/porte-de-arma",
    icon: Shield,
    perm: "triagem.acessar.portearma",
    desc: "Aprovação de pedidos de porte.",
  },
  {
    nome: "Registro de Arma",
    path: "/triagem/registro-arma",
    icon: Shield,
    perm: "triagem.acessar.registroarma",
    desc: "Registro definitivo de armas.",
  },
  {
    nome: "Troca de Nome",
    path: "/triagem/troca-de-nome",
    icon: FileText,
    perm: "triagem.acessar.trocadenome",
    desc: "Aprovação de trocas de nome.",
  },
  {
    nome: "Casamento",
    path: "/triagem/casamento",
    icon: Users,
    perm: "triagem.acessar.casamento",
    desc: "Registro de casamentos.",
  },
  {
    nome: "Alvará",
    path: "/triagem/alvara",
    icon: FileCheck,
    perm: "triagem.acessar.alvara",
    desc: "Emissão de alvarás.",
  },
  {
    nome: "Renovação de Alvará",
    path: "/triagem/renovacao-alvara",
    icon: Calendar,
    perm: "triagem.acessar.renovacaoalvara",
    desc: "Renovação de alvarás existentes.",
  },
  {
    nome: "Limpeza de Ficha",
    path: "/triagem/limpeza-de-ficha",
    icon: Search,
    perm: "triagem.acessar.limpezadeficha",
    desc: "Limpeza de registros criminais.",
  },
  {
    nome: "Recolhimento Limpeza",
    path: "/triagem/recolhimento-limpeza-de-ficha",
    icon: FileCheck,
    perm: "triagem.acessar.recolhimentolimpezadeficha",
    desc: "Registro de pagamento para limpeza de ficha.",
  },
  {
    nome: "Carimbo Porte de Arma",
    path: "/triagem/carimbo",
    icon: FileCheck,
    perm: "triagem.acessar.carimboportedearmas",
    desc: "Carimbo do porte de arma.",
  },
];

export default function Triagem() {
  const { user, logout, isAuthenticated, displayName, hasPerm, permsLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  const tiposTriagem = useMemo(() => {
    return TIPOS_TRIAGEM.map((t) => ({
      ...t,
      permitido: hasPerm(t.perm),
    }));
  }, [hasPerm]);

  const nenhumDisponivel = tiposTriagem.length > 0 && tiposTriagem.every((t) => !t.permitido);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Triagem - Jurídico Atlanta RP</h1>
              <div className="text-xs text-blue-200">
                {user?.username ? `Logado como ${user.username}` : "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </button>

            <span className="text-sm">Bem-vindo, {displayName}</span>

            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-grow max-w-7xl mx-auto py-8 px-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Triagem por Tipo de Requerimento
        </h2>

        <p className="text-center text-gray-600 mb-10 max-w-3xl mx-auto">
          Selecione o tipo de triagem. Os cards aparecem/ativam conforme suas permissões no sistema.
        </p>

        {permsLoading ? (
          <div className="text-center text-gray-600 py-10">
            Carregando permissões...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tiposTriagem.map((tipo, index) => (
                <div
                  key={index}
                  className={`bg-white border ${
                    tipo.permitido
                      ? "border-indigo-200 hover:shadow-lg hover:border-indigo-300"
                      : "border-gray-200 opacity-60 cursor-not-allowed"
                  } rounded-xl p-6 text-center transition duration-200`}
                >
                  <tipo.icon
                    className={`h-12 w-12 mx-auto mb-4 ${
                      tipo.permitido ? "text-indigo-600" : "text-gray-400"
                    }`}
                  />

                  <h3 className="text-xl font-semibold mb-2">{tipo.nome}</h3>
                  <p className="text-gray-600 mb-4">{tipo.desc}</p>

                  <div className="text-[11px] text-gray-400 mb-3">{tipo.perm}</div>

                  <button
                    onClick={() => tipo.permitido && navigate(tipo.path)}
                    disabled={!tipo.permitido}
                    className={`px-6 py-2 rounded-md font-medium ${
                      tipo.permitido
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Acessar Triagem
                  </button>
                </div>
              ))}
            </div>

            {nenhumDisponivel && (
              <div className="text-center mt-10 text-gray-600 text-xl">
                Nenhum tipo de triagem disponível para você no momento.
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}
