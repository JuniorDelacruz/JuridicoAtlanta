const Discord = require("discord.js")
const pokeCooldown = new Map();  
const POKE_COOLDOWN_MS = 60_000; 

module.exports = {
    name: "poke", // Coloque o nome do comando
    description: "Envia uma mensagem no privado da pessoa", // Coloque a descrição do comando
    type: Discord.ApplicationCommandType.ChatInput,

    run: async (client, interaction) => {
        await interaction.deferReply({ flags: 64 }).catch(() => { });

        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) {
            interaction.editReply({ content: `Você não possui permissão para utilizar este comando.`, ephemeral: true })
        }

        try {
            // --- cooldown anti-spam por canal ---
            const now = Date.now();
            const last = pokeCooldown.get(interaction.channelId) || 0;
            const left = last + POKE_COOLDOWN_MS - now;
            if (left > 0) {
                return interaction.editReply({
                    content: `⏳ Calma! Você poderá notificar novamente em **${Math.ceil(left / 1000)}s**.`
                });
            }

            // --- busca ticket e membro autor ---
            const ticket = await client.db?.TicketDetroitPoliceCity?.findOne({
                where: { channelId: interaction.channel.id }
            });

            if (!ticket) {
                return interaction.editReply({ content: '❌ Ticket não encontrado no banco.' });
            }

            const member =
                interaction.guild.members.cache.get(ticket.creatorId) ||
                (await interaction.guild.members.fetch(ticket.creatorId).catch(() => null));

            if (!member) {
                return interaction.editReply({ content: '❌ Não encontrei o autor do ticket no servidor.' });
            }
            if (member.user?.bot) {
                return interaction.editReply({ content: '🤖 O autor do ticket é um bot; não vou enviar DM.' });
            }

            // --- mensagem (DM) ---
            const jumpURL = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`;
            const embed = new Discord.EmbedBuilder()
                .setColor(0x3b82f6)
                .setDescription(
                        `## <:hellothemarques:1449856926681923706> | TICKET RESPONDIDO`+
                        `Olá, <@${member.id}>!\n`+
                        `Seu ticket foi respondido no servidor Trinda Boost por ${interaction.channel}.\n\n`
                )
                .setFooter({ text: `Ticket ID: ${ticket.seqGlobal ?? '—'}` })
                .setTimestamp();

            const btn = new Discord.ButtonBuilder()
                .setStyle(Discord.ButtonStyle.Link)
                .setURL(jumpURL)
                .setLabel('Abrir o Ticket');

            // Tenta DM
            let sent = false;
            try {
                await member.send({
                    embeds: [embed],
                    components: [new Discord.ActionRowBuilder().addComponents(btn)]
                });
                sent = true;
            } catch (_) {
                sent = false;
            }

            // Se falhou DM, opcional: deixa um aviso no canal (sem pingar o usuário)
            // Descomente se quiser avisar no canal também:
            if (!sent) {
              await interaction.channel.send({
                content: '📌 O autor do ticket está com DM fechada; não foi possível notificar por mensagem privada.'
              }).catch(() => {});
            }

            // Marca cooldown apenas se tentou notificar
            pokeCooldown.set(interaction.channelId, now);

            return interaction.editReply({
                content: sent
                    ? '✅ Usuário notificado por DM.'
                    : '⚠️ Não consegui enviar DM (provavelmente está bloqueada).'
            });
        } catch (err) {
            console.error('[ticket:poke]', err);
            return interaction.editReply({
                content:
                    '❌ Ocorreu um erro ao notificar o usuário. (DM bloqueada, sem permissão ou outro problema)'
            });
        }
    }
};

