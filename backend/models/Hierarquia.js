// models/Hierarquia.js
import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Hierarquia extends Model {}

  Hierarquia.init({
    configId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // index: true  → em Sequelize v6+, índices são definidos separadamente ou via migrate
      // Se quiser índice, crie via migration ou use underscored: true + indexOptions
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Hierarquia',
    tableName: 'Hierarquia',
    timestamps: false,
    // underscored: true,  // opcional: se quiser snake_case automático nas colunas
    // indexes: [           // se precisar de índice composto ou explícito
    //   {
    //     fields: ['configId', 'userId'],
    //     unique: true  // exemplo: combinação config + user deve ser única
    //   }
    // ]
  });

  return Hierarquia;
};