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

  // ✅ NOVO: permissões efetivas (keys)
  const [perms, setPerms] = useState([]); // array de strings
  const [permsLoading, setPermsLoading] = useState(false);

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
        navigate("/login");
      } else {
        setUser(decoded);
      }
    } catch (err) {
      console.error("Token inválido:", err);
      localStorage.removeItem("token");
      setUser(null);
      setCidadao(null);
      setPerms([]);
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

    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/me/cidadao`, {
          headers: authHeaders(),
        });
        setCidadao(res.data?.cidadao || null);
      } catch (e) {
        setCidadao(null);
      }
    })();
  }, [user]);

  // ✅ 3) depois que tiver user, busca permissões efetivas
  useEffect(() => {
    if (!user) {
      setPerms([]);
      return;
    }

    (async () => {
      setPermsLoading(true);
      try {
        // ⚠️ você precisa criar esse endpoint no backend
        // resposta esperada: { perms: ["triagem.acessar.alvara", ...] }  OU { permissions: [...] }
        const res = await axios.get(`${API_URL}/api/me/perms`, {
          headers: authHeaders(),
        });

        const arr =
          (Array.isArray(res.data?.perms) && res.data.perms) ||
          (Array.isArray(res.data?.permissions) && res.data.permissions) ||
          [];

        setPerms(arr.map(String));
      } catch (e) {
        // Se der erro, deixa vazio => ninguém vê nada (mais seguro)
        setPerms([]);
      } finally {
        setPermsLoading(false);
      }
    })();
  }, [user]);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setCidadao(null);
    setPerms([]);
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

        // ✅ NOVO
        perms,
        permsLoading,
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
