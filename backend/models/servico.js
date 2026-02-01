export default (sequelize, DataTypes) => {
  const Servico = sequelize.define(
    "Servico",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // "registro_arma", "troca_nome", etc (value usado no lançamento)
      tipo: { type: DataTypes.STRING, allowNull: false, unique: true },

      // Nome amigável pro select
      label: { type: DataTypes.STRING, allowNull: false },

      // Regras de acesso
      allowAny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      roles: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },
      subRoles: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },

      // Valores (em cents)
      valorTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      repasseAdvogadoCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      criadoPor: { type: DataTypes.INTEGER, allowNull: true },
      atualizadoPor: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "servicos",
      timestamps: true,
    }
  );

  return Servico;
};
