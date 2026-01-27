// frontend/src/config/requerimentosTipos.js
export const TIPOS_REQUERIMENTO = [
{
slug: "porte-de-arma",
tipoDb: "Porte de Arma",
label: "Porte de Arma",
roles: ["auxiliar", "advogado", "juiz", "promotor", "promotorchefe", "admin"],
},
{
slug: "troca-de-nome",
tipoDb: "Troca de Nome",
label: "Troca de Nome",
roles: ["auxiliar", "advogado", "juiz", "promotor", "promotorchefe", "admin"],
},
{
slug: "casamento",
tipoDb: "Casamento",
label: "Casamento",
roles: ["tabeliao", "escrivao", "juiz", "admin"],
},
{
slug: "limpeza-de-ficha",
tipoDb: "Limpeza de Ficha",
label: "Limpeza de Ficha",
roles: ["auxiliar", "advogado", "juiz", "promotor", "promotorchefe", "admin"],
},
{
slug: "alvara",
tipoDb: "Emitir Alvará",
label: "Emitir Alvará",
roles: ["auxiliar", "advogado", "tabeliao", "escrivao", "conselheiro", "juiz", "promotor", "promotorchefe", "admin"],
},
{
slug: "renovacao-alvara",
tipoDb: "Renovação de Alvará",
label: "Renovação de Alvará",
roles: ["auxiliar", "advogado", "tabeliao", "escrivao", "conselheiro", "juiz", "promotor", "promotorchefe", "admin"],
},
];


export function getTipoBySlug(slug) {
return TIPOS_REQUERIMENTO.find((t) => t.slug === slug);
}