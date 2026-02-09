// frontend/src/pages/requerimentos/RequerimentoNovo.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { getTipoBySlug } from "../../config/requerimentosTipos";
import { ArrowLeft, Save, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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
  for (const f of fields || []) {
    if (f.defaultValue !== undefined) {
      obj[f.name] = f.defaultValue;
    } else if (f.type === "select" && f.multiple) {
      obj[f.name] = [];
    } else if (f.type === "file") {
      obj[f.name] = null;
    } else {
      obj[f.name] = "";
    }
  }
  return obj;
}

function resolveOptions(field, values) {
  // normal
  if (!field) return [];

  // ✅ dependente: optionsByValue + dependsOn
  if (field.optionsByValue && field.dependsOn) {
    const parentValue = values?.[field.dependsOn];
    const map = field.optionsByValue || {};
    const opts = map[parentValue];
    return Array.isArray(opts) ? opts : [];
  }

  // fallback normal
  return Array.isArray(field.options) ? field.options : [];
}


function setField(name, value) {
  setValues((prev) => {
    const next = { ...prev, [name]: value };

    // ✅ se o field tiver "resets", limpa esses campos
    const field = (tipoCfg?.fields || []).find((f) => f.name === name);
    if (field?.resets?.length) {
      for (const depName of field.resets) {
        const depField = (tipoCfg?.fields || []).find((f) => f.name === depName);

        // se select multiple, zera array, senão string
        if (depField?.type === "select" && depField?.multiple) next[depName] = [];
        else next[depName] = "";
      }
    }

    return next;
  });
}


