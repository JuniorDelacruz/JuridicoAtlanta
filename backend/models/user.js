// backend/models/user.js
import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class User extends Model { }

  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('cidadao', 'auxiliar', 'advogado', 'tabeliao', 'escrivao',
        'promotor', 'conselheiro', 'promotor Chefe', 'juiz', 'desembargador', 'admin', 'equipejuridico'),
      allowNull: true,
      defaultValue: 'cidadao'
    },
    subRole: {
      type: DataTypes.STRING,  // ou ENUM se quiser restringir valores
      allowNull: true,
      defaultValue: null,
      field: 'sub_role'  // nome no banco
    },
    discordId: {
      type: DataTypes.STRING,
      allowNull: true,          // pode ser null se o usuário logou de outra forma
      unique: true,             // garante que cada Discord ID seja único
      field: 'discord_id'       // nome da coluna no banco (snake_case, padrão PostgreSQL)
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true
  });

  return User;
};