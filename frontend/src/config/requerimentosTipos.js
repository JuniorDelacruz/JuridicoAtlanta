// frontend/src/config/requerimentosTipos.js
const ESTADOS_CIDADES = {
    "Ambarino": ["Ambarino", "Cidade do Gelo", "Kattegat"],
    "Guarma": ["Ilha de Guarma", "Tortuga"],
    "New Hanover": ["Valentine", "Annesburg", "Van Horn", "Emerald Ranch"],
    "Lemoyne": ["Saint Denis", "Rhodes", "Braithwaite", "Lagras"],
    "México": ["México"],
    "New Austin": ["New Austin", "Armadillo", "Tumbleweed", "MacFarlane's Ranch"],
    "West Elizabeth": ["Black Water", "Strawberry"],
};


export const TIPOS_REQUERIMENTO = [
    {
        slug: "porte-de-arma",
        tipoDb: "Porte de Arma",
        label: "Porte de Arma",
        roles: ["auxiliar", "advogado", "juiz", "promotor", "promotorchefe", "admin"],
        subRole: ['equipejuridico'],
        fields: [
            { name: "numeroRegistro", label: "Número de Registro (Cartório)", type: "text", required: true, verifyCadastro: true, },
            {
                name: "arma", label: "Qual a arma?", type: "select", required: true, multiple: true, options: [
                    "Revolver Lemat", "Revolver Navy Crossover", "Revolver Navy", "Pistol M1899", "Pistol Mauser",
                    "Carabine Repeater", "Evans Repeater", "Winchester Repeater", "Boltaction Rifle", "Springfield Rifle",
                    "Elephant Rifle", "Varmint Rifle", "Rolling Block Rifle", "Carcano Rifle",
                    "Semi-Auto Shotgun", "Repeating Shotgun", "Double Barrel Shotgun", "Double Barrel Exotic Shotgun",
                    "Pump Shotgun", "Sawedoff Shotgun", "Metralhadora Thompson"
                ]
            },
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
            { name: "numeroIdentificacaoNoivo", label: "Numero Cidadão do Noivo", type: "text", required: true, verifyCadastro: true, },
            { name: "numeroIdentificacaoNoiva", label: "Numero Cidadão da Noiva", type: "text", required: true, verifyCadastro: true, },
            { name: "numeroIdentificacaoTest1", label: "Numero Cidadão da Testemunha 1", type: "text", required: true, verifyCadastro: true, },
            { name: "numeroIdentificacaoTest2", label: "Numero Cidadão da Testemunha 2", type: "text", required: true, verifyCadastro: true, },
            { name: "numeroIdentificacaoTest3", label: "Numero Cidadão da Testemunha 3", type: "text", required: true, verifyCadastro: true, },
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
                            { name: "numeroIdentificacao", label: "Número de Identificação (Registro Cartório)", type: "text", required: true, verifyCadastro: true },

                            // ✅ Estado (single)
                            {
                                name: "nomeEstado",
                                label: "Qual o Estado?",
                                type: "select",
                                required: true,
                                multiple: false,
                                options: Object.keys(ESTADOS_CIDADES),

                                // ✅ quando estado mudar, limpa cidade
                                resets: ["cidade"],
                            },

                            // ✅ Cidade depende do Estado
                            {
                                name: "cidade",
                                label: "Qual a Cidade?",
                                type: "select",
                                required: true,

                                // ⬇️ isso aqui é o “motor” universal
                                dependsOn: "nomeEstado",
                                optionsByValue: ESTADOS_CIDADES,

                                // opcional: placeholder custom
                                placeholder: "Selecione o estado primeiro...",
                            },

                            {
                                name: "setor",
                                label: "Qual o setor da empresa?",
                                type: "select",
                                required: false,
                                multiple: false,
                                options: [
                                    "Saloon", "Armaria", "Estábulo", "Ferraria", "Artesanato", "Doceria", "Gráfica", "Padaria", "Ateliê", "Jornal", "Madereira", "Tabacaria", "Berçária", "Mineradora", "Cooperativa (Ferrovia e Hidrovia)", "Imobiliária", "Veterinária"
                                ],
                            },
                        ],
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

{
    slug: "registro-arma",
        label: "Registro de Arma",
            tipoDb: "Registro de Arma",
                roles: ["auxiliar", "advogado", "tabeliao", "escrivao", "conselheiro", "juiz", "promotor", "promotorchefe", "admin"],
                    subRole: ['equipejuridico'],
                        disable: true,
                            fields: [
                                { name: "porteNumero", label: "Número do Porte" },
                                { name: "numeroSerial", label: "Número de Série" },
                                { name: "imagemIdentidadeUrl", label: "Imagem da Identidade (URL)" },
                            ],
    },
];


export function getTipoBySlug(slug) {
    return TIPOS_REQUERIMENTO.find((t) => t.slug === slug);
}