// index.js (ou o arquivo que tem startBot)
import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.slashCommands = new Collection();

// Função para carregar eventos recursivamente (usando import dinâmico)
async function loadEventFiles(directory) {
  const items = await fs.promises.readdir(directory, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(directory, item.name);

    if (item.isDirectory()) {
      await loadEventFiles(itemPath);
      continue;
    }

    if (item.isFile() && item.name.endsWith(".js")) {
      // Import dinâmico
      const module = await import(itemPath);
      // Se o evento exporta uma função default ou named, chame aqui
      // Exemplo comum: module.default(client) ou module.setup(client)
      // Ajuste conforme seus arquivos de evento
      if (typeof module.default === "function") {
        module.default(client);
      } else if (typeof module.setup === "function") {
        module.setup(client);
      }
      // Ou se seus eventos já fazem client.on internamente, só o import já basta
    }
  }
}

// Eventos base
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.slashCommands.get(interaction.commandName);
  if (!cmd) {
    return interaction.reply({ content: "Comando não encontrado.", ephemeral: true }).catch(() => {});
  }

  if (!interaction.member && interaction.inGuild()) {
    interaction.member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await cmd.run(client, interaction);
  } catch (err) {
    console.error("Erro no comando:", err);
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content: "❌ Ocorreu um erro ao executar o comando." }).catch(() => {});
    }
  }
});

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN não definido.");

  // Carrega o handler (se handler.js exporta uma função default)
  const { default: handler } = await import("./handler/index");
  handler(client);  // ou await handler(client) se for async

  // Carrega todos os eventos da pasta
  await loadEventFiles(path.join(__dirname, "Eventos"));

  await client.login(token);
  console.log("[bot] logado como", client.user?.tag);
}