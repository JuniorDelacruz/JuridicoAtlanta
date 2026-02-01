// const {
//     PermissionFlagsBits,
//     ChannelType,
//     EmbedBuilder,
//     ActionRowBuilder,
//     ButtonBuilder,
//     ButtonStyle
// } = require('discord.js');

// const client = require('../../index');

// // ================= CONFIG =================
// const TICKET_CATEGORIES = [
//     '1426360637511958619', // SUPORTE
//     '1406445455960834150', // PARCERIA
//     '1426360700657209395', // PAGO
//     '1426360343994695720', // ABERTO
//     '1438302621101326449', // WINDOWS
// ];
// // =========================================

// client.on('messageCreate', async (message) => {
//     try {
//         if (message.author.bot) return;
//         if (!message.guild) return;
//         if (message.channel.type !== ChannelType.GuildText) return;

//         const channel = message.channel;

//         // Apenas canais de ticket
//         if (!TICKET_CATEGORIES.includes(channel.parentId)) return;

//         // Topic obrigatório
//         if (!channel.topic?.includes('TICKET:USER:')) return;

//         // Já notificado?
//         if (channel.topic.includes('STAFF_REPLIED')) return;

//         const openerId = channel.topic.split('TICKET:USER:')[1]?.split('|')[0]?.trim();
//         if (!openerId) return;

//         // Se o dono respondeu, ignora
//         if (message.author.id === openerId) return;

//         const member = await message.guild.members.fetch(message.author.id);

//         // Verifica se é staff
//         const isStaff =
//             member.permissions.has(PermissionFlagsBits.ManageChannels) ||
//             member.permissions.has(PermissionFlagsBits.Administrator);

//         if (!isStaff) return;

//         // ================= DM =================
//         const user = await client.users.fetch(openerId).catch(() => null);
//         const memberAutor = await message.guild.members.fetch(openerId).catch(() => null);
//         if (!user) return;

//         const jumpURL = `https://discord.com/channels/${message.guild.id}/${channel.id}`;

//         const embed = new EmbedBuilder()
//             .setColor(0x5865F2)
//             .setDescription(
//                 `## <:hellothemarques:1449856926681923706> | TICKET RESPONDIDO\n\n` +
//                 `Olá ${memberAutor},\n`+
//                 `Seu ticket foi respondido no servidor Trinda Boost por ${message.author}.\n\n`
//             )
//             .setFooter({ text: `© Trinda Boost agradece sua colaboração` })
//             .setTimestamp();

//         const row = new ActionRowBuilder().addComponents(
//             new ButtonBuilder()
//                 .setLabel('Ir para o ticket')
//                 .setStyle(ButtonStyle.Link)
//                 .setURL(jumpURL)
//         );

//         await user.send({
//             embeds: [embed],
//             components: [row]
//         }).catch(() => { });

//         // 🔒 Marca como notificado (persistente)
//         const newTopic = `${channel.topic} | STAFF_REPLIED`.slice(0, 1024);
//         await channel.setTopic(newTopic).catch(() => { });

//     } catch (err) {
//         console.error('Erro ao notificar primeira resposta do staff:', err);
//     }
// });
