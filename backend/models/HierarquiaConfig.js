// models/HierarquiaConfig.js
import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class HierarquiaConfig extends Model {}

  HierarquiaConfig.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    guildId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    roleIds: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const raw = this.getDataValue('roleIds');
        try {
          return JSON.parse(raw || '[]');
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('roleIds', JSON.stringify(Array.isArray(value) ? value : []));
      },
    },
    channelId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logChannelId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scheduleCron: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0 10 * * *',
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'HierarquiaConfig',
    tableName: 'HierarquiaConfig',
    timestamps: false,
    // underscored: true, // opcional: ativa snake_case automático se preferir
  });

  return HierarquiaConfig;
};