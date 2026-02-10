// backend/models/webhookConfig.js
import { Model, DataTypes } from 'sequelize';


export default (sequelize) => {
class WebhookConfig extends Model {
static associate(models) {
// opcional: quem criou/quem atualizou no painel
WebhookConfig.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
WebhookConfig.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
}
}


WebhookConfig.init({
id: {
type: DataTypes.INTEGER,
allowNull: false,
autoIncrement: true,
primaryKey: true,
},


// Use o MESMO valor que vai em requerimentos.tipo (ex: "Porte de Armas")
tipo: {
type: DataTypes.STRING,
allowNull: false,
unique: true,
},


url: {
type: DataTypes.TEXT,
allowNull: false,
},


enabled: {
type: DataTypes.BOOLEAN,
allowNull: false,
defaultValue: true,
},


// opcional: nome amigável pro painel
name: {
type: DataTypes.STRING,
allowNull: true,
},

mode: {
type: DataTypes.STRING,
allowNull: true,
},


// opcional: auditoria
createdBy: {
type: DataTypes.INTEGER,
allowNull: true,
references: { model: 'users', key: 'id' },
},
updatedBy: {
type: DataTypes.INTEGER,
allowNull: true,
references: { model: 'users', key: 'id' },
},
}, {
sequelize,
modelName: 'WebhookConfig',
tableName: 'webhook_configs',
timestamps: true,
});


return WebhookConfig;
};