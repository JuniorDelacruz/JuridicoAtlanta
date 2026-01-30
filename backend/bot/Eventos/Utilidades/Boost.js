// events/boostLog.js
require('../../index');
const { EmbedBuilder, Colors } = require('discord.js');
const client = require('../../index');

// IDs fixos
const BOOSTER_ROLE_ID = '1343671482055921806'; // ex: 123456789012345678
const LOG_CHANNEL_ID   = '1434673888767246526'; // ex: 234567890123456789

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // Segurança: se não for a mesma guild ou sem canal configurado, sai
    if (!newMember?.guild || !LOG_CHANNEL_ID) return;

    // Buscar canal de log
    const logChannel =
      newMember.guild.channels.cache.get(LOG_CHANNEL_ID) ||
      await newMember.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel) return;

    // Detecta mudança pelo CARGO (mais estável)
    const tinhaCargo = oldMember.roles.cache.has(BOOSTER_ROLE_ID);
    const temCargo   = newMember.roles.cache.has(BOOSTER_ROLE_ID);

    // Fallback adicional: premiumSince (se o cargo atrasar)
    const tinhaPremium = Boolean(oldMember.premiumSince);
    const temPremium   = Boolean(newMember.premiumSince);

    const ganhouBoost = (!tinhaCargo && temCargo) || (!tinhaPremium && temPremium);
    const perdeuBoost = (tinhaCargo && !temCargo) || (tinhaPremium && !temPremium);

    if (!ganhouBoost && !perdeuBoost) return;

    // Monta embed
    if (ganhouBoost) {
        const msg = `${newMember} impulsionou o servidor, agradecemos seu boost, aproveite seus benefícios.`
      await logChannel.send(msg);
    }

    if (perdeuBoost) {
    //   const embed = new EmbedBuilder()
    //     .setColor(Colors.Blurple)
    //     .setTitle('🪙 Boost removido')
    //     .setDescription(`${newMember} não está mais impulsionando o servidor.`)
    //     .addFields(
    //       { name: 'Boosts atuais', value: String(newMember.guild.premiumSubscriptionCount ?? '—'), inline: true },
    //     )
    //     .setThumbnail(newMember.user.displayAvatarURL({ size: 256 }))
    //     .setFooter({ text: `ID: ${newMember.id}` })
    //     .setTimestamp();

    //   await logChannel.send({ embeds: [embed] });
    return
    }
  } catch (e) {
    console.error('Erro ao logar boost:', e);
  }
});
