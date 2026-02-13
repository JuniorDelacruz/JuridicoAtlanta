// frontend/src/pages/valores/Valores.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, BadgeDollarSign } from "lucide-react";

const toNumberBRL = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;

  const s = String(v).trim();
  if (!s || s === "-") return null;

  // aceita "R$ 1.500,00", "$1.500,00", "1500", "1.500,00"
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const moneyBRL = (n) => {
  if (n === null) return "—";
  return `R$ ${n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const pct = (v) => {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "number" ? v : toNumberBRL(v);
  if (n === null) return "—";
  return `${(n * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
};

function calcPartes(valorTotal, pAdv, pTab, pJur) {
  const v = toNumberBRL(valorTotal);
  if (v === null) return { adv: null, tab: null, jur: null };
  return {
    adv: v * (pAdv ?? 0),
    tab: v * (pTab ?? 0),
    jur: v * (pJur ?? 0),
  };
}

// ✅ tudo junto em 1 lista
const ITENS = [
  { nome: "Alvarás", valor: "R$ 300,00", pAdv: 0.3, pTab: 0.2, pJur: 0.5 },
  { nome: "Boltaction Rifle", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Cadastro Cidadão", valor: "R$ 95,00", pAdv: 0.43, pTab: 0.2, pJur: 0.37 },
  { nome: "Carabina Repeater", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Carcano Rifle", valor: "R$ 1.670,00", pAdv: 0.36, pTab: 0.0, pJur: 0.64 },
  { nome: "Casamento Completo", valor: "R$ 3.650,00", pAdv: 0.3, pTab: 0.2, pJur: 0.5 },
  { nome: "Casamento Simples", valor: "R$ 1.360,00", pAdv: 0.3, pTab: 0.2, pJur: 0.5 },
  { nome: "Certidão Casamento", valor: "R$ 5.000,00", pAdv: 0.3, pTab: 0.2, pJur: 0.5 },
  { nome: "Certidão Divórcio", valor: "R$ 5.000,00", pAdv: 0.3, pTab: 0.2, pJur: 0.5 },
  { nome: "Double Barrel Exotic Shotgun", valor: "R$ 1.000,00", pAdv: 0.5, pTab: 0.0, pJur: 0.5 },
  { nome: "Double Barrel Shotgun", valor: "R$ 980,00", pAdv: 0.4, pTab: 0.0, pJur: 0.6 },
  { nome: "Elephant Rifle", valor: "R$ 980,00", pAdv: 0.4, pTab: 0.0, pJur: 0.6 },
  { nome: "Evans Repeater", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Honorários I", valor: "R$ 500,00", pAdv: 0.0, pTab: 0.0, pJur: 1.0 },
  { nome: "Honorários II", valor: "R$ 1.500,00", pAdv: 0.0, pTab: 0.0, pJur: 1.0 },
  { nome: "Honorários III", valor: "R$ 4.000,00", pAdv: 0.0, pTab: 0.0, pJur: 1.0 },
  { nome: "Limpeza de Ficha", valor: "R$ 500,00", pAdv: 0.7, pTab: 0.0, pJur: 0.3 },
  { nome: "Metralhadora Thompson", valor: "R$ 4.500,00", pAdv: 0.4, pTab: 0.0, pJur: 0.6 },
  { nome: "Mudança de Nome", valor: "R$ 2.360,00", pAdv: 0.3, pTab: 0.2, pJur: 0.5 },
  { nome: "Notificação Judicial", valor: "R$ 150,00", pAdv: 0.47, pTab: 0.2, pJur: 0.33 },
  { nome: "Pistola M1899", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Pistola Mauser", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Pump Shotgun", valor: "R$ 1.250,00", pAdv: 0.36, pTab: 0.0, pJur: 0.64 },
  { nome: "Registro Paternidade", valor: "R$ 500,00", pAdv: 0.3, pTab: 0.2, pJur: 0.5 },
  { nome: "Renovação Alvará", valor: "R$ 150,00", pAdv: 0.3, pTab: 0.2, pJur: 0.5 },
  { nome: "Repeating Shotgun", valor: "R$ 1.670,00", pAdv: 0.36, pTab: 0.0, pJur: 0.64 },
  { nome: "Revolver Lemat", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Revolver Navy", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Revolver NavyCross", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Rolling Block Rifle", valor: "R$ 1.200,00", pAdv: 0.48, pTab: 0.0, pJur: 0.52 },
  { nome: "Sawedoff Shotgun", valor: "R$ 1.200,00", pAdv: 0.42, pTab: 0.0, pJur: 0.58 },
  { nome: "Semi-Auto Shotgun", valor: "R$ 1.670,00", pAdv: 0.36, pTab: 0.0, pJur: 0.64 },
  { nome: "Springfield Rifle", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
  { nome: "Varmint Rifle", valor: "R$ 980,00", pAdv: 0.4, pTab: 0.0, pJur: 0.6 },
  { nome: "Winchester Repeater", valor: "R$ 110,00", pAdv: 0.35, pTab: 0.0, pJur: 0.65 },
];

function Table({ rows }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="min-w-[1150px] w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr className="text-left text-gray-700">
            <th className="p-3">Nome</th>
            <th className="p-3">Valor total</th>
            <th className="p-3">% Adv</th>
            <th className="p-3">% Tabelião</th>
            <th className="p-3">% Jurídico</th>
            <th className="p-3">R$ Adv</th>
            <th className="p-3">R$ Tabelião</th>
            <th className="p-3">R$ Jurídico</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => {
            const partes = calcPartes(r.valor, r.pAdv, r.pTab, r.pJur);
            return (
              <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="p-3 font-semibold text-gray-900">{r.nome}</td>
                <td className="p-3 text-gray-800">{moneyBRL(toNumberBRL(r.valor))}</td>
                <td className="p-3 text-gray-700">{pct(r.pAdv)}</td>
                <td className="p-3 text-gray-700">{pct(r.pTab)}</td>
                <td className="p-3 text-gray-700">{pct(r.pJur)}</td>
                <td className="p-3 text-gray-800">{moneyBRL(partes.adv)}</td>
                <td className="p-3 text-gray-800">{moneyBRL(partes.tab)}</td>
                <td className="p-3 text-gray-800">{moneyBRL(partes.jur)}</td>
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

  // ✅ busca por nome e mostra só os itens encontrados
  const rowsFiltradas = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return ITENS;
    return ITENS.filter((it) => it.nome.toLowerCase().includes(query));
  }, [q]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BadgeDollarSign className="h-8 w-8" />
            <h1 className="text-xl font-bold">Tabela de Valores</h1>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto py-8 px-6 w-full">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Valores e repasses</h2>
              <p className="text-sm text-gray-600">
                Busca por nome e cálculo automático de repasse (Adv / Tabelião / Jurídico).
              </p>
            </div>

            <div className="relative w-full md:w-[420px]">
              <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar (ex: alvará, casamento, rifle, honorários...)"
                className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          {rowsFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-gray-700">
              Nenhum item encontrado para essa busca.
            </div>
          ) : (
            <section className="bg-white rounded-xl shadow p-6">
              <Table rows={rowsFiltradas} />
            </section>
          )}
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 text-center mt-auto">
        <p className="text-sm">© {new Date().getFullYear()} Jurídico Atlanta RP</p>
      </footer>
    </div>
  );
}
