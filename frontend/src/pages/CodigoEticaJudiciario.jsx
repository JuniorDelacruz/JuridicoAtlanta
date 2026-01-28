// frontend/src/pages/CodigoEticaJudiciario.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, BookOpen, Search, ArrowLeft, Gavel, Balance } from 'lucide-react';

function CodigoEticaJudiciario() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const codigoEtica = [
    {
      titulo: 'Papel central dos advogados',
      conteudo: 'Advogados são a base do sistema judicial e desempenham funções cruciais para representar seus clientes em todas as questões jurídicas do condado.\n\nAdvogados Júnior devem aprender e cumprir essas responsabilidades sob a orientação de seus superiores.'
    },
    {
      titulo: 'Imparcialidade e Justiça',
      conteudo: 'Advogados e promotores devem atuar com total imparcialidade, garantindo que as leis sejam aplicadas de forma justa.\n\nO juiz assegura que as decisões são baseadas em fatos e provas.'
    },
    {
      titulo: 'Integridade e Honestidade',
      conteudo: 'A atuação dos Advogados deve ser sempre pautada pela integridade, sem buscar meios ilegais ou desonestos para resolver os casos.\n\nO Procurador e os Supervisores são responsáveis por garantir a honestidade e a transparência em todos os processos.'
    },
    {
      titulo: 'Respeito e Dignidade',
      conteudo: 'Todos os membros do corpo jurídico, sem exceções, devem tratar todos os envolvidos com respeito e dignidade, garantindo que o ambiente judicial seja um espaço de civilidade e justiça.'
    },
    {
      titulo: 'Sigilo e Confidencialidade',
      conteudo: 'Todos os membros do corpo jurídico são responsáveis por manter sigilo sobre todas as informações sensíveis de seus clientes, garantindo que essas não sejam usadas de forma indevida. O mesmo vale para questões do corpo jurídico.'
    },
    {
      titulo: 'Transparência e Prestação de Contas',
      conteudo: 'Todos, especialmente os advogados, devem ser transparentes em suas ações e decisões, prestando contas quando necessário e garantindo que o sistema judicial funcione de maneira clara.'
    },
    {
      titulo: 'Combate à Corrupção',
      conteudo: 'Supervisores têm a função de monitorar o comportamento dos Advogados e da Promotoria, prevenindo e punindo qualquer ato de corrupção ou favorecimento indevido.'
    },
    {
      titulo: 'Direito à Defesa e Justiça Plena',
      conteudo: 'Advogados devem garantir que todos os cidadãos tenham pleno direito à defesa, independentemente de sua condição.\n\nA Promotoria deve agir com ética, buscando a justiça sem abusos de poder.'
    },
    {
      titulo: 'Responsabilidade dos Supervisores',
      conteudo: 'Supervisores de Advogados e Supervisores de Promotoria devem orientar e monitorar suas equipes, garantindo que todos os membros sigam este código de ética e as normas do judiciário.'
    },
    {
      conteudo: 'A violação deste Código de Ética é uma afronta à justiça e à democracia do condado, podendo resultar em severas punições que podem variar de advertências, suspensões e o que for cabível de acordo com a autoridade judicial presente, incluindo a pena capital.'
    }
  ];

  const filteredItens = codigoEtica.filter(item =>
    searchTerm.trim() === '' ||
    item.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.conteudo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-900 text-white py-6 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Balance className="h-10 w-10" />
            <h1 className="text-2xl md:text-3xl font-bold">Código de Ética do Judiciário</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-700 rounded-lg text-sm font-medium transition"
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
            <BookOpen className="h-8 w-8 text-emerald-700" />
            Tribunal do Condado de Atlanta
          </h2>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por título ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {filteredItens.length === 0 ? (
          <div className="text-center py-12 text-gray-600 bg-white rounded-xl shadow">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Nenhum item encontrado para "{searchTerm}".</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredItens.map((item, index) => (
              <section key={index} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                {item.titulo && (
                  <div className="bg-emerald-800 text-white px-6 py-4">
                    <h3 className="text-xl font-bold">{item.titulo}</h3>
                  </div>
                )}

                <div className="p-6">
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {item.conteudo}
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

export default CodigoEticaJudiciario;