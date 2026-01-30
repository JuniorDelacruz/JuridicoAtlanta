// backend/models/cadastroCidadao.js
import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class CadastroCidadao extends Model {
    static associate(models) {
      CadastroCidadao.belongsTo(models.User, { foreignKey: 'userId' }); // quem iniciou
      CadastroCidadao.belongsTo(models.User, { foreignKey: 'aprovadoPor', as: 'aprovador' }); // quem aprovou
    }
  }

  CadastroCidadao.init({
    nomeCompleto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pombo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    identidade: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // evita duplicatas
    },
    profissao: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    residencia: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discordId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    imagemIdentidade: {
      type: DataTypes.STRING, // URL da imagem (ex: link do Discord ou upload)
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'INDEFERIDO'),
      defaultValue: 'PENDENTE',
      allowNull: false,
    },
    aprovadoPor: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    dataAprovacao: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // quem iniciou no site, se for via frontend
      references: { model: 'users', key: 'id' },
    },
    conjugê: {
      type: DataTypes.STRING, // URL da imagem (ex: link do Discord ou upload)
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'CadastroCidadao',
    tableName: 'cadastro_cidadaos',
    timestamps: true,
  });

  return CadastroCidadao;
};