// frontend/src/pages/ConstituicaoAtlanta.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import { Scale, BookOpen, Search, ArrowLeft, Gavel, FileText } from 'lucide-react';

function ConstituicaoAtlanta() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // A Constituição completa
    const constituicao = [
        {
            titulo: 'PREÂMBULO',
            artigos: [
                {
                    conteudo: 'Nós, o povo livre do Condado de Atlanta, reunidos sob a autoridade da lei, da honra e da justiça, estabelecemos esta Constituição para assegurar a ordem, proteger a vida, garantir o direito e manter a paz neste território.\n\nReconhecendo a soberania da lei sobre a força, a honra sobre o interesse, e a justiça sobre a vontade individual, firmamos este pacto civil para sustentar a autoridade legítima e a dignidade do cidadão.'
                }
            ]
        },
        {
            titulo: 'I — DOS PRINCÍPIOS FUNDAMENTAIS',
            artigos: [
                {
                    numero: 'Art. 1º',
                    conteudo: 'O Condado de Atlanta é território livre, uno e indivisível, regido por esta Constituição e pelas leis promulgadas pela Corte de Justiça.'
                },
                {
                    numero: 'Art. 2º',
                    conteudo: 'Toda autoridade emana da lei e da Corte que a interpreta.\nNenhum homem, cargo ou força armada poderá se sobrepor à justiça.'
                },
                {
                    numero: 'Art. 3º',
                    conteudo: 'A administração do Condado funda-se na moral, na honra, no respeito e no compromisso com o bem comum.'
                },
                {
                    numero: 'Art. 4º',
                    conteudo: 'A fé e a palavra são livres, desde que não sirvam de abrigo ao crime ou à violação da lei.'
                },
                {
                    numero: 'Art. 5º',
                    conteudo: 'São deveres do cidadão:\nI — Respeitar as leis e as autoridades constituídas;\nII — Defender a vida, a honra e a propriedade;\nIII — Auxiliar a justiça quando legalmente requisitado.'
                }
            ]
        },
        {
            titulo: 'II — DA CORTE DE JUSTIÇA E DO CORPO JURÍDICO',
            artigos: [
                {
                    numero: 'Art. 6º',
                    conteudo: 'A Corte de Justiça do Condado de Atlanta é a autoridade máxima do território, responsável por julgar crimes, interpretar as leis e garantir a ordem civil.'
                },
                {
                    numero: 'Art. 7º',
                    conteudo: 'Compete à Corte:\nI — Julgar crimes e infrações;\nII — Expedir ordens judiciais;\nIII — Fiscalizar prisões e a atuação da Cavalaria;\nIV — Nomear, supervisionar e destituir autoridades quando necessário.'
                },
                {
                    numero: 'Art. 8º',
                    conteudo: 'O corpo jurídico do Condado é composto por Juízes, Promotores, Procuradores e Advogados, cabendo-lhe zelar pela aplicação da lei e pela defesa do interesse público.'
                }
            ]
        },
        {
            titulo: 'III — DA CAVALARIA DO CONDADO',
            artigos: [
                {
                    numero: 'Art. 9º',
                    conteudo: 'A Cavalaria do Condado de Atlanta é a força pública responsável por garantir a execução das leis, proteger os cidadãos e manter a ordem.'
                },
                {
                    numero: 'Art. 10º',
                    conteudo: 'A Cavalaria está subordinada diretamente à Corte de Justiça e atua exclusivamente mediante a lei e ordens judiciais.'
                },
                {
                    numero: 'Art. 11º',
                    conteudo: 'O Marechal do Condado é o comandante da Cavalaria, responsável pela disciplina, hierarquia e cumprimento das decisões da Corte.'
                },
                {
                    numero: 'Art. 12º',
                    conteudo: 'É vedado à Cavalaria agir por interesse próprio, força política ou vontade pessoal. Todo abuso de autoridade será julgado pela Corte.'
                }
            ]
        },
        {
            titulo: 'IV — DOS DIREITOS E GARANTIAS DO CIDADÃO',
            artigos: [
                {
                    numero: 'Art. 13º',
                    conteudo: 'A vida, a liberdade e a propriedade são invioláveis, salvo nos casos previstos em lei e mediante julgamento justo.'
                },
                {
                    numero: 'Art. 14º',
                    conteudo: 'Nenhum cidadão será preso sem ordem legal ou flagrante delito, nem condenado sem direito de defesa perante a Corte.'
                },
                {
                    numero: 'Art. 15º',
                    conteudo: 'É garantido a todo cidadão o acesso à justiça, o direito à palavra, à fé e à reunião pacífica, dentro dos limites da ordem pública.'
                },
                {
                    numero: 'Art. 16º',
                    conteudo: 'A prisão arbitrária, o abuso de autoridade e o uso excessivo da força serão punidos conforme a lei.'
                }
            ]
        },
        {
            titulo: 'V — DAS DISPOSIÇÕES FINAIS',
            artigos: [
                {
                    numero: 'Art. 17º',
                    conteudo: 'Esta Constituição é a lei suprema do Condado de Atlanta.\nNenhuma ordem, prática ou costume poderá contrariá-la.'
                },
                {
                    numero: 'Art. 18º',
                    conteudo: 'Compete exclusivamente à Corte de Justiça interpretar, guardar e fazer cumprir esta Constituição.'
                },
                {
                    numero: 'Art. 19º',
                    conteudo: 'Esta Constituição entrará em vigor na data de sua promulgação.'
                },
                {
                    conteudo: '📖 “Onde a lei fala, a força se cala.”\n— Corte de Justiça do Condado de Atlanta, 1900'
                }
            ]
        }
    ];

    // Filtra capítulos/artigos por busca
    const filteredCapítulos = constituicao.map(capítulo => ({
        ...capítulo,
        artigos: capítulo.artigos.filter(artigo =>
            searchTerm.trim() === '' ||
            (artigo.numero && artigo.numero.toLowerCase().includes(searchTerm.toLowerCase())) ||
            artigo.conteudo.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(capítulo => capítulo.artigos.length > 0);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-amber-900 text-white py-6 px-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Scale className="h-10 w-10" />
                        <h1 className="text-2xl md:text-3xl font-bold">Constituição do Condado de Atlanta (1900)</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-5 py-2 bg-amber-800 hover:bg-amber-700 rounded-lg text-sm font-medium transition"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            Voltar ao Dashboard
                        </button>
                        <button
                            onClick={logout}
                            className="px-5 py-2 bg-red-700 hover:bg-red-800 rounded-lg text-sm font-medium transition"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Conteúdo principal */}
            <main className="flex-grow max-w-6xl mx-auto py-10 px-6">
                <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-amber-700" />
                        Corte de Justiça do Condado de Atlanta
                    </h2>

                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Buscar artigo ou palavra-chave..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                </div>

                {filteredCapítulos.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 bg-white rounded-xl shadow">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg">Nenhum artigo encontrado para "{searchTerm}".</p>
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                        >
                            Limpar busca
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {filteredCapítulos.map((capítulo, index) => (
                            <section key={index} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                <div className="bg-amber-800 text-white px-6 py-4">
                                    <h3 className="text-xl font-bold">{capítulo.titulo}</h3>
                                </div>

                                <div className="divide-y divide-gray-200">
                                    {capítulo.artigos.map((artigo, i) => (
                                        <article key={i} className="p-6 hover:bg-gray-50 transition">
                                            {artigo.numero && (
                                                <h4 className="text-lg font-semibold text-gray-800 mb-2">{artigo.numero}</h4>
                                            )}
                                            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                                                {artigo.conteudo}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))}
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

export default ConstituicaoAtlanta;