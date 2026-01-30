// index.js
const Discord = require("discord.js");
require('dotenv').config();
const config = require("./config.json");
const { Sequelize, DataTypes } = require("sequelize");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

// const atualizarCaixa = require("./Comandos/AWD/Atualizarcaixa.js");

const client = new Discord.Client({
  intents: [3276799],
  // se usar coletores de reação/mensagens antigas, ative partials:
  // partials: [Discord.Partials.Message, Discord.Partials.Channel, Discord.Partials.Reaction, Discord.Partials.GuildMember, Discord.Partials.User],
});
module.exports = client;

client.slashCommands = new Discord.Collection();

// ====== DB / Sequelize ======
class Database extends Sequelize {
  constructor() {
    super(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      pool: {
        max: 3,
        min: 0,
        idle: 10_000,
        acquire: 30_000,
      },
      timezone: "-03:00", // em Postgres, timestamptz salva UTC; mantenha conversões na aplicação
    });
  }
}
const sequelize = new Database();

async function loadModels() {
  const modelsDir = path.join(__dirname, "Schemas");
  const models = {};
  const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const full = path.join(modelsDir, file);
    try {
      console.log(`Carregando modelo: ${file}`);
      let factory = require(full);
      if (factory && typeof factory === "object" && "default" in factory) {
        factory = factory.default; // suporta export default
      }
      if (typeof factory !== "function") {
        console.warn(`⚠️ ${file}: export inválido (esperado function). Ignorando.`);
        continue;
      }

      // suporta fábricas síncronas ou assíncronas
      let model = factory(sequelize, DataTypes);
      if (model && typeof model.then === "function") {
        model = await model;
      }

      if (!model || !model.name) {
        console.warn(`⚠️ ${file}: factory não retornou um Model válido. Ignorando.`);
        continue;
      }

      models[model.name] = model;
    } catch (err) {
      console.error(`❌ Falha ao carregar ${file}:`, err);
    }
  }

  // associações (se houver)
  for (const mdl of Object.values(models)) {
    if (mdl && typeof mdl.associate === "function") {
      mdl.associate(models);
    }
  }

  try {
    await sequelize.authenticate();
    console.log(chalk.greenBright("✅ Conexão com o banco de dados bem-sucedida!"));
    await sequelize.sync({ alter: false }); // em produção prefira migrations
    console.log(chalk.blueBright("🕍 Tabelas sincronizadas com sucesso!"));
  } catch (err) {
    console.error(chalk.redBright("❌ Erro ao conectar/sincronizar:"), err);
  }

  client.db = models;
  console.log("Models prontos:", Object.keys(client.db));
}

// ====== eventos base do cliente ======
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.slashCommands.get(interaction.commandName);
  if (!cmd) {
    return interaction.reply({ content: "Comando não encontrado.", flags: 64 }).catch(() => { });
  }

  // garante member preenchido
  if (!interaction.member && interaction.inGuild()) {
    interaction.member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  }

  // para comandos que demoram, ganhar tempo
  await interaction.deferReply({ flags: 64 }).catch(() => { });

  try {
    await cmd.run(client, interaction);
  } catch (err) {
    console.error("Erro no comando:", err);
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content: "❌ Ocorreu um erro ao executar o comando." }).catch(() => { });
    }
  }
});

client.on(Discord.Events.ClientReady, () => {
  console.log(`🍀 Estou online em ${client.user.username}!`);
  client.user.setPresence({
    activities: [{ name: "Trinda Boost", type: 2 }],
    status: "dnd",
  });

  // atualizarCaixa.initCron(client); // se usar cron, inicialize aqui depois de online
});

// ====== carregar eventos (arquivos) ======
function percorrerSubpastas(diretorio) {
  const itens = fs.readdirSync(diretorio);
  for (const item of itens) {
    const itemPath = path.join(diretorio, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      percorrerSubpastas(itemPath);
      continue;
    }
    if (stats.isFile() && item.endsWith(".js")) {
      const caminhoRelativo = `./${path.relative(__dirname, itemPath)}`;
      require(caminhoRelativo); // seus eventos usam `require('../../index')` para pegar o client
    }
  }
}

// ====== handlers de erro globais ======
process.on("uncaughtException", (err) => {
  console.log(chalk.red("[FATAL ERROR]"));
  console.log(chalk.blue(err.stack || err.message));
});
process.on("unhandledRejection", (reason) => {
  console.log(chalk.red("[FATAL ERROR]"));
  console.log(chalk.blue(reason instanceof Error ? reason.stack : reason));
});

// ====== bootstrap: models → handlers → eventos → login ======
export async function bootstrap() {
  await loadModels();                 // 1) garante client.db pronto
  require("./handler")(client);       // 2) registra slash commands em client.slashCommands
  percorrerSubpastas(path.join(__dirname, "Eventos")); // 3) carrega eventos
  await client.login(config.token);   // 4) loga o bot
}

bootstrap().catch((err) => {
  console.error(chalk.red("[BOOT ERROR]"), err);
});
