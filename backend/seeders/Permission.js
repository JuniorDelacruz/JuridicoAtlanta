await Permission.bulkCreate(
  [
    { key: "admin.perms.manage", label: "Gerenciar permissões", group: "Admin" },

    { key: "lancamentos.view_meus", label: "Ver meus lançamentos", group: "Lançamentos" },
    { key: "lancamentos.view_all", label: "Ver lançamentos geral", group: "Lançamentos" },
    { key: "lancamentos.create", label: "Criar lançamento", group: "Lançamentos" },
    { key: "lancamentos.repasse.registrar", label: "Registrar repasse", group: "Lançamentos" },

    { key: "servicos.manage", label: "Gerenciar serviços", group: "Serviços" },
  ],
  { ignoreDuplicates: true }
);
