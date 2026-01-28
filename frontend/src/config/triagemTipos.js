// frontend/src/config/triagemTipos.js
export const TRIAGEM_TIPOS = [
{
slug: "troca-nome",
label: "Troca de Nome",
tipoDb: "Troca de Nome",
roles: ["juiz", "admin"], // + equipejuridico
},
{
slug: "porte-de-arma",
label: "Porte de Arma",
tipoDb: "Porte de Arma",
roles: ["juiz", "admin"], // + equipejuridico
},
{
slug: "registro-arma",
label: "Registro de Arma",
tipoDb: "Registro de Arma",
roles: ["juiz", "admin"], // + equipejuridico
},
{
slug: "casamento",
label: "Casamento",
tipoDb: "Casamento",
roles: ["escrivao", "juiz", "admin"], // + equipejuridico
},
{
slug: "alvara",
label: "Alvará",
tipoDb: "Alvará",
roles: ["tabeliao", "escrivao", "promotor", "promotorchefe", "juiz", "admin"], // + equipejuridico
},
{
slug: "limpeza-ficha",
label: "Limpeza de Ficha",
tipoDb: "Limpeza de Ficha",
roles: ["promotor", "promotorchefe", "juiz", "admin"], // + equipejuridico
},
];


export function getTriagemTipoBySlug(slug) {
return TRIAGEM_TIPOS.find((t) => t.slug === slug);
}