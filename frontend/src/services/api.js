import axios from "axios";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// ✅ sempre injeta Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ trata 401/403 globalmente
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // token inválido/expirado
    if (status === 401) {
      localStorage.removeItem("token");
      // se você tiver "user" salvo em storage, limpa tb
      localStorage.removeItem("user");

      // manda pro login sem depender de useNavigate (funciona fora de componente)
      window.location.href = "/login";
      return; // encerra
    }

    // sem permissão
    if (status === 403) {
      // opcional: mandar pra dashboard ou mostrar toast
      // window.location.href = "/dashboard";
    }

    return Promise.reject(err);
  }
);
