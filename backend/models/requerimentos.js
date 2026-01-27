// backend/models/requerimento.js
import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Requerimento extends Model {
    static associate(models) {
      // Relacionamento com User (quem criou o requerimento)
      Requerimento.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  Requerimento.init({
    numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      autoIncrement: true,
      primaryKey: true,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'INDEFERIDO'),
      defaultValue: 'PENDENTE',
      allowNull: false,
    },
    solicitante: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dados: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'Requerimento',
    tableName: 'requerimentos',
    timestamps: true,
  });

  return Requerimento;
};