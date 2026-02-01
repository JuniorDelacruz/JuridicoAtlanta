import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class ServicoJuridico extends Model {}

  ServicoJuridico.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // Texto que aparece no select
      label: { type: DataTypes.STRING, allowNull: false },

      // Valor salvo (ex: "registro_arma") — também vai para o "tipo" do lançamento
      value: { type: DataTypes.STRING, allowNull: false, unique: true },

      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      // valores padrão do serviço (em centavos)
      valorTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      repasseAdvogadoCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

      // Regras de visibilidade (mesmo padrão do seu allow)
      // { any: true } OU { roles: [...], subRoles: [...] }
      allow: { type: DataTypes.JSONB, allowNull: false, defaultValue: { any: true } },
    },
    {
      sequelize,
      modelName: "ServicoJuridico",
      tableName: "servicos_juridicos",
      timestamps: true,
    }
  );

  return ServicoJuridico;
};
