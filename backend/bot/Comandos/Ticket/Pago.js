const Discord = require("discord.js");

function userBaseName(member) {
  const raw = (member?.nickname || member?.user?.username || "user").toLowerCase();
  return raw.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 22) || "user";
}

const CONFIG = {
  CATEGORY: {
    SUPORTE: "1426360637511958619",
    PARCERIA: "1406445455960834150",
    PAGO: "1426360700657209395",
    ABERTO: "1426360343994695720",
    WINDOWS: "1438302621101326449",
  },
  EMOJI: {
    SUPORTE: "🔴",
    PARCERIA: "🤝",
    PAGO: "🟢",
    ABERTO: "🔵",
    WINDOWS: "⚪",
  },
  LOG_CHANNEL_ID: "1434650821743870154",
  ADMIN_ROLE_IDS: ["1343289102145028098", "1343288560425369720"],
  NOTIFY_ROLE_IDS: ["1343289102145028098", "1343288560425369720"],
  MAX_AFFILIATES: 10,
  // cargo que você quer dar quando virar PAGO:
  ROLE_PAGO_ID: "1343285235558780982",
};

module.exports = {
  name: "pago",
  description: "Move o ticket pra categoria Pago",
  type: Discord.ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {
    try {

      if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
        return interaction.editReply({ content: "Você não possui permissão para utilizar este comando." });
      }

      const channel = interaction.channel; // <-- declare antes de usar
      // busca o ticket pelo channelId atual
      const ticket = await client.db.TicketDetroitPoliceCity.findOne({ where: { channelId: channel.id } });
      if (!ticket) {
        return interaction.editReply({ content: "Ticket não encontrado para este canal." });
      }

      // base/seq
      const creatorMember = await interaction.guild.members
        .fetch(ticket.creatorId)
        .catch(() => null);

      const base = ticket.baseName || userBaseName(creatorMember);
      // se não tiver seqGlobal, usa o id do registro como fallback
      const seq = ticket.seqGlobal ?? ticket.id ?? "0";

      const emoji = CONFIG.EMOJI.PAGO;
      const cat = "PAGO";
      const catId = CONFIG.CATEGORY.PAGO;
      const desiredName = `${emoji}-${base}-${seq}`;

      // mover + renomear o canal
      // Em discord.js v14, para canais de texto: guild.channels.edit(channelId, { parent: catId, name: desiredName, lockPermissions: true })
      await interaction.guild.channels.edit(channel.id, {
        parent: catId,
        name: desiredName,
        lockPermissions: false
      });

      // atualizar categoria no banco
      await ticket.update({ categoria: CONFIG.CATEGORY.PAGO });

      // log no canal de logs (se existir e tiver permissão)
      if (CONFIG.LOG_CHANNEL_ID) {
        const log =
          interaction.guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID) ||
          (await interaction.guild.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null));

        if (!log) {
          console.warn("[tickets] log channel não encontrado:", CONFIG.LOG_CHANNEL_ID);
        } else {
          const me = interaction.guild.members.me;
          const canSend = log.permissionsFor(me)?.has(Discord.PermissionFlagsBits.SendMessages);
          if (canSend) {
            await log
              .send(`🟢 **Ticket #${seq}** (<#${channel.id}>) movido para **PAGO** por <@${interaction.user.id}>.`)
              .catch(() => {});
          }
        }
      }

      // dá o cargo para o criador (se existir e se o bot puder)
      if (creatorMember && CONFIG.ROLE_PAGO_ID) {
        const me = interaction.guild.members.me;
        const canManageRoles = me.permissions.has(Discord.PermissionFlagsBits.ManageRoles);
        if (canManageRoles) {
          await creatorMember.roles.add(CONFIG.ROLE_PAGO_ID).catch(() => {});
        }
      }

      // mensagem no canal do ticket
      await channel
        .send({ content: `Obrigado pela compra <@${ticket.creatorId}>, seu ticket foi movido para PAGO.` })
        .catch(() => {});

        const buttonQuests = new Discord.ActionRowBuilder().addComponents(new Discord.ButtonBuilder({
          custom_id: "ticket:quests",
          label: "Iniciar Perguntas",
          style: Discord.ButtonStyle.Success
        }))
      await channel
        .send({ content: `Por favor clique no botão abaixo e responda as perguntas para seguirmos com o atendimento.`, components: [buttonQuests] })
        .catch(() => {});

      return interaction.editReply({
        content: `✅ Categoria: **${cat}** e nome definido para \`${desiredName}\`.`,
      });
    } catch (err) {
      console.error("[pago] erro:", err);
      return interaction.editReply({ content: `❌ Erro inesperado: ${String(err.message || err)}` });
    }
  },
};
