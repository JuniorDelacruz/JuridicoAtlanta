const Discord = require("discord.js")

module.exports = {
  name: "anunciar", // Coloque o nome do comando
  description: "Anuncie algo em uma embed.", // Coloque a descrição do comando
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "canal",
      description: "Selecione o canal.",
      type: Discord.ApplicationCommandOptionType.Channel,
      required: true,
    },
    {
      name: "marcar",
      description: "Deseja marcar @everyone na mensagem?",
      type: Discord.ApplicationCommandOptionType.Boolean,
      required: true,
    },
    {
      name: "color",
      description: "Selecione o canal.",
      type: Discord.ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "foto",
      description: "Coloque uma imagem.",
      type: Discord.ApplicationCommandOptionType.Attachment,
      required: false,
    },

  ],

  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
      interaction.editReply({ content: `Você não possui permissão para utilizar este comando.`, ephemeral: true })
    }
  }
};