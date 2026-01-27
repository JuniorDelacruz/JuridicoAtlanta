// frontend/src/pages/CodigoPenalAtlanta.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import { Scale, BookOpen, Search, ArrowLeft, FileText } from 'lucide-react';

function CodigoPenalAtlanta() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const { user, logout, isAuthenticated } = useAuth();

    // O código penal completo
    const codigoPenal = [
        {
            titulo: 'CAPÍTULO I — DISPOSIÇÕES GERAIS',
            artigos: [
                {
                    numero: 'Art. 1º',
                    conteudo: 'Do crime\nCrime é toda ação ou omissão voluntária que viole a vida, a honra, a liberdade, o patrimônio ou a ordem pública.'
                },
                {
                    numero: 'Art. 2º',
                    conteudo: 'Da tentativa\nResponde por tentativa quem inicia a execução do crime sem consumá-lo por circunstância alheia à sua vontade.\nPena: reduzida em até 1/3 da pena do crime consumado.'
                },
                {
                    numero: 'Art. 3º',
                    conteudo: 'Do dolo e da culpa\nI — Crime doloso: quando há intenção ou aceitação do risco.\nII — Crime culposo: quando o resultado decorre de imprudência ou negligência.'
                },
                {
                    numero: 'Art. 4º',
                    conteudo: 'Da legítima defesa\nNão há crime quando o cidadão repele, de forma moderada, agressão injusta, atual ou iminente.'
                },
                {
                    numero: 'Art. 5º',
                    conteudo: 'Das penas\nAs penas aplicáveis são:\nI — Multa;\nII — Prisão simples;\nIII — Prisão em Sisika;\nIV — Reparação do dano;\nV — Suspensão de direitos civis.'
                },
                {
                    numero: 'Art. 6º',
                    conteudo: 'Das agravantes e atenuantes\nI — Agravam a pena: reincidência, uso de arma, crime contra autoridade, concurso de três ou mais pessoas.\nII — Atenuam a pena: confissão, reparação do dano, réu primário.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO II — CRIMES CONTRA A VIDA E A INTEGRIDADE',
            artigos: [
                {
                    numero: 'Art. 7º',
                    conteudo: 'Homicídio doloso\nMatar alguém intencionalmente.\nPena: 30 dias em Sisika e multa de $500.\nParágrafo único — Se a vítima for Oficial da Lei: 40 dias em Sisika e multa de $700.'
                },
                {
                    numero: 'Art. 8º',
                    conteudo: 'Homicídio culposo\nCausar a morte sem intenção.\nPena: 20 dias de prisão e multa de $250.'
                },
                {
                    numero: 'Art. 9º',
                    conteudo: 'Tentativa de homicídio\nAtentar contra a vida sem consumar o crime.\nPena: 25 dias de prisão e multa de $300.'
                },
                {
                    numero: 'Art. 10º',
                    conteudo: 'Lesão corporal\nFerir ou agredir causando dano físico.\nPena: 15 dias de prisão e multa de $150.\nParágrafo único — Lesão grave: 25 dias e $300.'
                },
                {
                    numero: 'Art. 11º',
                    conteudo: 'Omissão de socorro\nDeixar de socorrer ferido quando possível.\nPena: 5 dias de prisão e multa de $75.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO III — CRIMES CONTRA A LIBERDADE',
            artigos: [
                {
                    numero: 'Art. 12º',
                    conteudo: 'Sequestro ou cárcere privado\nPrivar alguém de sua liberdade.\nPena: 30 dias em Sisika e multa de $400.'
                },
                {
                    numero: 'Art. 13º',
                    conteudo: 'Extorsão mediante sequestro\nReter pessoa exigindo vantagem para libertação.\nPena: 40 dias em Sisika e multa de $600.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO IV — CRIMES CONTRA O PATRIMÔNIO',
            artigos: [
                {
                    numero: 'Art. 14º',
                    conteudo: 'Furto\nSubtrair bem sem violência.\nPena: 10 dias de prisão e multa de $125, com restituição.'
                },
                {
                    numero: 'Art. 15º',
                    conteudo: 'Roubo\nSubtrair bem mediante ameaça ou violência.\nPena: 20 dias de prisão e multa de $200.'
                },
                {
                    numero: 'Art. 16º',
                    conteudo: 'Roubo a banco, trem ou diligência\nPena: 30 dias em Sisika e multa de $500.'
                },
                {
                    numero: 'Art. 17º',
                    conteudo: 'Abigeato\nFurto de cavalo, gado ou animal de carga.\nPena: 20 dias de prisão e multa de $250, com restituição.'
                },
                {
                    numero: 'Art. 18º',
                    conteudo: 'Receptação\nAdquirir ou vender bem sabendo ser produto de crime.\nPena: 15 dias de prisão e multa de $150.'
                },
                {
                    numero: 'Art. 19º',
                    conteudo: 'Dano ou vandalismo\nDestruir ou deteriorar bem alheio.\nPena: 10 dias de prisão e multa de $150, além da reparação.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO V — CRIMES CONTRA A ORDEM PÚBLICA',
            artigos: [
                {
                    numero: 'Art. 20º',
                    conteudo: 'Desordem ou briga pública\nPena: 10 dias de prisão e multa de $100.'
                },
                {
                    numero: 'Art. 21º',
                    conteudo: 'Disparo injustificado em área urbana\nPena: 10 dias de prisão e multa de $150.'
                },
                {
                    numero: 'Art. 22º',
                    conteudo: 'Uso de máscara para fins criminosos\nPena: 10 dias de prisão e multa de $75.'
                },
                {
                    numero: 'Art. 23º',
                    conteudo: 'Porte irregular de arma em cidade\nPena: multa de $150 e apreensão da arma.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO VI — CRIMES CONTRA A JUSTIÇA E A AUTORIDADE',
            artigos: [
                {
                    numero: 'Art. 24º',
                    conteudo: 'Desacato à autoridade\nPena: 10 dias de prisão e multa de $150.'
                },
                {
                    numero: 'Art. 25º',
                    conteudo: 'Desobediência\nPena: 5 dias de prisão e multa de $100.'
                },
                {
                    numero: 'Art. 26º',
                    conteudo: 'Resistência à prisão\nPena: 15 dias de prisão e multa de $200.'
                },
                {
                    numero: 'Art. 27º',
                    conteudo: 'Fuga de abordagem ou custódia\nPena: 15 dias de prisão e multa de $150.'
                },
                {
                    numero: 'Art. 28º',
                    conteudo: 'Obstrução da justiça\nPena: 20 dias de prisão e multa de $300.'
                },
                {
                    numero: 'Art. 29º',
                    conteudo: 'Falso testemunho ou falsa comunicação\nPena: 20 dias de prisão e multa de $300.'
                },
                {
                    numero: 'Art. 30º',
                    conteudo: 'Usurpação de função pública\nPena: 25 dias de prisão e multa de $400.'
                },
                {
                    numero: 'Art. 31º',
                    conteudo: 'Abuso de autoridade\nPena: 25 dias de prisão, multa de $400 e afastamento do cargo.'
                },
                {
                    numero: 'Art. 32º',
                    conteudo: 'Corrupção ou prevaricação\nPena: 30 dias em Sisika e multa de $600.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO VII — DISPOSIÇÕES FINAIS',
            artigos: [
                {
                    numero: 'Art. 33º',
                    conteudo: 'Da cumulação\nCrimes distintos podem ser somados; crimes derivados do mesmo ato podem ser absorvidos por decisão judicial.'
                },
                {
                    numero: 'Art. 34º',
                    conteudo: 'Da competência\nTodos os crimes serão julgados pela Corte de Justiça do Condado de Atlanta.'
                },
                {
                    numero: 'Art. 35º',
                    conteudo: 'Da vigência\nEste Código entra em vigor na data de sua promulgação.'
                }
            ]
        }
    ];

    // Filtra artigos por busca
    const filteredCapítulos = codigoPenal.map(capítulo => ({
        ...capítulo,
        artigos: capítulo.artigos.filter(artigo =>
            searchTerm.trim() === '' ||
            artigo.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
            artigo.conteudo.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(capítulo => capítulo.artigos.length > 0);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-blue-900 text-white py-6 px-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Scale className="h-10 w-10" />
                        <h1 className="text-2xl md:text-3xl font-bold">Código Penal do Condado de Atlanta (1900)</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition"
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
                        <BookOpen className="h-8 w-8 text-blue-700" />
                        Promulgado pela Corte de Justiça do Condado de Atlanta
                    </h2>

                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Buscar artigo ou palavra-chave..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
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
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Limpar busca
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {filteredCapítulos.map((capítulo, index) => (
                            <section key={index} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                <div className="bg-blue-800 text-white px-6 py-4">
                                    <h3 className="text-xl font-bold">{capítulo.titulo}</h3>
                                </div>

                                <div className="divide-y divide-gray-200">
                                    {capítulo.artigos.map((artigo, i) => (
                                        <article key={i} className="p-6 hover:bg-gray-50 transition">
                                            <h4 className="text-lg font-semibold text-gray-800 mb-2">{artigo.numero}</h4>
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

export default CodigoPenalAtlanta;