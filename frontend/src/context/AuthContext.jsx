import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const AuthContext = createContext();

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cidadao, setCidadao] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

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
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        setUser(null);
        setCidadao(null);
        navigate("/login");
      } else {
        setUser(decoded);
      }
    } catch (err) {
      console.error("Token inválido:", err);
      localStorage.removeItem("token");
      setUser(null);
      setCidadao(null);
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

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setCidadao(null);
    navigate("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        cidadao,
        logout,
        isAuthenticated: !!user,
        displayName: (cidadao?.nomeCompleto?.trim() ? cidadao.nomeCompleto : user?.username) || "Usuário",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);