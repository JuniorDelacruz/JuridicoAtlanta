// AuthContext.jsx
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

  const [perms, setPerms] = useState([]);
  const [permsLoading, setPermsLoading] = useState(false);

  // ✅ indica que já tentamos carregar perms (sucesso ou falha)
  const [permsReady, setPermsReady] = useState(false);

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const permsSet = useMemo(() => new Set((perms || []).map(String)), [perms]);

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
      setPerms([]);
      setPermsLoading(false);
      setPermsReady(true); // ✅ nada pra carregar
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        setUser(null);
        setCidadao(null);
        setPerms([]);
        setPermsLoading(false);
        setPermsReady(true);
        navigate("/login");
      } else {
        // ✅ token OK
        setUser(decoded);

        // ✅ AQUI está o fix do F5:
        // assim que autenticou, marca perms como "ainda não prontas"
        // e já liga o loading de perms, evitando a página negar antes do fetch
        setPerms([]);              // evita usar permissões antigas na UI
        setPermsReady(false);
        setPermsLoading(true);
      }
    } catch (err) {
      console.error("Token inválido:", err);
      localStorage.removeItem("token");
      setUser(null);
      setCidadao(null);
      setPerms([]);
      setPermsLoading(false);
      setPermsReady(true);
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
        if (alive) setCidadao(res.data?.cidadao || null);
      } catch {
        if (alive) setCidadao(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  // 3) depois que tiver user, busca permissões efetivas
  useEffect(() => {
    if (!user) {
      setPerms([]);
      setPermsLoading(false);
      setPermsReady(true);
      return;
    }

    let alive = true;

    (async () => {
      // ✅ garante estado coerente ao iniciar fetch (principalmente no F5)
      if (alive) {
        setPermsReady(false);
        setPermsLoading(true);
      }

      try {
        const res = await axios.get(`${API_URL}/api/me/perms`, {
          headers: authHeaders(),
        });

        const arr =
          (Array.isArray(res.data?.perms) && res.data.perms) ||
          (Array.isArray(res.data?.permissions) && res.data.permissions) ||
          [];

        if (alive) setPerms(arr.map(String));
      } catch (e) {
        if (alive) setPerms([]); // seguro
      } finally {
        if (alive) {
          setPermsLoading(false);
          setPermsReady(true); // ✅ terminou (ok ou erro)
        }
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
    setPerms([]);
    setPermsLoading(false);
    setPermsReady(true);
    navigate("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  const displayName =
    (cidadao?.nomeCompleto?.trim() ? cidadao.nomeCompleto : user?.username) || "Usuário";

  return (
    <AuthContext.Provider
      value={{
        user,
        cidadao,
        logout,
        isAuthenticated: !!user,
        displayName,

        perms,
        permsLoading,
        permsReady,
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
