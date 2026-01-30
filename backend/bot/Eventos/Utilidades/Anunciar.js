const Discord = require("discord.js");
const client = require("../../index");

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand() && interaction.commandName === "anunciar") {
    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
      return interaction.editReply({
        content: "Você não possui permissão para utilizar este comando.",
        ephemeral: true,
      });
    }

    const canal = interaction.options.getChannel("canal");
    const color = interaction.options.getString("color") || "#aee100";
    const foto = interaction.options.getAttachment("foto");
    const marcarEveryone = interaction.options.getBoolean("marcar") || false;

    if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) {
      const emb = new Discord.EmbedBuilder()
        .setDescription(`
# ❌ NEGADO ❌
### A cor fornecida não é um código hexadecimal válido.
### Use um código de cor válido ou deixe em branco para usar a cor padrão.
`)
        .setTimestamp()
        .setFooter({
          text: "💠 Atenciosamente Trinda Boost",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      return interaction.editReply({ embeds: [emb], ephemeral: true });
    }

    const modal = new Discord.ModalBuilder()
      .setCustomId(`modal_anuncio_${interaction.id}`)
      .setTitle("Texto do Anúncio");

    const textoInput = new Discord.TextInputBuilder()
      .setCustomId("texto_anuncio")
      .setLabel("Digite o conteúdo")
      .setStyle(Discord.TextInputStyle.Paragraph)
      .setMaxLength(4000)
      .setRequired(true);

    const row = new Discord.ActionRowBuilder().addComponents(textoInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

    // Salva os dados temporários
    client.anuncioTemp = client.anuncioTemp || new Map();
    client.anuncioTemp.set(interaction.user.id, { canal, color, foto, marcarEveryone });
  }

  // Captura do Modal
  if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_anuncio_")) {
    const temp = client.anuncioTemp.get(interaction.user.id) || {};
    const { canal, color, foto, marcarEveryone } = temp;
    const textoAnuncio = interaction.fields.getTextInputValue("texto_anuncio");

    if (!canal) {
      return interaction.editReply({ content: "Erro ao recuperar o canal selecionado.", ephemeral: true });
    }

    const embed = new Discord.EmbedBuilder()
      .setDescription(textoAnuncio)
      .setColor(color)
      .setFooter({
        text: "Atenciosamente Trinda Boost",
        iconURL: interaction.guild.iconURL(),
      });

    if (foto) embed.setImage(foto.url);
    embed.setThumbnail(interaction.guild.iconURL());

    await canal.send({
      embeds: [embed],
      content: marcarEveryone ? "@everyone" : null,
    });

    await interaction.editReply({ content: "Anúncio enviado com sucesso!", ephemeral: true });

    client.anuncioTemp.delete(interaction.user.id); // limpa dados salvos
  }
});
