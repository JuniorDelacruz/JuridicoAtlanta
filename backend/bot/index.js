import { Client, GatewayIntentBits, } from "discord.js";
import Discord from 'discord.js'

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.slashCommands = new Discord.Collection();

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
// ====== eventos base do cliente ======
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.slashCommands.get(interaction.commandName);
  if (!cmd) {
    return interaction.reply({ content: "Comando não encontrado.", ephemeral: true }).catch(() => { });
  }

  // garante member preenchido
  if (!interaction.member && interaction.inGuild()) {
    interaction.member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  }

  await interaction.deferReply({ ephemeral: true })
  try {
    await cmd.run(client, interaction);
  } catch (err) {
    console.error("Erro no comando:", err);
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content: "❌ Ocorreu um erro ao executar o comando." }).catch(() => { });
    }
  }
});

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN não definido.");
  require("./handler")(client);
  percorrerSubpastas(path.join(__dirname, "Eventos"));

  await client.login(token);
  console.log("[bot] logado como", client.user?.tag);
}
