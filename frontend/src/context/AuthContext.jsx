// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const AuthContext = createContext();
const API_URL = "https://apijuridico.starkstore.dev.br";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cidadao, setCidadao] = useState(null);

  // ✅ estado atômico de perms (evita permsReady=true com perms ainda vazio no mesmo render)
  const [permState, setPermState] = useState({
    list: [],
    loading: false,
    ready: false,     // "já terminou de carregar" (ok ou erro)
    version: 0,       // incrementa quando aplicou uma lista nova
  });

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const permsSet = useMemo(
    () => new Set((permState.list || []).map((x) => String(x))),
    [permState.list]
  );

  const hasPerm = (key) => permsSet.has(String(key));
  const hasAnyPerm = (keys) => (keys || []).some((k) => hasPerm(k));
  const hasAllPerms = (keys) => (keys || []).every((k) => hasPerm(k));

  // 1) resolve token e user
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
      localStorage.setItem("token", tokenFromUrl);
      navigate(location.pathname, { replace: true });
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setCidadao(null);
      setPermState((s) => ({
        ...s,
        list: [],
        loading: false,
        ready: true,
        version: s.version + 1,
      }));
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        setUser(null);
        setCidadao(null);
        setPermState((s) => ({
          ...s,
          list: [],
          loading: false,
          ready: true,
          version: s.version + 1,
        }));
        navigate("/login");
      } else {
        setUser(decoded);

        // ✅ importante: ao entrar com token, ainda NÃO sabemos perms
        setPermState((s) => ({
          ...s,
          ready: false,
          loading: false,
        }));
      }
    } catch (err) {
      console.error("Token inválido:", err);
      localStorage.removeItem("token");
      setUser(null);
      setCidadao(null);
      setPermState((s) => ({
        ...s,
        list: [],
        loading: false,
        ready: true,
        version: s.version + 1,
      }));
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [location.search, location.pathname, navigate]);

  // 2) depois que tiver user, busca cidadao
  useEffect(() => {
    if (!user) {
      setCidadao(null);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/me/cidadao`, {
          headers: authHeaders(),
        });
        if (!alive) return;
        setCidadao(res.data?.cidadao || null);
      } catch {
        if (!alive) return;
        setCidadao(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  // 3) depois que tiver user, busca permissões efetivas
  useEffect(() => {
    if (!user) return;

    let alive = true;

    (async () => {
      // começa loading
      setPermState((s) => ({ ...s, loading: true, ready: false }));

      try {
        const res = await axios.get(`${API_URL}/api/me/perms`, {
          headers: authHeaders(),
        });

        const arr =
          (Array.isArray(res.data?.perms) && res.data.perms) ||
          (Array.isArray(res.data?.permissions) && res.data.permissions) ||
          [];

        if (!alive) return;

        // ✅ ATÔMICO: aplica list + ready juntos (evita o bug do F5)
        setPermState((s) => ({
          ...s,
          list: arr.map(String),
          loading: false,
          ready: true,
          version: s.version + 1,
        }));
      } catch (e) {
        if (!alive) return;

        // seguro: sem perms
        setPermState((s) => ({
          ...s,
          list: [],
          loading: false,
          ready: true,
          version: s.version + 1,
        }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setCidadao(null);
    setPermState((s) => ({
      ...s,
      list: [],
      loading: false,
      ready: true,
      version: s.version + 1,
    }));
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  const displayName =
    (cidadao?.nomeCompleto?.trim() ? cidadao.nomeCompleto : user?.username) ||
    "Usuário";

  return (
    <AuthContext.Provider
      value={{
        user,
        cidadao,
        logout,
        isAuthenticated: !!user,
        displayName,

        // perms
        perms: permState.list,
        permsLoading: permState.loading,
        permsReady: permState.ready,
        permsVersion: permState.version, // ✅ importante pra páginas aguardarem “commit”

        hasPerm,
        hasAnyPerm,
        hasAllPerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
