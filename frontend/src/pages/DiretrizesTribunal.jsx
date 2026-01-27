// frontend/src/pages/DiretrizesTribunal.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import { Scale, BookOpen, Search, ArrowLeft, Gavel, FileText } from 'lucide-react';

function DiretrizesTribunal() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // As diretrizes completas
    const diretrizes = [
        {
            titulo: 'CAPÍTULO I — DA NATUREZA E AUTORIDADE DO TRIBUNAL',
            artigos: [
                {
                    numero: 'Art. 1º',
                    conteudo: 'Do Tribunal\nO Tribunal do Condado de Atlanta é o local solene destinado à administração da justiça, à aplicação das leis e à resolução de conflitos civis e criminais.'
                },
                {
                    numero: 'Art. 2º',
                    conteudo: 'Da autoridade suprema\nDurante a sessão, a autoridade máxima é o Juiz da Corte, a quem todos devem respeito, silêncio e obediência.'
                },
                {
                    numero: 'Art. 3º',
                    conteudo: 'Da finalidade do Tribunal\nO Tribunal existe para:\nI — Garantir julgamento justo;\nII — Assegurar o direito de defesa;\nIII — Aplicar a lei com ordem, honra e equilíbrio;\nIV — Preservar a dignidade da justiça e das partes.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO II — DA CONDUTA E POSTURA EM SESSÃO',
            artigos: [
                {
                    numero: 'Art. 4º',
                    conteudo: 'Do comportamento geral\nTodos os presentes deverão manter postura respeitosa, linguagem adequada e conduta compatível com a solenidade do Tribunal.'
                },
                {
                    numero: 'Art. 5º',
                    conteudo: 'Do silêncio e da ordem\nÉ expressamente vedado:\nI — Interromper o Juiz ou qualquer parte sem autorização;\nII — Falar fora do momento concedido;\nIII — Provocações, insultos, comentários paralelos ou gestos de deboche.\nParágrafo único — A quebra da ordem poderá resultar em advertência, multa, prisão por desacato ou retirada imediata do recinto.'
                },
                {
                    numero: 'Art. 6º',
                    conteudo: 'Do porte de armas\nI — É proibido portar armas dentro do Tribunal.\nII — Excetuam-se Oficiais da Lei em serviço, exclusivamente para segurança.\nIII — Réus, testemunhas e advogados deverão estar desarmados.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO III — DAS FUNÇÕES NO TRIBUNAL',
            artigos: [
                {
                    numero: 'Seção I — Do Juiz',
                    conteudo: 'Art. 7º — Das atribuições do Juiz\nCompete ao Juiz:\nI — Presidir a sessão e manter a ordem;\nII — Conceder ou negar a palavra;\nIII — Decidir questões processuais;\nIV — Avaliar provas e testemunhos;\nV — Proferir sentença;\nVI — Fixar penas, multas ou absolvições;\nVII — Determinar prisões, solturas e escoltas.\nParágrafo único — As decisões do Juiz não poderão ser interrompidas ou contestadas durante a sessão, salvo por meio legal autorizado.'
                },
                {
                    numero: 'Seção II — Do Promotor',
                    conteudo: 'Art. 8º — Das atribuições do Promotor\nCompete ao Promotor:\nI — Representar o interesse público;\nII — Apresentar denúncia;\nIII — Sustentar a acusação;\nIV — Produzir provas;\nV — Requerer aplicação da lei penal.'
                },
                {
                    numero: 'Seção III — Do Advogado',
                    conteudo: 'Art. 9º — Das atribuições do Advogado\nCompete ao Advogado:\nI — Defender os interesses de seu cliente;\nII — Apresentar argumentos e provas;\nIII — Requerer diligências;\nIV — Orientar seu cliente quanto à conduta.\nParágrafo único — É vedado ao Advogado faltar com respeito ao Juiz, às partes ou às testemunhas.'
                },
                {
                    numero: 'Seção IV — Do Réu',
                    conteudo: 'Art. 10º — Dos deveres e direitos do réu\nI — Comparecer quando intimado;\nII — Responder apenas quando questionado;\nIII — Manter postura respeitosa.\nParágrafo único — É garantido ao réu o direito ao silêncio, sem prejuízo de sua defesa.'
                },
                {
                    numero: 'Seção V — Das Testemunhas',
                    conteudo: 'Art. 11º — Das testemunhas\nI — Devem dizer a verdade;\nII — Falar apenas quando autorizadas;\nIII — Responder objetivamente às perguntas.\nParágrafo único — O falso testemunho constitui crime previsto no Código Penal.'
                },
                {
                    numero: 'Seção VI — Da Cavalaria',
                    conteudo: 'Art. 12º — Da atuação da Cavalaria\nCompete à Cavalaria:\nI — Garantir a segurança do Tribunal;\nII — Cumprir ordens judiciais;\nIII — Conduzir presos e testemunhas;\nIV — Intervir em caso de tumulto.\nParágrafo único — A Cavalaria não poderá interferir no mérito do julgamento.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO IV — DA ORDEM DA SESSÃO',
            artigos: [
                {
                    numero: 'Art. 13º',
                    conteudo: 'Da abertura da audiência\nA sessão será aberta pelo Juiz, que declarará o início dos trabalhos.'
                },
                {
                    numero: 'Art. 14º',
                    conteudo: 'Da instrução do processo\nA audiência seguirá, sempre que possível, a seguinte ordem:\nI — Leitura da acusação;\nII — Manifestação da Defesa;\nIII — Oitiva de testemunhas;\nIV — Alegações finais da Acusação;\nV — Alegações finais da Defesa.'
                },
                {
                    numero: 'Art. 15º',
                    conteudo: 'Da sentença\nEncerrados os debates, o Juiz proferirá sentença fundamentada, determinando pena ou absolvição.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO V — DAS SANÇÕES POR CONDUTA INADEQUADA',
            artigos: [
                {
                    numero: 'Art. 16º',
                    conteudo: 'Das sanções disciplinares\nO Juiz poderá aplicar, de imediato:\nI — Advertência verbal;\nII — Multa por desacato;\nIII — Prisão por desobediência ou desacato;\nIV — Retirada do recinto;\nV — Suspensão do direito de fala.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO VI — DAS AUDIÊNCIAS EM LOCAL ESPECIAL (SISIKA)',
            artigos: [
                {
                    numero: 'Art. 17º',
                    conteudo: 'Das audiências fora da sede da Corte\nEm razão do alto grau de periculosidade do réu, do risco à ordem pública ou à segurança do Tribunal, a Corte poderá determinar que a audiência seja realizada fora da sede da Corte, em local seguro designado pela autoridade judicial.\n§1º — As audiências especiais poderão ocorrer nas dependências da Prisão de Sisika, sob vigilância reforçada da Cavalaria.\n§2º — A realização da audiência em Sisika não restringe direitos do réu, sendo assegurados o contraditório, a ampla defesa e a presença de advogado.\n§3º — A decisão de transferência do local da audiência é exclusiva do Juiz e não poderá ser contestada durante a sessão.\n§4º — O acesso ao local será restrito às partes essenciais do processo, autoridades, advogados, testemunhas convocadas e Oficiais da Lei.\n§5º — A Cavalaria será responsável pela escolta, segurança e integridade de todos os presentes.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO VII — DOS PRINCÍPIOS FUNDAMENTAIS DO TRIBUNAL',
            artigos: [
                {
                    numero: 'Art. 18º',
                    conteudo: 'Da imparcialidade\nO Tribunal atuará sem favoritismo, vingança ou interesse pessoal.'
                },
                {
                    numero: 'Art. 19º',
                    conteudo: 'Do contraditório e da defesa\nToda acusação deverá permitir resposta e defesa adequadas.'
                },
                {
                    numero: 'Art. 20º',
                    conteudo: 'Da dignidade da justiça\nA justiça deverá ser firme, porém jamais arbitrária ou humilhante.'
                }
            ]
        },
        {
            titulo: 'CAPÍTULO VIII — DISPOSIÇÕES FINAIS',
            artigos: [
                {
                    numero: 'Art. 21º',
                    conteudo: 'Da força normativa\nEstas Diretrizes possuem força normativa e vinculam todos os presentes em audiências e atos judiciais.'
                },
                {
                    numero: 'Art. 22º',
                    conteudo: 'Da vigência\nAs presentes Diretrizes entram em vigor na data de sua publicação pela Corte de Justiça do Condado de Atlanta.'
                },
                {
                    numero: 'Citação final',
                    conteudo: '📖 “Onde a ordem é mantida, a justiça pode ser ouvida.”\n— Corte de Justiça do Condado de Atlanta, 1899'
                }
            ]
        }
    ];

    // Filtra capítulos/artigos por busca
    const filteredDiretrizes = diretrizes.map(capítulo => ({
        ...capítulo,
        artigos: capítulo.artigos.filter(artigo =>
            searchTerm.trim() === '' ||
            artigo.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            artigo.conteudo.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(capítulo => capítulo.artigos.length > 0);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-indigo-900 text-white py-6 px-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Gavel className="h-10 w-10" />
                        <h1 className="text-2xl md:text-3xl font-bold">Diretrizes Jurídicas do Tribunal</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-5 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-sm font-medium transition"
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
                        <BookOpen className="h-8 w-8 text-indigo-700" />
                        Promulgadas pela Corte de Justiça do Condado de Atlanta — 1899
                    </h2>

                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Buscar artigo ou palavra-chave..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                </div>

                {filteredDiretrizes.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 bg-white rounded-xl shadow">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg">Nenhuma diretriz encontrada para "{searchTerm}".</p>
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            Limpar busca
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {filteredDiretrizes.map((capítulo, index) => (
                            <section key={index} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                <div className="bg-indigo-800 text-white px-6 py-4">
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

export default DiretrizesTribunal;