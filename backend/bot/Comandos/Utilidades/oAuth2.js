// Comandos/Seguranca/VerificacaoSetup.js
const {
  ApplicationCommandType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  name: "verificacao_setup",
  description: "Posta a mensagem de verificação com botão",
  type: ApplicationCommandType.ChatInput,

  // Se seu handler não usa SlashCommandBuilder, deixe como está.
  // Caso use auto-registro, isso já basta:
  options: [],

  run: async (client, interaction) => {
    // Apenas admins (ou ajuste como quiser)
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.editReply({
        content: "❌ Você não tem permissão para usar este comando.",
        ephemeral: true,
      });
    }

    // Mensagem fixa com o botão
    const embed = new EmbedBuilder()
      .setColor(0x24a803) // verde que você usa
      .setDescription(
        [
          "# <:documentfile:1430033636974923827>   Verificação de Acesso",
          "Para acessar o restante do servidor, clique no botão abaixo.",
          "Você receberá **um código de 4 dígitos** e um menu com 4 opções.",
          "Escolha a opção **igual ao código mostrado** para concluir a verificação.",
        ].join("\n")
      );

    const btn = new ButtonBuilder()
      .setCustomId("verify:start")
      .setStyle(ButtonStyle.Success)
      .setLabel("Começar verificação");

    await interaction.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)],
      allowedMentions: { parse: [] },
    });

    return interaction.editReply({
      content: "✅ Mensagem de verificação enviada neste canal.",
      ephemeral: true,
    });
  },
};
