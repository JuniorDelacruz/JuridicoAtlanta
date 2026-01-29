// frontend/src/pages/Cartorio.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Scale, UserPlus, Shield, FileCheck, ArrowLeft, Upload, X } from 'lucide-react';





function Cartorio() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(null); // null, 'cadastro', 'arma', 'recolhimento'
    const [formDados, setFormDados] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [armaForm, setArmaForm] = useState({
        cidadaoId: "",
        porteNumero: "",
        numeroSerial: "",
    });

    const [porteOk, setPorteOk] = useState(false);
    const [porteMsg, setPorteMsg] = useState("");

    // Verifica permissão para acessar a página
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const allowedRoles = ['auxiliar', 'tabeliao', 'escrivao', 'juiz', 'advogado', 'promotor', 'promotor Chefe', 'admin'];
        if (!allowedRoles.includes(user.role)) {
            alert('Acesso negado. Você não tem permissão para o Cartório.');
            navigate('/dashboard');
            return;
        }
    }, [isAuthenticated, user.role, navigate]);

    // Permissões por tipo de ação
    const podeCadastro = ['auxiliar', 'tabeliao', 'escrivao', 'juiz', 'admin'].includes(user.role);
    const podeRegistroArma = ['tabeliao', 'escrivao', 'juiz', 'admin'].includes(user.role);
    const podeRecolhimento = ['advogado', 'juiz', 'promotor', 'escrivao', 'promotor Chefe', 'admin'].includes(user.role);

    const abrirFormulario = (tipo) => {
        if (tipo === 'cadastro' && !podeCadastro) return alert('Você não tem permissão para Novo Cadastro.');
        if (tipo === 'arma' && !podeRegistroArma) return alert('Você não tem permissão para Registro de Arma.');
        if (tipo === 'recolhimento' && !podeRecolhimento) return alert('Você não tem permissão para Recolhimentos.');

        setShowForm(tipo);
        setFormDados({});
        setPreviewImage(null);
    };

    const fecharFormulario = () => {
        setShowForm(null);
        setFormDados({});
        setPreviewImage(null);
    };

    const [imagemFile, setImagemFile] = useState(null);


    async function checarPorte() {
        setPorteOk(false);
        setPorteMsg("");

        const porteNumero = armaForm.porteNumero.trim();
        const cidadaoId = armaForm.cidadaoId.trim();

        if (!porteNumero || !cidadaoId) return;

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                "https://apijuridico.starkstore.dev.br/api/cartorio/porte/validar",
                { porteNumero, cidadaoId },
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", } }
            );

            if (res.data?.ok) {
                setPorteOk(true);
                setPorteMsg("Porte validado ✅");
            } else {
                setPorteOk(false);
                setPorteMsg(res.data?.message || "Falha ao validar porte.");
            }
        } catch (e) {
            setPorteOk(false);
            setPorteMsg(e.response?.data?.message || "Falha ao validar porte.");
        }
    }

    const handleImageLocal = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            return alert('Apenas imagens são permitidas.');
        }

        if (file.size > 5 * 1024 * 1024) {
            return alert('Imagem muito grande (máx 5MB).');
        }

        const previewUrl = URL.createObjectURL(file);
        setPreviewImage(previewUrl);
        setImagemFile(file); // guarda o arquivo para envio depois
        setFormDados({ ...formDados, imagemIdentidade: 'pendente' }); // placeholder temporário
    };


    const removerImagem = () => {
        if (previewImage) URL.revokeObjectURL(previewImage);
        setPreviewImage(null);
        setImagemFile(null);
        setFormDados({ ...formDados, imagemIdentidade: null });
    };


    const handleRegistroArma = async () => {
        if (!porteOk) return alert("Valide o porte antes de prosseguir.");
        if (!armaForm.cidadaoId || !armaForm.porteNumero || !armaForm.numeroSerial || !imagemFile) {
            return alert("Preencha tudo e envie a imagem.");
        }

        const formData = new FormData();
        formData.append("cidadaoId", armaForm.cidadaoId);
        formData.append("porteNumero", armaForm.porteNumero);
        formData.append("numeroSerial", armaForm.numeroSerial);
        formData.append("imagemIdentidade", imagemFile);

        const token = localStorage.getItem("token");
        await axios.post(
            "https://apijuridico.starkstore.dev.br/api/cartorio/arma/registro",
            formData,
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
        );

        alert("Registro de arma enviado para triagem!");
        fecharFormulario();
    };




    const handleRegistrar = async () => {
        if (!formDados.nomeCompleto || !formDados.identidade || !formDados.profissao || !formDados.residencia || !formDados.discordId || !imagemFile) {
            return alert('Preencha todos os campos obrigatórios e envie a imagem!');
        }

        setEnviando(true);

        const formData = new FormData();
        formData.append('nomeCompleto', formDados.nomeCompleto);
        formData.append('pombo', formDados.pombo || '');
        formData.append('identidade', formDados.identidade);
        formData.append('profissao', formDados.profissao);
        formData.append('residencia', formDados.residencia);
        formData.append('discordId', formDados.discordId);
        formData.append('imagemIdentidade', imagemFile); // arquivo real



        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                'https://apijuridico.starkstore.dev.br/api/cartorio/cadastro',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            alert(response.data.msg || 'Cadastro enviado com sucesso para triagem!');
            fecharFormulario();
        } catch (err) {
            alert('Erro ao enviar cadastro: ' + (err.response?.data?.msg || err.message));
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
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao Dashboard
                        </button>
                        <span className="text-sm">Bem-vindo, {user.username || 'Usuário'}</span>
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
                <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                    Cartório - Execução de Atos Aprovados
                </h2>

                <p className="text-center text-gray-600 mb-10 max-w-3xl mx-auto">
                    Aqui são realizados apenas os atos administrativos já aprovados na triagem. Nenhum tipo de análise ou decisão é feita nesta etapa.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Cartão Novo Cadastro */}
                    <div className={`bg-white border ${podeCadastro ? 'border-blue-200 hover:shadow-lg' : 'border-gray-200 opacity-60'} rounded-xl p-6 text-center transition`}>
                        <UserPlus className={`h-12 w-12 mx-auto mb-4 ${podeCadastro ? 'text-blue-600' : 'text-gray-400'}`} />
                        <h3 className="text-xl font-semibold mb-2">Novo Cadastro de Cidadão</h3>
                        <p className="text-gray-600 mb-4">Registro inicial de cidadão no sistema.</p>
                        <button
                            onClick={() => abrirFormulario('cadastro')}
                            disabled={!podeCadastro}
                            className={`px-6 py-2 rounded-md font-medium ${podeCadastro
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Iniciar
                        </button>
                    </div>

                    {/* Cartão Registro de Arma */}
                    <div className={`bg-white border ${podeRegistroArma ? 'border-green-200 hover:shadow-lg' : 'border-gray-200 opacity-60'} rounded-xl p-6 text-center transition`}>
                        <Shield className={`h-12 w-12 mx-auto mb-4 ${podeRegistroArma ? 'text-green-600' : 'text-gray-400'}`} />
                        <h3 className="text-xl font-semibold mb-2">Registro de Arma</h3>
                        <p className="text-gray-600 mb-4">Registro definitivo de arma após aprovação.</p>
                        <button
                            onClick={() => abrirFormulario('arma')}
                            disabled={!podeRegistroArma}
                            className={`px-6 py-2 rounded-md font-medium ${podeRegistroArma
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Iniciar
                        </button>
                    </div>

                    {/* Cartão Recolhimentos */}
                    <div className={`bg-white border ${podeRecolhimento ? 'border-purple-200 hover:shadow-lg' : 'border-gray-200 opacity-60'} rounded-xl p-6 text-center transition`}>
                        <FileCheck className={`h-12 w-12 mx-auto mb-4 ${podeRecolhimento ? 'text-purple-600' : 'text-gray-400'}`} />
                        <h3 className="text-xl font-semibold mb-2">Recolhimentos</h3>
                        <p className="text-gray-600 mb-4">Registro de recolhimentos administrativos.</p>
                        <button
                            onClick={() => abrirFormulario('recolhimento')}
                            disabled={!podeRecolhimento}
                            className={`px-6 py-2 rounded-md font-medium ${podeRecolhimento
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
                                    {showForm === 'cadastro' ? 'Novo Cadastro de Cidadão' :
                                        showForm === 'arma' ? 'Registro de Arma' :
                                            'Recolhimentos'}
                                </h3>
                                <button onClick={fecharFormulario} className="text-gray-600 hover:text-gray-800">
                                    Fechar
                                </button>
                            </div>

                            <div className="p-6">
                                {showForm === 'cadastro' ? (
                                    <form className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                            <input
                                                type="text"
                                                value={formDados.nomeCompleto || ''}
                                                onChange={(e) => setFormDados({ ...formDados, nomeCompleto: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pombo</label>
                                            <input
                                                type="text"
                                                value={formDados.pombo || ''}
                                                onChange={(e) => setFormDados({ ...formDados, pombo: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Identidade</label>
                                            <input
                                                type="text"
                                                value={formDados.identidade || ''}
                                                onChange={(e) => setFormDados({ ...formDados, identidade: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Profissão</label>
                                            <input
                                                type="text"
                                                value={formDados.profissao || ''}
                                                onChange={(e) => setFormDados({ ...formDados, profissao: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Residência</label>
                                            <input
                                                type="text"
                                                value={formDados.residencia || ''}
                                                onChange={(e) => setFormDados({ ...formDados, residencia: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ID Discord do Cidadão</label>
                                            <input
                                                type="text"
                                                value={formDados.discordId || ''}
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
                                                    const file = e.dataTransfer.files[0];
                                                    if (file) handleImageLocal(file);
                                                }}
                                                onDragOver={(e) => e.preventDefault()}
                                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
                                            >
                                                {previewImage ? (
                                                    <div className="relative">
                                                        <img
                                                            src={previewImage}
                                                            alt="Pré-visualização"
                                                            className="max-h-48 mx-auto rounded-md"
                                                        />
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
                                                                    if (e.target.files[0]) handleImageLocal(e.target.files[0]);
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
                                                {enviando ? 'Enviando...' : 'Enviar para Triagem'}
                                            </button>
                                        </div>
                                    </form>
                                ) : showForm === 'arma' ? (
                                    <form className="space-y-4">

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Numero de Cidadão (Cartório)</label>
                                            <input
                                                type="text"
                                                value={armaForm.cidadaoId || ''}
                                                onChange={(e) => setArmaForm({ ...armaForm, cidadaoId: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Ex: 123456789012345678"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Numero do Porte</label>
                                            <input
                                                type="text"
                                                value={armaForm.porteNumero}
                                                onChange={(e) => setArmaForm({ ...armaForm, porteNumero: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Ex: 123456789012345678"
                                                onBlur={checarPorte}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Numero de Série</label>
                                            <input
                                                type="text"
                                                value={armaForm.numeroSerial}
                                                onChange={(e) => setArmaForm({ ...armaForm, numeroSerial: e.target.value })}
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
                                                    const file = e.dataTransfer.files[0];
                                                    if (file) handleImageLocal(file);
                                                }}
                                                onDragOver={(e) => e.preventDefault()}
                                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
                                            >
                                                {previewImage ? (
                                                    <div className="relative">
                                                        <img
                                                            src={previewImage}
                                                            alt="Pré-visualização"
                                                            className="max-h-48 mx-auto rounded-md"
                                                        />
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
                                                                    if (e.target.files[0]) handleImageLocal(e.target.files[0]);
                                                                }}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    </>
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
                                                    {enviando ? 'Enviando...' : 'Enviar para Triagem'}
                                                </button>
                                            </div>
                                        </div>


                                    </form>
                                ) : (
                                    <div className="text-center py-10 text-gray-600">
                                        Formulário de Recolhimentos em desenvolvimento...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer fixado */}
            <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
                <p>© {new Date().getFullYear()} Jurídico Atlanta RP • Todos os direitos reservados</p>
            </footer>
        </div>
    );
}

export default Cartorio;