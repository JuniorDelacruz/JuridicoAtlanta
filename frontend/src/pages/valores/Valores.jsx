// frontend/src/pages/valores/Valores.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, BadgeDollarSign } from "lucide-react";

const toNumber = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (!s || s === "-") return null;
  // aceita "$1.500,00" ou "1500" ou "1.500,00"
  const cleaned = s
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const money = (n) => {
  if (n === null) return "—";
  // formato que você usa: $1.500,00
  return `$${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const pct = (v) => {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "number" ? v : toNumber(v);
  if (n === null) return "—";
  return `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

// percentuais aqui são FRAÇÕES (ex: 0.70 = 70%)
function calcPartes(valor, pAdv, pTrib, pCart) {
  const v = toNumber(valor);
  if (v === null) return { adv: null, trib: null, cart: null };
  return {
    adv: v * (pAdv ?? 0),
    trib: v * (pTrib ?? 0),
    cart: v * (pCart ?? 0),
  };
}

const SECOES = [
  {
    title: "Serviços Advogado",
    items: [
      { nome: "Limpeza de ficha", valor: "$500,00", pAdv: 0.7, pTrib: 0.3, pCart: 0 },
      { nome: "Mudança de nome", valor: "$2.360,00", pAdv: 0.5, pTrib: 0.5, pCart: 0 },
      { nome: "Certidão de Casamento / Divórcio", valor: "$10.000,00", pAdv: 0.2, pTrib: 0.8, pCart: 0 },
      { nome: "Honorários 1", valor: "$500,00", pAdv: 0.75, pTrib: 0.25, pCart: 0 },
      { nome: "Honorários 2", valor: "$1.500,00", pAdv: 0.75, pTrib: 0.25, pCart: 0 },
      { nome: "Alvarás", valor: "$160,00", pAdv: 0.5, pTrib: 0.5, pCart: 0 },
      { nome: "Renovação de alvará", valor: "$160,00", pAdv: 0.5, pTrib: 0.5, pCart: 0 },
      { nome: "Notificação Extrajudicial", valor: "$150,00", pAdv: 0.5, pTrib: 0.5, pCart: 0 },
      { nome: "Recolhimento", valor: "-", pAdv: 0.1, pTrib: 0.9, pCart: 0 },
    ],
  },
  {
    title: "Serviços Tabelião",
    items: [
      { nome: "Abertura de firma", valor: "$85,00", pAdv: 0, pTrib: 0.3, pCart: 0.7 },
      { nome: "Registro de arma", valor: "$180,00", pAdv: 0, pTrib: 0.5, pCart: 0.5 },
      { nome: "Alvará", valor: "$160,00", pAdv: 0, pTrib: 0.5, pCart: 0.5 },
      { nome: "Divórcios", valor: "$10.000,00", pAdv: 0, pTrib: 0.8, pCart: 0.2 },
      { nome: "Casamento simples", valor: "$1.360,00", pAdv: 0, pTrib: 0.5, pCart: 0.5 },
      { nome: "Casamento completo", valor: "$2.360,00", pAdv: 0, pTrib: 0.5, pCart: 0.5 },
      { nome: "Paternidade", valor: "$300,00", pAdv: 0, pTrib: 0.5, pCart: 0.5 },
    ],
  },
  {
    title: "Serviços Auxiliar",
    items: [{ nome: "Abertura de firma", valor: "$85,00", pAdv: 0.7, pTrib: 0.3, pCart: 0 }],
  },
  {
    title: "Armas",
    items: [
      { nome: "Revolver Lemat", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Revolver Navy Crossover", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Revolver Navy", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Pistol M1899", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Pistol Mauser", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Carabine Repeater", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Evans Repeater", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Winchester Repeater", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Boltaction Rifle", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Springfield Rifle", valor: "$110,00", pAdv: 0.35, pTrib: 0.3, pCart: 0.35 },
      { nome: "Elephant Rifle", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Varmint Rifle", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Rolling Block Rifle", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Carcano Rifle", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Semi-Auto Shotgun", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Repeating Shotgun", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Double Barrel Shotgun", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Double Barrel Exotic Shotgun", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Pump Shotgun", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Sawedoff Shotgun", valor: "$980,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Metralhadora Thompson", valor: "$1.500,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
      { nome: "Todos os armamentos", valor: "$12.400,00", pAdv: 0.4, pTrib: 0.2, pCart: 0.4 },
    ],
  },
];

function Table({ rows }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="min-w-[1100px] w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr className="text-left text-gray-700">
            <th className="p-3">Serviço</th>
            <th className="p-3">Valor</th>
            <th className="p-3">% Advogado</th>
            <th className="p-3">% Tribunal</th>
            <th className="p-3">% Cartório</th>
            <th className="p-3">Valor Adv</th>
            <th className="p-3">Valor Tribunal</th>
            <th className="p-3">Valor Cartório</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const partes = calcPartes(r.valor, r.pAdv, r.pTrib, r.pCart);
            return (
              <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="p-3 font-semibold text-gray-900">{r.nome}</td>
                <td className="p-3 text-gray-800">{money(toNumber(r.valor))}</td>
                <td className="p-3 text-gray-700">{pct(r.pAdv)}</td>
                <td className="p-3 text-gray-700">{pct(r.pTrib)}</td>
                <td className="p-3 text-gray-700">{pct(r.pCart)}</td>
                <td className="p-3 text-gray-800">{money(partes.adv)}</td>
                <td className="p-3 text-gray-800">{money(partes.trib)}</td>
                <td className="p-3 text-gray-800">{money(partes.cart)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Valores() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const secoesFiltradas = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return SECOES;

    return SECOES.map((s) => ({
      ...s,
      items: s.items.filter((it) => it.nome.toLowerCase().includes(query)),
    })).filter((s) => s.items.length > 0);
  }, [q]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BadgeDollarSign className="h-8 w-8" />
            <h1 className="text-xl font-bold">Tabela de Valores</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto py-8 px-6 w-full">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Valores e repasses</h2>
              <p className="text-sm text-gray-600">
                Cálculo automático de repasse para Advogado / Tribunal / Cartório.
              </p>
            </div>

            <div className="relative w-full md:w-[420px]">
              <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar serviço (ex: porte, casamento, registro...)"
                className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-8">
          {secoesFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-gray-700">
              Nenhum serviço encontrado para essa busca.
            </div>
          ) : (
            secoesFiltradas.map((sec) => (
              <section key={sec.title} className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{sec.title}</h3>
                <Table rows={sec.items} />
              </section>
            ))
          )}
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p className="text-sm">© {new Date().getFullYear()} Jurídico Atlanta RP</p>
      </footer>
    </div>
  );
}