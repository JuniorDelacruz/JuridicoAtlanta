// backend/models/index.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();  // Carrega .env aqui também (garantia extra)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

// Importa o config corretamente (escolha UMA das formas abaixo)

// Forma 1: se config.js tem export default { development: {...} }
import configModule from '../config/config.js';
const config = configModule[env] || configModule.development;

// Forma 2: se for use_env_variable (mais comum para deploy)
let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : undefined,
    }
  });
} else {
  // fallback para config separado
  const config = configModule[env];
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

const db = {};

// Carrega todos os models dinamicamente
const files = await fs.readdir(__dirname);
for (const file of files) {
  if (
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    file.indexOf('.test.js') === -1
  ) {
    // Cria caminho completo como URL file:///
    const filePath = path.join(__dirname, file);
    const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');  // importante: barra invertida → barra normal

    const modelModule = await import(fileUrl);
    const defineModel = modelModule.default;

    if (typeof defineModel === 'function') {
      const model = defineModel(sequelize, DataTypes);
      db[model.name] = model;
    }
  }
}

// Executa associações (se você definir associate nos models)
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});




// Exporta tudo
db.sequelize = sequelize;
db.Sequelize = Sequelize;

if (process.env.NODE_ENV !== 'production') {
  (async () => {
    try {
      // await db.sequelize.sync({ alter: true });
      console.log('Banco sincronizado com sucesso (alter: true)! Colunas novas adicionadas/atualizadas.');
    } catch (err) {
      console.error('Erro ao sincronizar o banco (sync alter):', err.message);
      console.error('Stack:', err.stack);
    }
  })();
}

export default db;