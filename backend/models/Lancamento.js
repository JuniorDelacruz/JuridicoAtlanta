export default (sequelize, DataTypes) => {
  const Lancamento = sequelize.define(
    "Lancamento",
    {
      id: { type: DataTypes.INTEGER,allowNull: false, primaryKey: true, autoIncrement: true },

      tipo: { type: DataTypes.STRING, allowNull: false },
      titulo: { type: DataTypes.STRING, allowNull: true },
      descricao: { type: DataTypes.TEXT, allowNull: true },

      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "ATIVO" },
      data: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },

      createdBy: { type: DataTypes.INTEGER, allowNull: false }, // userId do criador

      // vínculo com requerimento
      requerimentoNumero: { type: DataTypes.INTEGER, allowNull: true, },
      numeroVinculo: { type: DataTypes.INTEGER, allowNull: true },
      // “de quem é quem”
      solicitanteNome: { type: DataTypes.STRING, allowNull: true },
      advogadoNome: { type: DataTypes.STRING, allowNull: true },
      advogadoDiscordId: { type: DataTypes.STRING, allowNull: true },

      // valores
      valorTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: false },
      repasseAdvogadoCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: false },
      repasseJuridicoCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: false },

      // repasse/pagamento
      pagoEm: { type: DataTypes.DATE, allowNull: true },
      pagoPor: { type: DataTypes.INTEGER, allowNull: true },
      pagoPorNome: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "lancamentos" }
  );

  return Lancamento;
};
