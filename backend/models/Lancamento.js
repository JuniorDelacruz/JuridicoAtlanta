export default (sequelize, DataTypes) => {
  const Lancamento = sequelize.define(
    "Lancamento",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tipo: { type: DataTypes.STRING, allowNull: false },
      titulo: { type: DataTypes.STRING, allowNull: true },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "ATIVO" },
      data: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdBy: { type: DataTypes.INTEGER, allowNull: false }, // userId do criador
    },
    {
      tableName: "lancamentos",
    }
  );

  return Lancamento;
};
