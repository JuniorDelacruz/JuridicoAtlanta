// frontend/src/pages/Login.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const backendAuthUrl = useMemo(() => {
    // Em produção, troque por env (VITE_API_URL etc.)
    return "https://apijuridico.starkstore.dev.br/api/auth/discord";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const err = params.get("error");

    if (err) {
      setError("Não foi possível concluir o login. Tente novamente.");
      // limpa a URL, mantém na mesma rota
      navigate(location.pathname, { replace: true });
      return;
    }

    if (!token) return;

    try {
      setIsProcessing(true);
      localStorage.setItem("token", token);

      // limpa a URL SEM recarregar
      navigate("/dashboard", { replace: true });
    } catch (e) {
      console.error(e);
      setError("Falha ao salvar seu login. Verifique as permissões do navegador.");
      setIsProcessing(false);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#070a14] flex items-center justify-center px-6">
      {/* Blobs / glow */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-44 -left-44 h-[520px] w-[520px] rounded-full bg-blue-500/20 blur-[90px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:18px_18px] opacity-30" />

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-white font-black text-lg">JR</span>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Sistema Jurídico
                </h1>
                <p className="text-sm text-white/60">
                  Atlanta Roleplay • Acesso via Discord
                </p>
              </div>
            </div>

            {/* Texto */}
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Faça login com sua conta do Discord para acessar os módulos do sistema
              conforme seu <span className="text-white font-semibold">cargo</span> e{" "}
              <span className="text-white font-semibold">subcargo</span>.
            </p>

            {/* Erro */}
            {error ? (
              <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {/* Botão */}
            <a
              href={backendAuthUrl}
              className={`group inline-flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 font-extrabold transition
                ${isProcessing ? "pointer-events-none opacity-70" : "hover:opacity-95"}
                bg-[#5865F2]`}
              onClick={() => setIsProcessing(true)}
            >
              {/* Ícone Discord simples (sem lib) */}
              <svg
                className="h-5 w-5 opacity-95 group-hover:opacity-100"
                viewBox="0 0 127.14 96.36"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,63.42,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.41,77.41,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14C130.29,52.84,122.35,28.94,107.7,8.07ZM42.45,65.69c-6.18,0-11.23-5.66-11.23-12.63S36.2,40.43,42.45,40.43,53.74,46.11,53.68,53.06,48.7,65.69,42.45,65.69Zm42.24,0c-6.18,0-11.23-5.66-11.23-12.63s5-12.63,11.23-12.63S95.92,46.11,95.86,53.06,90.94,65.69,84.69,65.69Z" />
              </svg>

              <span>{isProcessing ? "Conectando..." : "Entrar com Discord"}</span>

              <span className="ml-auto text-white/70 group-hover:text-white transition">
                →
              </span>
            </a>

            {/* Status */}
            {isProcessing ? (
              <div className="mt-4 text-center text-xs text-white/60">
                Se o login demorar, verifique se o pop-up foi bloqueado ou tente novamente.
              </div>
            ) : (
              <div className="mt-4 text-center text-xs text-white/50">
                Ao entrar, você concorda com os termos internos de uso do sistema.
              </div>
            )}
          </div>

          {/* Footer do card */}
          <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
            <span>Segurança: token com expiração</span>
            <span className="text-white/60 font-semibold">v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;