function MultiSelectDropdown({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = "Selecione...",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useMemo(() => ({ current: null }), []);

  const arr = Array.isArray(value) ? value : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o).toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, ref]);

  function toggle(opt) {
    const has = arr.includes(opt);
    const next = has ? arr.filter((x) => x !== opt) : [...arr, opt];
    onChange(next);
  }

  function clearAll() {
    onChange([]);
  }

  const summary =
    arr.length === 0 ? placeholder : arr.length === 1 ? arr[0] : `${arr.length} selecionados`;

  return (
    <div className="relative" ref={(node) => (ref.current = node)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full border border-gray-300 rounded-md p-2 bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between gap-3"
      >
        <span className={arr.length ? "text-gray-900" : "text-gray-500"}>{summary}</span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b bg-gray-50">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar ${label?.toLowerCase?.() || "opções"}...`}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
              <span>{arr.length} selecionado(s)</span>
              <button type="button" onClick={clearAll} className="text-red-600 hover:text-red-700">
                Limpar
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-auto p-2">
            {filtered.length === 0 ? (
              <div className="text-sm text-gray-500 p-2">Nenhuma opção encontrada.</div>
            ) : (
              filtered.map((opt) => {
                const checked = arr.includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-800">{opt}</span>
                  </label>
                );
              })
            )}
          </div>

          {arr.length > 0 && (
            <div className="p-2 border-t bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {arr.slice(0, 6).map((v) => (
                  <span
                    key={v}
                    className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded-full"
                    title={v}
                  >
                    {v}
                  </span>
                ))}
                {arr.length > 6 && <span className="text-xs text-gray-600">+{arr.length - 6}…</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
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

  // ✅ verificação por campo (map)
  // { [fieldName]: { status: "checking"|"ok"|"fail", identidade, cidadao, error } }
  const [verifMap, setVerifMap] = useState({});

  // ✅ pega TODOS os campos com verifyCadastro:true
  const verifyFields = useMemo(() => {
    return (tipoCfg?.fields || []).filter((f) => f.verifyCadastro);
  }, [tipoCfg]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!tipoCfg) {
      navigate("/requerimento");
      return;
    }
    if (!permitido) {
      alert("Acesso negado para este tipo de requerimento.");
      navigate(`/requerimentos/${slug}`);
      return;
    }

    setValues(initialValues(tipoCfg.fields));
    setErrors({});
    setVerifMap({}); // ✅ reseta mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuthenticated]);

  function setField(name, value) {
    setValues((p) => ({ ...p, [name]: value }));
  }

  // ✅ debounce + verificação no backend POR CAMPO
  useEffect(() => {
    if (!verifyFields.length) return;

    const timers = [];

    verifyFields.forEach((f) => {
      const identidade = String(values[f.name] || "").trim();

      // se vazio, remove do mapa
      if (!identidade) {
        setVerifMap((prev) => {
          if (!prev[f.name]) return prev;
          const next = { ...prev };
          delete next[f.name];
          return next;
        });
        return;
      }

      // marca como checking se mudou
      setVerifMap((prev) => {
        const current = prev[f.name];
        if (current?.status === "checking" && current?.identidade === identidade) return prev;
        return {
          ...prev,
          [f.name]: { status: "checking", identidade, cidadao: null, error: null },
        };
      });

      const t = setTimeout(async () => {
        try {
          const res = await axios.get(`${API_URL}/api/cadastros/existe`, {
            headers: authHeaders(),
            params: { identidade },
          });

          if (res.data?.exists) {
            setVerifMap((prev) => ({
              ...prev,
              [f.name]: {
                status: "ok",
                identidade,
                cidadao: res.data.cidadao || null,
                error: null,
              },
            }));
          } else {
            setVerifMap((prev) => ({
              ...prev,
              [f.name]: {
                status: "fail",
                identidade,
                cidadao: null,
                error: null,
              },
            }));
          }
        } catch (err) {
          setVerifMap((prev) => ({
            ...prev,
            [f.name]: {
              status: "fail",
              identidade,
              cidadao: null,
              error: err.response?.data?.msg || err.response?.data?.message || err.message,
            },
          }));
        }
      }, 500);

      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [values, verifyFields]);

  // ✅ bloqueia submit até TODOS verifyCadastro estarem OK e batendo com valor atual
  const submitDisabled = useMemo(() => {
    if (saving) return true;
    if (!verifyFields.length) return false;

    for (const f of verifyFields) {
      const identidade = String(values[f.name] || "").trim();
      if (!identidade) return true;

      const v = verifMap[f.name];
      if (!v) return true;
      if (v.status !== "ok") return true;
      if (v.identidade !== identidade) return true;
    }

    return false;
  }, [saving, verifyFields, values, verifMap]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!tipoCfg) return;

    const v = validate(tipoCfg.fields, values);
    setErrors(v);
    if (Object.keys(v).length) return;

    // ✅ valida todos verifyCadastro
    if (verifyFields.length) {
      for (const f of verifyFields) {
        const identidade = String(values[f.name] || "").trim();

        if (!identidade) {
          setErrors((p) => ({ ...p, [f.name]: "Campo obrigatório" }));
          return;
        }

        const ver = verifMap[f.name];
        if (!ver || ver.status !== "ok" || ver.identidade !== identidade) {
          setToast({
            type: "err",
            text: `Identidade do cartório não encontrada (ou ainda verificando) em: ${f.label}`,
          });
          return;
        }
      }
    }

    setSaving(true);
    setToast(null);

    try {
      const payload = {
        tipo: tipoCfg.tipoDb,
        dados: values,
        solicitante: user?.username || "Usuário",
      };

      await axios.post(`${API_URL}/api/requerimentos`, payload, { headers: authHeaders() });

      setToast({ type: "ok", text: "Requerimento criado com sucesso!" });
      navigate(`/requerimentos/${slug}`);
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
            {tipoCfg.fields.map((f) => {
              const ver = f.verifyCadastro ? verifMap[f.name] : null;

              return (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {f.label} {f.required ? <span className="text-red-600">*</span> : null}
                  </label>

                  {f.type === "file" ? (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept={f.accept || "image/*"}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;

                          // validações simples (opcional)
                          if (file && f.maxSizeMB && file.size > f.maxSizeMB * 1024 * 1024) {
                            setToast({ type: "err", text: `Arquivo muito grande. Máx: ${f.maxSizeMB}MB` });
                            e.target.value = ""; // limpa
                            setField(f.name, null);
                            return;
                          }

                          setField(f.name, file);
                        }}
                        className="w-full border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* Preview (opcional) */}
                      {f.preview && values[f.name] instanceof File ? (
                        <img
                          src={URL.createObjectURL(values[f.name])}
                          alt="Pré-visualização"
                          className="max-h-56 rounded-lg border border-gray-200"
                          onLoad={(e) => {
                            // libera a URL depois de carregar (evita leak)
                            const img = e.currentTarget;
                            const src = img.src;
                            setTimeout(() => URL.revokeObjectURL(src), 1000);
                          }}
                        />
                      ) : null}

                      {values[f.name] instanceof File ? (
                        <div className="text-xs text-gray-600">
                          {values[f.name].name} • {(values[f.name].size / 1024 / 1024).toFixed(2)}MB
                        </div>
                      ) : null}
                    </div>
                  ) : f.type === "select" ? (
                  f.multiple ? (
                  <MultiSelectDropdown
                    label={f.label}
                    options={resolveOptions(f, values)}
                    value={Array.isArray(values[f.name]) ? values[f.name] : []}
                    onChange={(arr) => setField(f.name, arr)}
                    placeholder="Selecione..."
                  />
                  ) : (
                  <select
                    value={values[f.name] || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!f.dependsOn && !values?.[f.dependsOn]} // ✅ desabilita até escolher estado
                  >
                    <option value="">
                      {f.placeholder || "Selecione..."}
                    </option>

                    {resolveOptions(f, values).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  )
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

                  {/* ✅ status de verificação POR CAMPO */}
                  {f.verifyCadastro && ver && (
                    <div className="mt-2 text-sm">
                      {ver.status === "checking" ? (
                        <span className="inline-flex items-center gap-2 text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" /> Verificando no cartório...
                        </span>
                      ) : ver.status === "ok" ? (
                        <span className="inline-flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full">
                          <CheckCircle2 className="h-4 w-4" />
                          Encontrado: <b>{ver.cidadao?.nomeCompleto || "Cidadão"}</b> ({ver.cidadao?.status})
                        </span>
                      ) : ver.status === "fail" ? (
                        <span className="inline-flex items-center gap-2 text-red-700 bg-red-50 px-3 py-1 rounded-full">
                          <XCircle className="h-4 w-4" />
                          Não encontrado no banco do cartório{ver.error ? `: ${ver.error}` : "."}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {errors[f.name] && <p className="text-xs text-red-700 mt-1">{errors[f.name]}</p>}
                </div>
              );
            })}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitDisabled}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Criar requerimento"}
              </button>
            </div>

            {/* dica rápida pra dev */}
            {verifyFields.length > 0 && (
              <p className="text-xs text-gray-500">
                * Este tipo exige validação do cartório antes de enviar (todos os campos marcados).
              </p>
            )}
          </form>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}