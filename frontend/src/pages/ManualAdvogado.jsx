// frontend/src/pages/ManualAdvogado.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, BookOpen, Search, ArrowLeft, Gavel, FileText } from 'lucide-react';

function ManualAdvogado() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const manual = [
    {
      titulo: 'FINALIDADE DO MANUAL',
      conteudo: 'Este Manual tem por finalidade orientar a atuação do Advogado no Condado de Atlanta, estabelecendo deveres, limites, direitos e boas práticas, garantindo uma defesa justa, ética e compatível com a seriedade do Roleplay.\n\nO Advogado é peça essencial da Justiça e atua como defensor dos direitos do cidadão perante a Corte.'
    },
    {
      titulo: 'DO PAPEL DO ADVOGADO',
      conteudo: 'O Advogado é responsável por:\n• Defender o cidadão\n• Garantir o devido processo legal\n• Preservar direitos fundamentais\n• Atuar como mediador e orientador jurídico\n\nO Advogado NÃO é:\n• Acusador\n• Autoridade policial\n• Juiz do processo'
    },
    {
      titulo: 'ATRIBUIÇÕES DO ADVOGADO',
      conteudo: 'Compete ao Advogado:\n• Atender e orientar cidadãos\n• Protocolar requerimentos e petições\n• Atuar em audiências\n• Apresentar defesa técnica\n• Produzir e contestar provas\n• Requerer absolvição, atenuantes ou nulidades\n• Solicitar limpeza de ficha, alvarás e atos civis\n• Acompanhar prisões e garantir direitos do réu'
    },
    {
      titulo: 'ATENDIMENTO AO CIDADÃO',
      conteudo: 'No atendimento, o Advogado deve:\n• Ouvir o cliente com atenção\n• Explicar direitos e deveres\n• Agir com clareza e honestidade\n• Não prometer resultados\n• Manter sigilo profissional\n\nÉ vedado:\n• Incentivar crimes\n• Orientar fuga ou obstrução da justiça\n• Utilizar informações para benefício próprio'
    },
    {
      titulo: 'ATUAÇÃO EM PROCESSOS E AUDIÊNCIAS',
      conteudo: 'Durante processos e audiências, o Advogado deve:\n• Respeitar o Juiz e a Corte\n• Falar apenas quando autorizado\n• Utilizar linguagem adequada\n• Fundamentar pedidos na lei\n• Defender com firmeza, sem desrespeito\n\nO Advogado poderá:\n• Questionar testemunhas\n• Apresentar objeções legais\n• Requerer diligências'
    },
    {
      titulo: 'VEDAÇÕES AO ADVOGADO',
      conteudo: 'É expressamente vedado ao Advogado:\n• Desacatar autoridade\n• Interromper decisões judiciais\n• Atuar com parcialidade indevida\n• Falsificar documentos\n• Utilizar o cargo para ameaçar\n• Agir fora dos limites legais\n• Quebrar o sigilo profissional'
    },
    {
      titulo: 'INFRAÇÕES E SANÇÕES',
      conteudo: 'O Advogado que descumprir este Manual, o Regimento Interno ou a lei poderá sofrer:\n• Advertência\n• Suspensão temporária\n• Impedimento de atuar em audiências\n• Cassação do registro profissional\n\nAs sanções serão aplicadas pela Corte, garantindo direito de defesa.'
    },
    {
      titulo: 'DA POSTURA E IMERSÃO NO RP',
      conteudo: 'O Advogado deve:\n• Manter postura compatível com 1899\n• Preservar a seriedade do Roleplay\n• Evitar atitudes de zoeira ou metagame\n• Contribuir para a narrativa coletiva'
    },
    {
      titulo: 'DISPOSIÇÕES FINAIS',
      conteudo: 'Este Manual é de cumprimento obrigatório para todos os Advogados registrados no Condado de Atlanta.\n\nCasos omissos serão resolvidos pela Corte à luz da lei, da ética e do bom senso.\n\n“O Advogado não vence causas.\nEle garante que a Justiça seja justa.”\n— Tribunal do Condado de Atlanta, 1899'
    }
  ];

  // Filtra seções por busca
  const filteredSecoes = manual.filter(secao =>
    searchTerm.trim() === '' ||
    secao.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    secao.conteudo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-900 text-white py-6 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Gavel className="h-10 w-10" />
            <h1 className="text-2xl md:text-3xl font-bold">Manual do Advogado</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-5 py-2 bg-teal-800 hover:bg-teal-700 rounded-lg text-sm font-medium transition"
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
            <BookOpen className="h-8 w-8 text-teal-700" />
            Tribunal do Condado de Atlanta — 1899
          </h2>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por título ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {filteredSecoes.length === 0 ? (
          <div className="text-center py-12 text-gray-600 bg-white rounded-xl shadow">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Nenhuma seção encontrada para "{searchTerm}".</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSecoes.map((secao, index) => (
              <section key={index} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                {secao.titulo && (
                  <div className="bg-teal-800 text-white px-6 py-4">
                    <h3 className="text-xl font-bold">{secao.titulo}</h3>
                  </div>
                )}

                <div className="p-6">
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {secao.conteudo}
                  </div>
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

export default ManualAdvogado;