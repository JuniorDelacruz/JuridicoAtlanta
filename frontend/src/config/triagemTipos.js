// frontend/src/config/triagemTipos.js
export const TRIAGEM_TIPOS = [
    {
        slug: "cadastro",
        label: "Novo Cadastro",
        tipoDb: "Cadastro",
        permKey: "triagem.acessar.cadastro",
        path: "/triagem/cadastro",
    },
    {
        slug: "porte-de-arma",
        label: "Porte de Arma",
        tipoDb: "Porte de Arma",
        permKey: "triagem.acessar.portearma",
        path: "/triagem/porte-de-arma",
    },
    {
        slug: "registro-arma",
        label: "Registro de Arma",
        tipoDb: "Registro de Arma",
        permKey: "triagem.acessar.registroarma",
        path: "/triagem/registro-arma",
    },
    {
        slug: "troca-de-nome",
        label: "Troca de Nome",
        tipoDb: "Troca de Nome",
        permKey: "triagem.acessar.trocadenome",
        path: "/triagem/troca-de-nome",
    },
    {
        slug: "casamento",
        label: "Casamento",
        tipoDb: "Casamento",
        permKey: "triagem.acessar.casamento",
        path: "/triagem/casamento",
    },
    {
        slug: "alvara",
        label: "Alvará",
        tipoDb: "Emitir Alvará",
        permKey: "triagem.acessar.alvara",
        path: "/triagem/alvara",
    },
    {
        slug: "renovacao-alvara",
        label: "Renovação de Alvará",
        tipoDb: "Renovação de Alvará",
        permKey: "triagem.acessar.renovacaoalvara",
        path: "/triagem/renovacao-alvara",
    },
    {
        slug: "limpeza-de-ficha",
        label: "Limpeza de Ficha",
        tipoDb: "Limpeza de Ficha",
        permKey: "triagem.acessar.limpezadeficha",
        path: "/triagem/limpeza-de-ficha",
    },
    {
        slug: "recolhimento-limpeza-de-ficha",
        label: "Recolhimento Limpeza de Ficha",
        tipoDb: "Recolhimento Limpeza de Ficha",
        permKey: "triagem.acessar.recolhimentolimpezadeficha",
        path: "/triagem/recolhimento-limpeza-de-ficha",
    },
    {
        slug: "carimbo",
        label: "Carimbo Porte de Armas",
        tipoDb: "carimbo", // você usa isso no backend
        permKey: "triagem.acessar.carimboportedearmas",
        path: "/triagem/carimbo",
    },
];

export function getTriagemTipoBySlug(slug) {
    return TRIAGEM_TIPOS.find((t) => t.slug === slug);
}
