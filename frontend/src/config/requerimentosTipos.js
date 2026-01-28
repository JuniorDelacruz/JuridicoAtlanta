// frontend/src/config/requerimentosTipos.js
export const TIPOS_REQUERIMENTO = [
    {
        slug: "porte-de-arma",
        tipoDb: "Porte de Arma",
        label: "Porte de Arma",
        roles: ["auxiliar", "advogado", "juiz", "promotor", "promotorchefe", "admin"],
        subRole: ['equipejuridico'],
        fields: [
            {
                name: "arma", label: "Qual a arma?", type: "select", required: true, multiple: true,options: [
                    "Revolver Lemat", "Revolver Navy Crossover", "Revolver Navy", "Pistol M1899", "Pistol Mauser",
                    "Carabine Repeater", "Evans Repeater", "Winchester Repeater", "Boltaction Rifle", "Springfield Rifle",
                    "Elephant Rifle", "Varmint Rifle", "Rolling Block Rifle", "Carcano Rifle",
                    "Semi-Auto Shotgun", "Repeating Shotgun", "Double Barrel Shotgun", "Double Barrel Exotic Shotgun",
                    "Pump Shotgun", "Sawedoff Shotgun", "Metralhadora Thompson", "Todos os armamentos"
                ]
            },
            { name: "numeroRegistro", label: "Número de Registro (Cartório)", type: "text", required: true, verifyCadastro: true, },
            { name: "numeroSerial", label: "Numero Serial", type: "text", required: true },
        ],
    },
    {
        slug: "troca-de-nome",
        tipoDb: "Troca de Nome",
        label: "Troca de Nome",
        roles: ["auxiliar", "advogado", "juiz", "promotor", "promotorchefe", "admin"],
        subRole: ['equipejuridico'],
        fields: [
            { name: "numeroIdentificacao", label: "Número de Identificação (Registro Cartório)", type: "text", required: true, verifyCadastro: true, },
            { name: "novoNome", label: "Novo Nome Desejado", type: "text", required: true },
            { name: "motivo", label: "Motivo da troca", type: "textarea", required: true },
        ],
    },
    {
        slug: "casamento",
        tipoDb: "Casamento",
        label: "Casamento",
        roles: ["tabeliao", "escrivao", "juiz", "admin"],
        subRole: ['equipejuridico'],
        fields: [
            { name: "numeroIdentificacao", label: "Número de Identificação (Registro Cartório)", type: "text", required: true, verifyCadastro: true, },
        ]
    },
    {
        slug: "limpeza-de-ficha",
        tipoDb: "Limpeza de Ficha",
        label: "Limpeza de Ficha",
        roles: ["auxiliar", "advogado", "juiz", "promotor", "promotorchefe", "admin"],
        subRole: ['equipejuridico'],
        fields: [
            { name: "numeroIdentificacao", label: "Número de Identificação (Registro Cartório)", type: "text", required: true, verifyCadastro: true, },
        ]
    },
    {
        slug: "alvara",
        tipoDb: "Emitir Alvará",
        label: "Emitir Alvará",
        roles: ["auxiliar", "advogado", "tabeliao", "escrivao", "conselheiro", "juiz", "promotor", "promotorchefe", "admin"],
        subRole: ['equipejuridico'],
        fields: [
            { name: "numeroIdentificacao", label: "Número de Identificação (Registro Cartório)", type: "text", required: true, verifyCadastro: true, },
        ]
    },
    {
        slug: "renovacao-alvara",
        tipoDb: "Renovação de Alvará",
        label: "Renovação de Alvará",
        roles: ["auxiliar", "advogado", "tabeliao", "escrivao", "conselheiro", "juiz", "promotor", "promotorchefe", "admin"],
        subRole: ['equipejuridico'],
        fields: [
            { name: "numeroIdentificacao", label: "Número de Identificação (Registro Cartório)", type: "text", required: true, verifyCadastro: true, },
        ]
    },
];


export function getTipoBySlug(slug) {
    return TIPOS_REQUERIMENTO.find((t) => t.slug === slug);
}