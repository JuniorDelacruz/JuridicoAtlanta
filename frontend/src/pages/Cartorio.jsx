// frontend/src/pages/Cartorio.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Scale, UserPlus, Shield, FileCheck, ArrowLeft, Upload, X } from "lucide-react";
import { useToast } from "../utils/toast";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://apijuridico.starkstore.dev.br";

// ✅ perms novas (por ação)
const PERM_CADASTRAR_CIDADAO = "cartorio.acessar.cadastrarcidadao";
const PERM_CADASTRAR_PORTE_ARMA = "cartorio.acessar.cadastrarportedearma";
const PERM_ACESSAR_RECOLHIMENTOS = "cartorio.acessar.recolhimentos";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Cartorio() {
  const { user, logout, isAuthenticated, hasPerm } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [showForm, setShowForm] = useState(null); // null, 'cadastro', 'arma', 'recolhimento'
  const [formDados, setFormDados] = useState({});
  const [enviando, setEnviando] = useState(false);

  const [previewImage, setPreviewImage] = useState(null);
  const [imagemFile, setImagemFile] = useState(null);

  const [armaForm, setArmaForm] = useState({
    cidadaoId: "",
    porteNumero: "",
    numeroSerial: "",
  });

  // Porte validation UI
  const [porteOk, setPorteOk] = useState(false);
  const [porteMsg, setPorteMsg] = useState("");
  const [porteStatus, setPorteStatus] = useState("idle"); // idle | checking | ok | error

  // Errors for weapon form
  const [armaErrors, setArmaErrors] = useState({
    cidadaoId: "",
    porteNumero: "",
    numeroSerial: "",
    imagemIdentidade: "",
    geral: "",
  });

  function setArmaError(field, message) {
    setArmaErrors((prev) => ({ ...prev, [field]: message || "" }));
  }

  function clearArmaErrors() {
    setArmaErrors({
      cidadaoId: "",
      porteNumero: "",
      numeroSerial: "",
      imagemIdentidade: "",
      geral: "",
    });
  }

  function mapBackendMessageToField(message = "") {
    const msg = String(message || "").toLowerCase();

    if (msg.includes("porte")) return "porteNumero";
    if (msg.includes("cidadão") || msg.includes("cidadao")) return "cidadaoId";
    if (msg.includes("serial") || msg.includes("série") || msg.includes("serie")) return "numeroSerial";
    if (msg.includes("imagem") || msg.includes("foto") || msg.includes("arquivo")) return "imagemIdentidade";

    return "geral";
  }

  // ✅ Permissões por ação (vindas do hasPerm do AuthContext)
  const podeCadastro = !!hasPerm?.(PERM_CADASTRAR_CIDADAO);
  const podeRegistroArma = !!hasPerm?.(PERM_CADASTRAR_PORTE_ARMA);
  const podeRecolhimento = !!hasPerm?.(PERM_ACESSAR_RECOLHIMENTOS);

  const podeAcessarPagina = podeCadastro || podeRegistroArma || podeRecolhimento;

  // Gate da página
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const resetArmaState = () => {
    setArmaForm({ cidadaoId: "", porteNumero: "", numeroSerial: "" });
    setPorteOk(false);
    setPorteMsg("");
    setPorteStatus("idle");
    clearArmaErrors();
  };

  const resetUploadState = () => {
    if (previewImage) URL.revokeObjectURL(previewImage);
    setPreviewImage(null);
    setImagemFile(null);
  };

  const abrirFormulario = (tipo) => {
    if (tipo === "cadastro" && !podeCadastro) {
      return push({ type: "error", title: "Acesso negado.", message: "Você não tem permissão para Cadastrar Novo Cidadão." });
    }
    if (tipo === "arma" && !podeRegistroArma) {
      return push({ type: "error", title: "Acesso negado.", message: "Você não tem permissão para Solicitar Porte de Arma." });
    }
    if (tipo === "recolhimento" && !podeRecolhimento) {
      return push({ type: "error", title: "Acesso negado.", message: "Você não tem permissão para Acessar Recolhimentos." });
    }

    setShowForm(tipo);
    setFormDados({});
    setEnviando(false);

    resetUploadState();
    resetArmaState();
  };

  const fecharFormulario = () => {
    setShowForm(null);
    setFormDados({});
    setEnviando(false);

    resetUploadState();
    resetArmaState();
  };

  async function checarPorte() {
    setPorteOk(false);
    setPorteMsg("");
    setPorteStatus("idle");

    setArmaError("porteNumero", "");
    setArmaError("geral", "");

    const porteNumero = armaForm.porteNumero.trim();
    const cidadaoId = armaForm.cidadaoId.trim();

    if (!cidadaoId) {
      setArmaError("cidadaoId", "Informe o Número do Cidadão.");
      return;
    }
    if (!porteNumero) {
      setArmaError("porteNumero", "Informe o Número do Porte.");
      return;
    }

    try {
      setPorteStatus("checking");

      const res = await axios.post(
        `${API_URL}/api/cartorio/porte/validar`,
        { porteNumero, cidadaoId },
        { headers: { ...authHeaders(), "Content-Type": "application/json" } }
      );

      if (res.data?.ok) {
        setPorteOk(true);
        setPorteMsg("Porte validado ✅");
        setPorteStatus("ok");
      } else {
        const message = res.data?.message || "Falha ao validar porte.";
        const field = mapBackendMessageToField(message);
        setArmaError(field, message);
        setPorteStatus("error");
      }
    } catch (e) {
      const message = e.response?.data?.message || "Falha ao validar porte.";
      const field = mapBackendMessageToField(message);
      setArmaError(field, message);
      setPorteStatus("error");
    }
  }

  const handleImageLocal = (file) => {
    if (!file || !file.type?.startsWith("image/")) {
      push({ type: "warning", title: "Aviso", message: "Apenas imagens são permitidas." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      push({ type: "warning", title: "Aviso", message: "Imagem muito grande (máx 5MB)." });
      return;
    }

    setArmaError("imagemIdentidade", "");

    if (previewImage) URL.revokeObjectURL(previewImage);
    const previewUrl = URL.createObjectURL(file);

    setPreviewImage(previewUrl);
    setImagemFile(file);
    setFormDados({ ...formDados, imagemIdentidade: "pendente" });
  };

  const removerImagem = () => {
    if (previewImage) URL.revokeObjectURL(previewImage);
    setPreviewImage(null);
    setImagemFile(null);
    setFormDados({ ...formDados, imagemIdentidade: null });
  };

  const handleRegistroArma = async () => {
    clearArmaErrors();
    setEnviando(true);

    const cidadaoId = armaForm.cidadaoId.trim();
    const porteNumero = armaForm.porteNumero.trim();
    const numeroSerial = armaForm.numeroSerial.trim();

    let hasError = false;

    if (!cidadaoId) {
      setArmaError("cidadaoId", "Informe o Número do Cidadão.");
      hasError = true;
    }
    if (!porteNumero) {
      setArmaError("porteNumero", "Informe o Número do Porte.");
      hasError = true;
    }
    if (!numeroSerial) {
      setArmaError("numeroSerial", "Informe o Número de Série.");
      hasError = true;
    }
    if (!imagemFile) {
      setArmaError("imagemIdentidade", "Envie a imagem da identidade.");
      hasError = true;
    }

    if (hasError) {
      setEnviando(false);
      return;
    }

    if (!porteOk) {
      setArmaError("porteNumero", "Valide o porte antes de prosseguir.");
      setEnviando(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("cidadaoId", cidadaoId);
      formData.append("porteNumero", porteNumero);
      formData.append("numeroSerial", numeroSerial);
      formData.append("imagemIdentidade", imagemFile);

      await axios.post(`${API_URL}/api/cartorio/arma/registro`, formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });

      push({ type: "success", title: "Enviado", message: "Registro/solicitação enviada para triagem!" });
      fecharFormulario();
    } catch (e) {
      const message = e.response?.data?.message || "Erro ao enviar registro.";
      const field = mapBackendMessageToField(message);
      setArmaError(field, message);
    } finally {
      setEnviando(false);
    }
  };

  const handleRegistrar = async () => {
    if (
      !formDados.nomeCompleto ||
      !formDados.identidade ||
      !formDados.profissao ||
      !formDados.residencia ||
      !formDados.discordId ||
      !imagemFile
    ) {
      return push({ type: "warning", title: "Aviso", message: "Preencha todos os campos obrigatórios e envie a imagem!" });
    }

    setEnviando(true);

    const formData = new FormData();
    formData.append("nomeCompleto", formDados.nomeCompleto);
    formData.append("pombo", formDados.pombo || "");
    formData.append("identidade", formDados.identidade);
    formData.append("profissao", formDados.profissao);
    formData.append("residencia", formDados.residencia);
    formData.append("discordId", formDados.discordId);
    formData.append("imagemIdentidade", imagemFile);

    try {
      await axios.post(`${API_URL}/api/cartorio/cadastro`, formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });

      push({ type: "success", title: "Enviado", message: "Cadastro enviado com sucesso para triagem!" });
      fecharFormulario();
    } catch (err) {
      push({ type: "error", title: "Erro", message: err.response?.data?.msg || "Erro ao enviar cadastro, tente novamente!" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8" />
            <h1 className="text-xl font-bold">Cartório - Jurídico Atlanta RP</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
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

      {/* Conteúdo principal */}
      <main className="flex-grow max-w-7xl mx-auto py-8 px-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Cartório - Execução de Atos Aprovados</h2>

        <p className="text-center text-gray-600 mb-10 max-w-3xl mx-auto">
          Aqui são realizados apenas os atos administrativos já aprovados na triagem. Nenhum tipo de análise ou decisão é feita nesta etapa.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Cartão Novo Cadastro */}
          <div
            className={`bg-white border ${
              podeCadastro ? "border-blue-200 hover:shadow-lg" : "border-gray-200 opacity-60"
            } rounded-xl p-6 text-center transition`}
          >
            <UserPlus className={`h-12 w-12 mx-auto mb-4 ${podeCadastro ? "text-blue-600" : "text-gray-400"}`} />
            <h3 className="text-xl font-semibold mb-2">Novo Cadastro de Cidadão</h3>
            <p className="text-gray-600 mb-4">Registro inicial de cidadão no sistema.</p>
            <button
              onClick={() => abrirFormulario("cadastro")}
              disabled={!podeCadastro}
              className={`px-6 py-2 rounded-md font-medium ${
                podeCadastro ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Iniciar
            </button>
          </div>

          {/* Cartão Registro / Solicitar Porte */}
          <div
            className={`bg-white border ${
              podeRegistroArma ? "border-green-200 hover:shadow-lg" : "border-gray-200 opacity-60"
            } rounded-xl p-6 text-center transition`}
          >
            <Shield className={`h-12 w-12 mx-auto mb-4 ${podeRegistroArma ? "text-green-600" : "text-gray-400"}`} />
            <h3 className="text-xl font-semibold mb-2">Solicitar Porte / Registro</h3>
            <p className="text-gray-600 mb-4">Solicitação/registro vinculado ao porte (após validação).</p>
            <button
              onClick={() => abrirFormulario("arma")}
              disabled={!podeRegistroArma}
              className={`px-6 py-2 rounded-md font-medium ${
                podeRegistroArma ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Iniciar
            </button>
          </div>

          {/* Cartão Recolhimentos */}
          <div
            className={`bg-white border ${
              podeRecolhimento ? "border-purple-200 hover:shadow-lg" : "border-gray-200 opacity-60"
            } rounded-xl p-6 text-center transition`}
          >
            <FileCheck className={`h-12 w-12 mx-auto mb-4 ${podeRecolhimento ? "text-purple-600" : "text-gray-400"}`} />
            <h3 className="text-xl font-semibold mb-2">Recolhimentos</h3>
            <p className="text-gray-600 mb-4">Registro de recolhimentos administrativos.</p>
            <button
              onClick={() => abrirFormulario("recolhimento")}
              disabled={!podeRecolhimento}
              className={`px-6 py-2 rounded-md font-medium ${
                podeRecolhimento ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Iniciar
            </button>
          </div>
        </div>

        {/* Modal para formulário */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-2xl font-bold">
                  {showForm === "cadastro"
                    ? "Novo Cadastro de Cidadão"
                    : showForm === "arma"
                    ? "Solicitar Porte / Registro"
                    : "Recolhimentos"}
                </h3>
                <button onClick={fecharFormulario} className="text-gray-600 hover:text-gray-800">
                  Fechar
                </button>
              </div>

              <div className="p-6">
                {showForm === "cadastro" ? (
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                      <input
                        type="text"
                        value={formDados.nomeCompleto || ""}
                        onChange={(e) => setFormDados({ ...formDados, nomeCompleto: e.target.value })}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pombo</label>
                      <input
                        type="text"
                        value={formDados.pombo || ""}
                        onChange={(e) => setFormDados({ ...formDados, pombo: e.target.value })}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Identidade</label>
                      <input
                        type="text"
                        value={formDados.identidade || ""}
                        onChange={(e) => setFormDados({ ...formDados, identidade: e.target.value })}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Profissão</label>
                      <input
                        type="text"
                        value={formDados.profissao || ""}
                        onChange={(e) => setFormDados({ ...formDados, profissao: e.target.value })}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Residência</label>
                      <input
                        type="text"
                        value={formDados.residencia || ""}
                        onChange={(e) => setFormDados({ ...formDados, residencia: e.target.value })}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Discord do Cidadão</label>
                      <input
                        type="text"
                        value={formDados.discordId || ""}
                        onChange={(e) => setFormDados({ ...formDados, discordId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 123456789012345678"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Imagem da Identidade</label>
                      <div
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleImageLocal(file);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
                      >
                        {previewImage ? (
                          <div className="relative">
                            <img src={previewImage} alt="Pré-visualização" className="max-h-48 mx-auto rounded-md" />
                            <button
                              type="button"
                              onClick={removerImagem}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-600">Arraste a imagem aqui ou</p>
                            <label className="text-blue-600 hover:underline cursor-pointer">
                              clique para selecionar
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleImageLocal(f);
                                }}
                                className="hidden"
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={fecharFormulario}
                        className="px-6 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleRegistrar}
                        disabled={enviando}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {enviando ? "Enviando..." : "Enviar para Triagem"}
                      </button>
                    </div>
                  </form>
                ) : showForm === "arma" ? (
                  <form className="space-y-4">
                    {armaErrors.geral && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {armaErrors.geral}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cidadão (Cartório)</label>
                      <input
                        type="text"
                        value={armaForm.cidadaoId || ""}
                        onChange={(e) => {
                          setArmaForm({ ...armaForm, cidadaoId: e.target.value });
                          setArmaError("cidadaoId", "");
                          setPorteOk(false);
                          setPorteMsg("");
                          setPorteStatus("idle");
                        }}
                        className={`w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          armaErrors.cidadaoId ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ex: 123"
                        required
                      />
                      {armaErrors.cidadaoId && <p className="mt-1 text-sm text-red-600">{armaErrors.cidadaoId}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número do Porte</label>
                      <input
                        type="text"
                        value={armaForm.porteNumero}
                        onChange={(e) => {
                          setArmaForm({ ...armaForm, porteNumero: e.target.value });
                          setArmaError("porteNumero", "");
                          setPorteOk(false);
                          setPorteMsg("");
                          setPorteStatus("idle");
                        }}
                        className={`w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          armaErrors.porteNumero
                            ? "border-red-500"
                            : porteStatus === "ok"
                            ? "border-green-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Ex: 999"
                        onBlur={checarPorte}
                        required
                      />

                      {porteStatus === "checking" && <p className="mt-1 text-sm text-gray-500">Validando porte...</p>}
                      {porteStatus === "ok" && porteMsg && <p className="mt-1 text-sm text-green-600">{porteMsg}</p>}
                      {armaErrors.porteNumero && <p className="mt-1 text-sm text-red-600">{armaErrors.porteNumero}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
                      <input
                        type="text"
                        value={armaForm.numeroSerial}
                        onChange={(e) => {
                          setArmaForm({ ...armaForm, numeroSerial: e.target.value });
                          setArmaError("numeroSerial", "");
                        }}
                        className={`w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          armaErrors.numeroSerial ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ex: ABC-123"
                        required
                      />
                      {armaErrors.numeroSerial && <p className="mt-1 text-sm text-red-600">{armaErrors.numeroSerial}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Imagem da Identidade</label>
                      <div
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleImageLocal(file);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
                      >
                        {previewImage ? (
                          <div className="relative">
                            <img src={previewImage} alt="Pré-visualização" className="max-h-48 mx-auto rounded-md" />
                            <button
                              type="button"
                              onClick={removerImagem}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-600">Arraste a imagem aqui ou</p>
                            <label className="text-blue-600 hover:underline cursor-pointer">
                              clique para selecionar
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleImageLocal(f);
                                }}
                                className="hidden"
                              />
                            </label>
                          </>
                        )}
                      </div>

                      {armaErrors.imagemIdentidade && (
                        <p className="mt-2 text-sm text-red-600">{armaErrors.imagemIdentidade}</p>
                      )}
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={fecharFormulario}
                        className="px-6 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleRegistroArma}
                        disabled={enviando}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {enviando ? "Enviando..." : "Enviar para Triagem"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-10 text-gray-600">Formulário de Recolhimentos em desenvolvimento...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}
