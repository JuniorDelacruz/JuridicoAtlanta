const Discord = require("discord.js")
const client = require("../../index")

module.exports = {
  name: "ticket", // Coloque o nome do comando
  description: "abra o painel de ticket", // Coloque a descrição do comando
  type: Discord.ApplicationCommandType.ChatInput,
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
      interaction.reply({ content: `❌ Você não possui permissão para utilzar este comando!`, ephemeral: true })
    }

    const IS_V2 = 1 << 15; // MessageFlags.IS_COMPONENTS_V2

    function toEmoji(emojiLike) {
      if (!emojiLike) return undefined;
      // unicode puro? (tem código que não bate no padrão <:...:...>)
      if (!/^<a?:\w+:\d+>$/.test(emojiLike)) {
        // trate como unicode
        return { name: emojiLike };
      }
      const animated = emojiLike.startsWith("<a:");
      const parts = emojiLike.slice(1, -1).split(":"); // ["a"|"", nome, id]
      const name = parts[1];
      const id = parts[2];
      return { id, name, animated };
    }


    // ===== Helpers V2 (raw) =====
    const row = (...components) => ({ type: 1, components });
    const btn = (id, label, style, disabled = false) => ({ type: 2, custom_id: id, label, style, disabled });
    const text = (content) => ({ type: 10, content });

    const mediaGallery = (url) => ({ type: 12, items: [{ media: { url } }] });
    const divider = { type: 14, divider: true, spacing: 2 };
    const opt = (label, vl, desc, id, emj = null) => { const base = { label, value: vl, description: desc }; if (emj) base.emoji = { id: id, name: emj }; return base };
    const slc = (id, phr, str) => ({ type: 3, custom_id: id, placeholder: phr, options: str });
    const container = (children, accent = ACCENT_COLOR) => ({ type: 17, accent_color: accent, components: children });


    async function sendV2(client, channelId, components, allowed = { parse: [] }) {
      return client.rest.post(Discord.Routes.channelMessages(channelId), {
        body: { flags: IS_V2, components, allowed_mentions: allowed }
      })
    }
    async function editV2(client, channelId, messageId, components, allowed = { parse: [] }) {
      return client.rest.patch(Discord.Routes.channelMessage(channelId, messageId), {
        body: { flags: IS_V2, components, allowed_mentions: allowed }
      });
    }

    const guildIconURL = interaction.guild.iconURL();

    const children = [
      text("# Atendimento"),
      text("Para abrir um ticket clique no menu abaixo e selecione a categoria que melhor lhe atenda."),
      text("### Leia antes de Abrir"),
      text(`
> - Quando abrir um ticket, por favor, tenha em mente tudo o que precisa ser informado. Isso permitirá que o processo de resolução do problema seja mais eficiente.
> - Não abra um ticket sem **NECESSIDADE**.
> - Não marque excessivamente a equipe.
`),
      text("### Obs:"),
      text("Nosso prazo de resposta é de até 24 horas, podendo em casos específicos variar conforme diversos fatores."),
      divider,
      row(
        slc("painel_ticket", "Clique Aqui!", [
          opt("Geral", "abertura", "Faça sua otimização e tire dúvidas", "1438310986615623772", "botaodeinformacao"),
          opt("Suporte", "suporte", "Atendimento para clientes", "1438307795626889226", "emoji_green_24a803_128"),
          opt("Parcerias", "parceiro", "Seja um parceiro", "1438311000385392650", "handshakedeparceria"),
          opt("Windows", "windows", "Dúvidas e suporte a Windows Booster", "1438311245571952670" , "janelas"),
          opt("Restar Escolha", "resetescolha", "Clique para resetar a sua escolha atual caso queira selecionar novamente", "1438311052113870879", "reiniciar")
        ]),
      )
    ]


    const card = [container(children, 0x58eb34)];
    await sendV2(interaction.client, interaction.channelId, card, { parse: [] });
    await interaction.editReply({ content: `✅ Mensagem enviada!`, ephemeral: true })
    return;
  }
}

