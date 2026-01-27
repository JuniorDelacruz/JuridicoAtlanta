import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { getTipoBySlug } from "../../config/requerimentosTipos";
import { ArrowLeft, Save } from "lucide-react";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

function initialValues(fields) {
  const obj = {};
  for (const f of fields || []) obj[f.name] = f.defaultValue ?? "";
  return obj;
}

function validate(fields, values) {
  const errors = {};
  for (const f of fields || []) {
    if (f.required) {
      const v = values[f.name];
      const empty = v === null || v === undefined || String(v).trim() === "";
      if (empty) errors[f.name] = "Campo obrigatório";
    }
  }
  return errors;
}

export default function RequerimentoNovo() {
  const { slug } = useParams();
  const tipoCfg = getTipoBySlug(slug);

  const { user, logout, isAuthenticated } = useAuth();
  const isEquipeJuridica = user?.subRole === "equipejuridico";
  const navigate = useNavigate();

  const permitido = useMemo(() => {
    if (!tipoCfg) return false;
    return tipoCfg.roles.includes(user?.role) || isEquipeJuridica || user?.role === "admin";
  }, [tipoCfg, user?.role, isEquipeJuridica]);

  const [values, setValues] = useState(() => initialValues(tipoCfg?.fields));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!tipoCfg) {
      navigate("/requerimentos");
      return;
    }
    if (!permitido) {
      alert("Acesso negado para este tipo de requerimento.");
      navigate(`/requerimentos/${slug}`);
      return;
    }
    setValues(initialValues(tipoCfg.fields));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuthenticated]);

  function setField(name, value) {
    setValues((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!tipoCfg) return;

    const v = validate(tipoCfg.fields, values);
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setToast(null);
    try {
      const payload = {
        tipo: tipoCfg.tipoDb,
        dados: values,
        solicitante: user?.username || "Usuário",
      };

      await axios.post(`${API_URL}/api/requerimentos`, payload, {
        headers: authHeaders(),
      });

      setToast({ type: "ok", text: "Requerimento criado com sucesso!" });
      navigate(`/requerimentos/${slug}`); // volta pra lista do tipo
    } catch (err) {
      setToast({
        type: "err",
        text: err.response?.data?.msg || err.response?.data?.message || err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!tipoCfg) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Novo Requerimento — {tipoCfg.label}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/requerimentos/${slug}`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
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

      <main className="flex-grow max-w-3xl mx-auto py-8 px-6 w-full">
        {toast?.type === "err" && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
            <b>Erro:</b> {toast.text}
          </div>
        )}
        {toast?.type === "ok" && (
          <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg">
            {toast.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{tipoCfg.label}</h2>
          <p className="text-gray-600 mb-6">Preencha os campos abaixo para abrir o requerimento.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            {tipoCfg.fields.map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {f.label} {f.required ? <span className="text-red-600">*</span> : null}
                </label>

                {f.type === "select" ? (
                  <select
                    value={values[f.name] || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {(f.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    value={values[f.name] || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type={f.type || "text"}
                    value={values[f.name] || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {errors[f.name] && <p className="text-xs text-red-700 mt-1">{errors[f.name]}</p>}
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Criar requerimento"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}