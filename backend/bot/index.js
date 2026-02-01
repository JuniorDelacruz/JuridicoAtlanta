// index.js
import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.slashCommands = new Collection();

// Função auxiliar para carregar comandos (retorna array de comandos carregados)
async function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, "Comandos");

  try {
    const subfolders = await fs.readdir(commandsPath, { withFileTypes: true });

    for (const folder of subfolders) {
      if (!folder.isDirectory()) continue;
      const folderPath = path.join(commandsPath, folder.name);
      const files = await fs.readdir(folderPath, { withFileTypes: true });

      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith(".js")) continue;

        const filePath = path.join(folderPath, file.name);
        const commandModule = await import(filePath);
        const command = commandModule.default ?? commandModule;

        if (!command?.name) {
          console.warn(`Comando sem name ignorado: ${filePath}`);
          continue;
        }

        client.slashCommands.set(command.name, command);
        commands.push(command);
        console.log(`Comando carregado: /${command.name}`);
      }
    }
  } catch (err) {
    console.error("Erro ao carregar comandos:", err);
  }

  return commands;
}

// Carrega eventos (como antes)
async function loadEventFiles(directory) {
  try {
    const items = await fs.promises.readdir(directory, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(directory, item.name);

      if (item.isDirectory()) {
        await loadEventFiles(itemPath);
        continue;
      }

      if (item.isFile() && item.name.endsWith(".js")) {
        const module = await import(itemPath);
        if (typeof module.default === "function") {
          module.default(client);
        } else if (typeof module.setup === "function") {
          module.setup(client);
        }
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`Pasta de eventos não encontrada: ${directory}`);
    } else {
      console.error(`Erro ao ler pasta de eventos ${directory}:`, err);
    }
  }
}

// Listener de ready → aqui registramos os comandos
client.on(Events.ClientReady, async () => {
  console.log(`Bot online como ${client.user.tag}`);

  const commands = await loadCommands(); // carrega comandos aqui

  if (commands.length === 0) {
    console.warn("Nenhum comando foi carregado!");
    return;
  }

  try {
    // Para testes: registre APENAS no servidor de desenvolvimento
    const testGuildId = "SEU_ID_DO_SERVIDOR_DE_TESTE_AQUI"; // ← coloque aqui
    const guild = client.guilds.cache.get(testGuildId);

    if (guild) {
      console.log(`Registrando ${commands.length} comandos no servidor de teste (${guild.name})`);
      await guild.commands.set(commands.map(c => c)); // ou use .set(commands) se for array de objetos JSON
      console.log("Comandos registrados no servidor de teste com sucesso!");
    } else {
      console.warn("Servidor de teste não encontrado. Use deploy global para produção.");
      // Deploy global (lento) - descomente só quando necessário
      // await client.application.commands.set(commands);
    }
  } catch (error) {
    console.error("Erro ao registrar comandos:", error);
  }
});

// Seu interactionCreate (como antes)
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.slashCommands.get(interaction.commandName);
  if (!cmd) return interaction.reply({ content: "Comando não encontrado.", ephemeral: true }).catch(() => { });

  if (!interaction.member && interaction.inGuild()) {
    interaction.member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  }

  await interaction.deferReply({ ephemeral: true }).catch(() => { });

  try {
    await cmd.run(client, interaction);
  } catch (err) {
    console.error("Erro executando comando:", err);
    if (!interaction.replied && interaction.deferred) {
      await interaction.editReply({ content: "❌ Erro ao executar o comando." }).catch(() => { });
    }
  }
});

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN não definido.");

  // Carrega eventos (handler de eventos, scheduler, etc.)
  await loadEventFiles(path.join(__dirname, "Eventos"));

  // Se ainda quiser manter handler de comandos separado, chame aqui
  // const { default: loadHandler } = await import("./handler/index.js");
  // await loadHandler(client);

  await client.login(token);
}