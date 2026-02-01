// // events/interactionCreate.tickets.js
// require('../../index');
// const {
//     ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
//     ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits,
//     ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, LabelBuilder, ComponentType
// } = require('discord.js');
// const client = require('../../index')

// // ===================== CONFIG =====================
// const CONFIG = {
//     CATEGORY: {
//         SUPORTE: '1426360637511958619',
//         PARCERIA: '1406445455960834150',
//         PAGO: '1426360700657209395',
//         ABERTO: '1426360343994695720',
//         WINDOWS: "1438302621101326449",
//     },
//     EMOJI: {
//         SUPORTE: '🔴',
//         PARCERIA: '🤝',
//         PAGO: '🟢',
//         ABERTO: '🔵',
//         WINDOWS: '⚪',
//     },
//     LOG_CHANNEL_ID: '1434650821743870154',
//     ADMIN_ROLE_IDS: ['1343289102145028098', "1343288560425369720"],
//     NOTIFY_ROLE_IDS: ['1343289102145028098', "1343288560425369720"],
//     MAX_AFFILIATES: 10,
// };

// const pokeCooldown = new Map();               // channelId -> timestamp (ms)
// const POKE_COOLDOWN_MS = 60_000;              // 60s (ajuste se quiser)

// // (opcional) limpeza de chaves antigas a cada 10min
// setInterval(() => {
//     const now = Date.now();
//     for (const [ch, ts] of pokeCooldown.entries()) {
//         if (now - ts > 10 * 60_000) pokeCooldown.delete(ch);
//     }
// }, 10 * 60_000);
// // ===================================================

// function isTicketCategoryId(id) {
//     return Object.values(CONFIG.CATEGORY).includes(String(id));
// }

// /** Procura um canal de ticket ativo do user (sem usar DB) */
// function findUserOpenTicketChannel(guild, userId) {

//     const chansByTopic = guild.channels.cache.find(ch =>
//         ch?.type === ChannelType.GuildText &&
//         isTicketCategoryId(ch.parentId) &&
//         typeof ch.topic === 'string' &&
//         ch.topic.includes(`TICKET:USER:${userId}`)
//     );
//     if (chansByTopic) return chansByTopic;


//     return guild.channels.cache.find(ch => {
//         if (ch?.type !== ChannelType.GuildText) return false;
//         if (!isTicketCategoryId(ch.parentId)) return false;
//         const ow = ch.permissionOverwrites?.cache?.get(userId);
//         const sees = ch.permissionsFor(userId)?.has(PermissionFlagsBits.ViewChannel);
//         const serverDenied = ch.permissionOverwrites?.cache?.get(guild.id)?.deny?.has(PermissionFlagsBits.ViewChannel);
//         return sees && serverDenied && ow;
//     }) || null;
// }


// const movingLocks = new Map(); // channelId -> Promise em andamento
// const lastRenameAt = new Map(); // channelId -> timestamp ms
// const RENAME_COOLDOWN_MS = 1 * 60 * 1000; // 10 min (Discord impõe limites fortes)

// function withLock(key, fn) {
//     const prev = movingLocks.get(key) || Promise.resolve();
//     const next = prev.then(fn).finally(() => {
//         if (movingLocks.get(key) === next) movingLocks.delete(key);
//     });
//     movingLocks.set(key, next);
//     return next;
// }

// async function safeDefer(interaction) {
//     try {
//         if (!interaction.deferred && !interaction.replied) {
//             await interaction.deferReply({ flags: 64 });
//         }
//     } catch (_) {
//     }
// }

// async function editOrFollowUp(interaction, payload) {
//     try {
//         if (interaction.deferred && !interaction.replied) {
//             return await interaction.editReply(payload);
//         }
//         if (!interaction.deferred && !interaction.replied) {
//             return await interaction.reply({ ...payload, flags: 64 });
//         }
//     } catch (_) { }
//     return interaction.followUp({ ...payload, flags: 64 }).catch(() => { });
// }

// async function patchWithRetry(channel, body) {
//     try {
//         return await channel.edit(body);
//     } catch (e) {
//         const ra = e?.rawError?.retry_after;
//         if (e?.status === 429 && typeof ra === 'number') {
//             await new Promise(r => setTimeout(r, Math.ceil(ra * 1000)));
//             return channel.edit(body);
//         }
//         throw e;
//     }
// }




// /**
//  * utils
//  */
// function userBaseName(member) {
//     const raw = (member?.nickname || member?.user?.username || 'user').toLowerCase();
//     return raw.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').slice(0, 22) || 'user';
// }

// async function nextSeq() {

//     const total = await client.db.TicketDetroitPoliceCity.count();
//     return total + 1;
// }

// function canUseAdmin(member) {
//     return member.permissions.has(PermissionFlagsBits.ManageChannels) ||
//         CONFIG.ADMIN_ROLE_IDS.some(id => member.roles.cache.has(id));
// }

// const MAX_RENAME_TRIES = 8;
// const RETRY_BASE_MS = 900;

// async function forceMoveAndRenameNow(channel, toCategoryId, desiredName, guild) {

//     const cat = guild.channels.cache.get(toCategoryId) || await guild.channels.fetch(toCategoryId).catch(() => null);
//     if (!cat || cat.type !== ChannelType.GuildCategory) {
//         return { ok: false, moved: false, renamed: false, reason: `Categoria alvo inválida: ${toCategoryId}` };
//     }


//     const me = guild.members.me;
//     const need = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewChannel];
//     for (const p of need) {
//         if (!cat.permissionsFor(me)?.has(p)) return { ok: false, moved: false, renamed: false, reason: `Bot sem permissão na categoria (${cat.name})` };
//         if (!channel.permissionsFor(me)?.has(p)) return { ok: false, moved: false, renamed: false, reason: `Bot sem permissão no canal (${channel.name})` };
//     }

//     desiredName = String(desiredName).slice(0, 95);

//     let moved = false, renamed = false, lastErr = null;

//     // 1)  (parent + name). Confiar no retorno
//     try {
//         const res = await channel.edit({ parent: cat.id, lockPermissions: false, name: desiredName });
//         moved = (res.parentId === cat.id);
//         renamed = (res.name === desiredName);
//         if (moved && renamed) return { ok: true, moved, renamed };
//     } catch (e) {
//         lastErr = e;
//     }

//     // 2) Se caiu aqui, tenta mover primeiro sozinho
//     if (!moved) {
//         try {
//             const resMove = await channel.edit({ parent: cat.id, lockPermissions: false });
//             moved = (resMove.parentId === cat.id);
//         } catch (e) {
//             lastErr = e;
//         }
//     }

//     // 3) Tentar renomear com retry síncrono (respeita 429)
//     if (!renamed) {
//         let attempt = 0;
//         while (attempt < MAX_RENAME_TRIES) {
//             attempt++;
//             try {
//                 const resName = await channel.setName(desiredName);
//                 renamed = (resName.name === desiredName); // usa o retorno atualizado
//                 if (renamed) break;
//             } catch (err) {
//                 lastErr = err;
//                 const ra = err?.rawError?.retry_after;
//                 if (err?.status === 429 && typeof ra === 'number') {
//                     await new Promise(r => setTimeout(r, Math.ceil(ra * 1000)));
//                 } else {
//                     await new Promise(r => setTimeout(r, RETRY_BASE_MS * attempt));
//                 }
//             }
//             // como fallback leve, uma leitura só da API
//             if (!renamed) {
//                 const fresh = await channel.fetch().catch(() => null);
//                 if (fresh?.name === desiredName) { renamed = true; break; }
//             }
//         }
//     }

//     // 4) Resultado final sem throw (evita erro falso-positivo)
//     return {
//         ok: moved && renamed,
//         moved, renamed,
//         current: { name: channel.name, parentId: channel.parentId },
//         desired: { name: desiredName, parentId: cat.id },
//         reason: lastErr ? (lastErr.message || String(lastErr)) : undefined
//     };
// }






// // --- NOVO HELPER: DM para todos que têm os cargos de notificação ---
// async function dmNotifyRoles(guild, roleIds, ticketChannel, openerId, categoria, seq) {
//     const jumpURL = `https://discord.com/channels/${guild.id}/${ticketChannel.id}`;

//     const embed = new EmbedBuilder()
//         .setColor(0x5865F2) // Blurple
//         .setTitle('📣 Novo Ticket Aberto')
//         .setDescription([
//             `**Categoria:** ${categoria}`,
//             `**ID do Ticket:** #${seq}`,
//             `**Aberto por:** <@${openerId}>`,
//             `**Canal:** ${ticketChannel}`
//         ].join('\n'))
//         .setTimestamp();

//     const row = new ActionRowBuilder().addComponents(
//         new ButtonBuilder()
//             .setLabel('Ir para o Ticket')
//             .setStyle(ButtonStyle.Link)
//             .setURL(jumpURL)
//     );

//     // Coleta e deduplica usuários de todos os cargos
//     const userIds = new Set();
//     for (const rid of roleIds) {
//         const role = guild.roles.cache.get(rid) || await guild.roles.fetch(rid).catch(() => null);
//         if (!role) continue;

//         role.members.forEach(m => userIds.add(m.id));
//     }


//     for (const uid of userIds) {

//         // if (uid === openerId) continue;
//         try {
//             const member = await guild.members.fetch(uid).catch(() => null);
//             if (!member) continue;
//             await member.send({ embeds: [embed], components: [row] });
//         } catch (e) {
//             // DM bloqueada ou não pode enviar — apenas ignore
//         }
//     }
// }


// client.on('interactionCreate', async (interaction) => {
//     try {
//         // ========== SELECT: abrir ticket ==========

//         if (interaction.isStringSelectMenu() && interaction.customId === 'painel_ticket') {
//             await interaction.deferReply({ flags: 64 })
//             const [value] = interaction.values; // 'suporte' | 'parceiro' | 'aberto'
//             if (!['suporte', 'parceiro', 'abertura', 'windows'].includes(value)) {
//                 return interaction.editReply({ flags: 64, content: 'Opção inválida.' });
//             }

//             console.log(value)
//             if (value === "suporte") {
//                 const roleId = "1343285235558780982";

//                 const role = interaction.guild.roles.cache.get(roleId)
//                     ?? await interaction.guild.roles.fetch(roleId).catch(() => null);
//                 if (!role) return interaction.editReply({ content: "Cargo de clientes não encontrado." });

//                 const userId = interaction.user.id;
//                 const isClient = role.members.has(userId); // 'members' é uma Collection<userId, GuildMember>
//                 if (!isClient) {
//                     return interaction.editReply({
//                         content: "Atendimento de suporte apenas para clientes. Selecione outra opção."
//                     });
//                 }
//             }


//             // Mapa de categorias
//             const CAT = {
//                 suporte: { catId: CONFIG.CATEGORY.SUPORTE, emoji: CONFIG.EMOJI.SUPORTE, label: 'SUPORTE', color: 0xff4444 },
//                 parceiro: { catId: CONFIG.CATEGORY.PARCERIA, emoji: CONFIG.EMOJI.PARCERIA, label: 'PARCERIA', color: 0x00aa66 },
//                 abertura: { catId: CONFIG.CATEGORY.ABERTO, emoji: CONFIG.EMOJI.ABERTO, label: 'ABERTO', color: 0x3b82f6 },
//                 windows: { catId: CONFIG.CATEGORY.WINDOWS, emoji: CONFIG.EMOJI.WINDOWS, label: 'WINDOWS', color: 0xffffff }
//             }[value];

//             const member = interaction.member;
//             const base = userBaseName(member);
//             const seq = await nextSeq();

//             const channelName = `${CAT.emoji}-${base}-${seq}`;
//             const guild = interaction.guild;

//             const userLockKey = `user-ticket-${interaction.user.id}`;
//             await withLock(userLockKey, async () => {
//                 const existing = findUserOpenTicketChannel(interaction.guild, interaction.user.id);
//                 if (existing) {
//                     return interaction.editReply({
//                         flags: 64,
//                         content: `⚠️ Você já possui um ticket aberto: ${existing}.`
//                     });
//                 }


//                 const channel = await guild.channels.create({
//                     name: channelName,
//                     type: ChannelType.GuildText,
//                     parent: CAT.catId,
//                     topic: `TICKET:USER:${member.id} | CATEGORIA:${CAT.label} | SEQ:${seq}`,
//                     permissionOverwrites: [
//                         { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
//                         {
//                             id: member.id, allow: [PermissionFlagsBits.ViewChannel,
//                             PermissionFlagsBits.SendMessages,
//                             PermissionFlagsBits.AttachFiles,
//                             PermissionFlagsBits.EmbedLinks,
//                             PermissionFlagsBits.AddReactions,
//                             PermissionFlagsBits.ReadMessageHistory]
//                         },

//                         ...CONFIG.ADMIN_ROLE_IDS.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }))
//                     ],
//                 });


//                 const ticket = await client.db.TicketDetroitPoliceCity.create({
//                     channelId: channel.id,
//                     creatorId: member.id,
//                     creationDate: new Date().toISOString(),
//                     categoria: CAT.label,
//                     abandono: 'NAO',
//                     seqGlobal: seq,
//                     baseName: base,
//                     parentTicketId: null,
//                 });



//                 const openEmbed = new EmbedBuilder()
//                     .setColor(CAT.color)
//                     .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
//                     .setDescription(`
// # Sistema de Ticket Trinda Boost Service
// ## Informações Úteis:
// > Aberto por: <@${member.id}>
// > Categoria: **${ticket.categoria}**
// > Ticket ID: **#${seq}**
// ## Obs:
// A equipe está ciente de seu ticket aguarde que logo responderemos.`)
//                     .setTimestamp(new Date());

//                 const btnLeave = new ButtonBuilder().setCustomId('ticket:leave').setEmoji('🚪').setLabel('Sair/Abandonar').setStyle(ButtonStyle.Danger);
//                 const btnAdmin = new ButtonBuilder().setCustomId('ticket:admin').setEmoji('🛠️').setLabel('Painel ADM').setStyle(ButtonStyle.Success);

//                 await channel.send({

//                     embeds: [openEmbed],
//                     components: [new ActionRowBuilder().addComponents(btnLeave, btnAdmin)],
//                     allowedMentions: { parse: [] },
//                 });
//                 await channel.send({
//                     content: `
// _Ao seguir com o atendimento, você concorda com os Termos:_ [Clique Aqui](https://discord.com/channels/1343285235558780980/1436004759982309558/1436006112519520347) . 
//                 `})
//                 await dmNotifyRoles(guild, CONFIG.NOTIFY_ROLE_IDS, channel, member.id, ticket.categoria, seq);
//                 await interaction.editReply({ flags: 64, content: `✅ Ticket criado: ${channel}` });
//                 return;
//             });
//             return
//         }

//         // ========== BOTÃO: abandonar ==========
//         if (interaction.isButton() && interaction.customId === 'ticket:leave') {
//             const channel = interaction.channel;
//             const ticket = await client.db.TicketDetroitPoliceCity.findOne({ where: { channelId: channel.id } });
//             if (!ticket) return interaction.reply({ flags: 64, content: 'Ticket não encontrado.' });

//             if (interaction.user.id !== ticket.creatorId) {
//                 return interaction.reply({ flags: 64, content: 'Somente o criador pode abandonar este ticket.' });
//             }

//             // remove a permissão do criador
//             await channel.permissionOverwrites.edit(ticket.creatorId, { ViewChannel: false, SendMessages: false }).catch(() => { });
//             await ticket.update({ abandono: 'SIM' });

//             const btnFechar = new ButtonBuilder().setCustomId('fechar_ticket').setStyle(ButtonStyle.Danger).setLabel('Finalizar Ticket').setEmoji('🗑️');

//             await channel.send({
//                 content: `⚠️ <@${ticket.creatorId}> **abandonou** o ticket.`,
//                 components: [new ActionRowBuilder().addComponents(btnFechar)]
//             });

//             return interaction.reply({ flags: 64, content: 'Você abandonou o ticket. O canal foi ocultado para você.' });
//         }

//         // ========== BOTÃO: Painel ADM ==========
//         if (interaction.isButton() && interaction.customId === 'ticket:admin') {
//             if (!canUseAdmin(interaction.member)) {
//                 return interaction.reply({ flags: 64, content: 'Você não tem permissão para abrir o Painel ADM.' });
//             }

//             const btnFechar = new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🗑️').setStyle(ButtonStyle.Danger);
//             const btnTrocar = new ButtonBuilder().setCustomId('ticket:move').setLabel('TrocarCategoria').setEmoji('🔁').setStyle(ButtonStyle.Secondary);
//             const btnAfiliados = new ButtonBuilder().setCustomId('ticket:affiliates').setLabel('CriarAfiliados').setEmoji('🧩').setStyle(ButtonStyle.Primary);
//             const btnpoke = new ButtonBuilder().setCustomId('ticket:poke').setLabel('Poke').setStyle(ButtonStyle.Success);

//             return interaction.reply({
//                 flags: 64,
//                 content: 'Painel ADM',
//                 components: [new ActionRowBuilder().addComponents(btnFechar, btnTrocar, btnAfiliados, btnpoke)]
//             });
//         }

//         // ========== BOTÃO: TrocarCategoria → mostra select ==========
//         if (interaction.isButton() && interaction.customId === 'ticket:move') {
//             if (!canUseAdmin(interaction.member)) {
//                 return interaction.reply({ flags: 64, content: 'Sem permissão.' });
//             }

//             const select = new StringSelectMenuBuilder()
//                 .setCustomId('ticket:move:select')
//                 .setPlaceholder('Selecione a categoria')
//                 .addOptions(
//                     new StringSelectMenuOptionBuilder().setLabel('Parceria').setValue('PARCERIA').setEmoji('🤝'),
//                     new StringSelectMenuOptionBuilder().setLabel('Pago').setValue('PAGO').setEmoji('🟢'),
//                     new StringSelectMenuOptionBuilder().setLabel('Suporte').setValue('SUPORTE').setEmoji('🔴'),
//                     new StringSelectMenuOptionBuilder().setLabel('Windows').setValue('WINDOWS').setEmoji('⚪'),
//                     new StringSelectMenuOptionBuilder().setLabel('Aberto').setValue('ABERTO').setEmoji('🔵'), // NOVO
//                 );

//             return interaction.reply({
//                 flags: 64,
//                 components: [new ActionRowBuilder().addComponents(select)]
//             });
//         }



//         // ========== SELECT: mover categoria ==========
//         if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:move:select') {
//             // deferral seguro
//             try { if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: 64 }); } catch { }

//             if (!canUseAdmin(interaction.member)) {
//                 return interaction.editReply({ content: 'Sem permissão.' }).catch(() => { });
//             }

//             const [cat] = interaction.values;
//             const channel = interaction.channel;
//             const ticket = await client.db.TicketDetroitPoliceCity.findOne({ where: { channelId: channel.id } });
//             if (!ticket) return interaction.editReply({ content: 'Ticket não encontrado.' }).catch(() => { });

//             const base = ticket.baseName || userBaseName(await interaction.guild.members.fetch(ticket.creatorId).catch(() => null));
//             const seq = ticket.seqGlobal || await nextSeq();

//             const def = {
//                 PARCERIA: { catId: CONFIG.CATEGORY.PARCERIA, emoji: CONFIG.EMOJI.PARCERIA },
//                 PAGO: { catId: CONFIG.CATEGORY.PAGO, emoji: CONFIG.EMOJI.PAGO },
//                 SUPORTE: { catId: CONFIG.CATEGORY.SUPORTE, emoji: CONFIG.EMOJI.SUPORTE },
//                 ABERTO: { catId: CONFIG.CATEGORY.ABERTO, emoji: CONFIG.EMOJI.ABERTO },
//                 WINDOWS: { catId: CONFIG.CATEGORY.WINDOWS, emoji: CONFIG.EMOJI.WINDOWS, label: 'WINDOWS', color: 0xffffff }
//             }[cat];




//             if (!def?.catId) {
//                 return interaction.editReply({ content: 'Categoria inválida.' }).catch(() => { });
//             }

//             const desiredName = `${def.emoji}-${base}-${seq}`;

//             try {
//                 const report = await forceMoveAndRenameNow(channel, def.catId, desiredName, interaction.guild);
//                 await ticket.update({ categoria: cat });

//                 if (cat === 'PAGO' && CONFIG.LOG_CHANNEL_ID) {
//                     const log = interaction.guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID)
//                         || await interaction.guild.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);

//                     if (!log) {
//                         console.warn('[tickets] log channel não encontrado:', CONFIG.LOG_CHANNEL_ID);
//                     } else {
//                         // checa permissão do bot
//                         const me = interaction.guild.members.me;
//                         const canSend = log.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages);
//                         if (canSend) {
//                             await log.send(`🟢 **Ticket #${seq}** (<#${channel.id}>) movido para **PAGO** por <@${interaction.user.id}>.`).catch(() => { });
//                             const memberrole = interaction.guild.members.cache.get(ticket.creatorId)
//                             await memberrole.roles.add("1343285235558780982")
//                         } else {
//                             console.warn('[tickets] sem permissão para enviar no canal de logs');
//                         }
//                     }

//                     // mensagem no próprio canal do ticket
//                     await channel.send({
//                         content: `Obrigado pela compra <@${ticket.creatorId}>, seu ticket foi movido para PAGO.`
//                     }).catch(() => { });
//                     const buttonQuests = new Discord.ActionRowBuilder().addComponents(new Discord.ButtonBuilder({
//                         custom_id: "ticket:quests",
//                         label: "Iniciar Perguntas",
//                         style: Discord.ButtonStyle.Success
//                     }))
//                     await channel
//                         .send({ content: `Por favor clique no botão abaixo e responda as perguntas para seguirmos com o atendimento.`, components: [buttonQuests] })
//                         .catch(() => { });
//                 }


//                 if (report.ok) {
//                     return interaction.editReply({ content: `✅ Categoria: **${cat}** e nome definido para \`${desiredName}\`.` });
//                 }

//                 // parcial: moveu mas ainda não confirmou rename (evita “erro” mentiroso)
//                 if (report.moved && !report.renamed) {
//                     return interaction.editReply({
//                         content:
//                             `🟦 Categoria movida para **${cat}**, mas o Discord ainda não confirmou o rename.\n` +
//                             `• desejado: \`${report.desired.name}\`\n` +
//                             `• atual:    \`${report.current.name}\`\n` +
//                             `Vou tentar novamente automaticamente em breve.`
//                     });
//                 }

//                 // falha real
//                 return interaction.editReply({
//                     content:
//                         `❌ Falha ao mover/renomear.\n` +
//                         `• desejado: \`${report.desired.name}\` → parent \`${report.desired.parentId}\`\n` +
//                         `• atual:    \`${report.current?.name}\` → parent \`${report.current?.parentId}\`\n` +
//                         (report.reason ? `• motivo: ${report.reason}` : '')
//                 });
//             } catch (err) {
//                 console.error('[forceMoveAndRenameNow] erro inesperado:', err);
//                 return interaction.editReply({ content: `❌ Erro inesperado: ${String(err.message || err)}` });
//             }
//         }





//         // IDs centralizados para evitar typos
//         const IDS = {
//             button: "ticket:quests",
//             modal: "modal:quests",
//             fields: {
//                 q1: "quest:q1",
//                 q2: "quest:q2",
//                 q3: "quest:q3",
//             }
//         };

//         // Banco de perguntas (fácil de expandir)
//         const QUESTIONS = [
//             {
//                 id: IDS.fields.q1,
//                 label: "1",
//                 description: "Você tem conhecimento de como entrar em sua BIOS?",
//             },
//             {
//                 id: IDS.fields.q2,
//                 label: "2",
//                 description: "Você possui um WaterCooler?",
//             },
//             {
//                 id: IDS.fields.q3,
//                 label: "3",
//                 description: "Você usa OneDrive?",
//             }
//         ];

//         // Opções padrão (Sim/Não)
//         const YES_NO_OPTIONS = [
//             { label: "Sim", value: "sim" },
//             { label: "Não", value: "nao" },
//         ];

//         // Helper: formata resposta com emoji
//         function fmt(value) {
//             const v = String(value || "").toLowerCase();
//             if (v === "sim") return "✅ Sim";
//             if (v === "nao" || v === "não") return "❌ Não";
//             return `❓ ${value ?? "—"}`;
//         }
//         try {
//             // ========= BOTÃO =========
//             if (interaction.isButton() && interaction.customId === IDS.button) {
//                 const modal = new ModalBuilder({
//                     title: "Questionário",
//                     customId: IDS.modal
//                 });

//                 // monta os "labels" com select de cada pergunta
//                 for (const q of QUESTIONS) {
//                     modal.addLabelComponents(
//                         new LabelBuilder({
//                             label: q.label,
//                             description: q.description,
//                             component: {
//                                 type: ComponentType.StringSelect,
//                                 custom_id: q.id,
//                                 required: true,
//                                 options: YES_NO_OPTIONS
//                             }
//                         })
//                     );
//                 }

//                 await interaction.showModal(modal);
//                 return;
//             }

//             // ========= MODAL SUBMIT =========
//             if (interaction.isModalSubmit() && interaction.customId === IDS.modal) {
//                 // pega valores (suporta getStringSelectValues retornar array)
//                 const answers = {};
//                 for (const q of QUESTIONS) {
//                     const raw = interaction.fields.getStringSelectValues(q.id);
//                     const value = Array.isArray(raw) ? raw[0] : raw;
//                     answers[q.id] = value;
//                 }

//                 // atualiza a interação para evitar "interaction failed"
//                 await interaction.deferUpdate();

//                 // monta um embed bonitão
//                 const embed = {
//                     color: 0x23a803, // roxinho Discord
//                     author: {
//                         name: `${interaction.user.username} — Questionário`,
//                         icon_url: interaction.user.displayAvatarURL?.() ?? undefined
//                     },
//                     description: [
//                         `**Usuário:** <@${interaction.user.id}>`,
//                         `**Data:** <t:${Math.floor(Date.now() / 1000)}:F>`
//                     ].join("\n"),
//                     fields: QUESTIONS.map((q, idx) => ({
//                         name: `${idx + 1}. ${q.description}`,
//                         value: fmt(answers[q.id]),
//                         inline: false
//                     }))
//                 };

//                 // manda no canal do ticket
//                 if (!interaction.channel || !interaction.channel.send) {
//                     // fallback seguro
//                     await interaction.followUp({
//                         content: "⚠️ Não consegui enviar no canal. Verifique permissões.",
//                         ephemeral: true
//                     });
//                     return;
//                 }

//                 await interaction.channel.send({ embeds: [embed] });

//                 // feedback leve ao usuário (não obrigatório)
//                 try {
//                     await interaction.followUp({
//                         content: "✅ Suas respostas foram registradas no ticket.",
//                         ephemeral: true
//                     });
//                 } catch { /* já deu deferUpdate, alguns gateways não deixam followUp — ok ignorar */ }

//                 return;
//             }
//         } catch (err) {
//             console.error("[quests] erro:", err);
//             // feedback de erro sem vazar stack
//             if (interaction?.replied || interaction?.deferred) {
//                 try { await interaction.followUp({ content: "❌ Ocorreu um erro ao processar o questionário.", ephemeral: true }); } catch { }
//             } else {
//                 try { await interaction.reply({ content: "❌ Ocorreu um erro ao processar o questionário.", ephemeral: true }); } catch { }
//             }
//         }


//         // Dentro do seu interactionCreate:
//         if (interaction.isButton() && interaction.customId === 'ticket:poke') {
//             await interaction.deferReply({ flags: 64 }).catch(() => { });
//             try {




//                 // --- cooldown anti-spam por canal ---
//                 const now = Date.now();
//                 const last = pokeCooldown.get(interaction.channelId) || 0;
//                 const left = last + POKE_COOLDOWN_MS - now;
//                 if (left > 0) {
//                     return interaction.editReply({
//                         content: `⏳ Calma! Você poderá notificar novamente em **${Math.ceil(left / 1000)}s**.`
//                     });
//                 }

//                 // --- busca ticket e membro autor ---
//                 const ticket = await client.db?.TicketDetroitPoliceCity?.findOne({
//                     where: { channelId: interaction.channel.id }
//                 });

//                 if (!ticket) {
//                     return interaction.editReply({ content: '❌ Ticket não encontrado no banco.' });
//                 }

//                 const member =
//                     interaction.guild.members.cache.get(ticket.creatorId) ||
//                     (await interaction.guild.members.fetch(ticket.creatorId).catch(() => null));

//                 if (!member) {
//                     return interaction.editReply({ content: '❌ Não encontrei o autor do ticket no servidor.' });
//                 }
//                 if (member.user?.bot) {
//                     return interaction.editReply({ content: '🤖 O autor do ticket é um bot; não vou enviar DM.' });
//                 }

//                 // --- mensagem (DM) ---
//                 const jumpURL = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`;
//                 const embed = new EmbedBuilder()
//                     .setColor(0x3b82f6)
//                     .setTitle('📩 Seu ticket recebeu uma resposta')
//                     .setDescription(
//                         [
//                             `Olá, <@${member.id}>!`,
//                             `Um atendente respondeu seu ticket: ${interaction.channel}.`,
//                             `Clique no botão abaixo para abrir o canal.`
//                         ].join('\n')
//                     )
//                     .setFooter({ text: `Ticket ID: ${ticket.seqGlobal ?? '—'}` })
//                     .setTimestamp();

//                 const btn = new ButtonBuilder()
//                     .setStyle(ButtonStyle.Link)
//                     .setURL(jumpURL)
//                     .setLabel('Abrir o Ticket');

//                 // Tenta DM
//                 let sent = false;
//                 try {
//                     await member.send({
//                         embeds: [embed],
//                         components: [new ActionRowBuilder().addComponents(btn)]
//                     });
//                     sent = true;
//                 } catch (_) {
//                     sent = false;
//                 }

//                 // Se falhou DM, opcional: deixa um aviso no canal (sem pingar o usuário)
//                 // Descomente se quiser avisar no canal também:
//                 // if (!sent) {
//                 //   await interaction.channel.send({
//                 //     content: '📌 O autor do ticket está com DM fechada; não foi possível notificar por mensagem privada.'
//                 //   }).catch(() => {});
//                 // }

//                 // Marca cooldown apenas se tentou notificar
//                 pokeCooldown.set(interaction.channelId, now);

//                 return interaction.editReply({
//                     content: sent
//                         ? '✅ Usuário notificado por DM.'
//                         : '⚠️ Não consegui enviar DM (provavelmente está bloqueada).'
//                 });
//             } catch (err) {
//                 console.error('[ticket:poke]', err);
//                 return interaction.editReply({
//                     content:
//                         '❌ Ocorreu um erro ao notificar o usuário. (DM bloqueada, sem permissão ou outro problema)'
//                 });
//             }
//         }




//         // ========== BOTÃO: CriarAfiliados → modal ==========
//         if (interaction.isButton() && interaction.customId === 'ticket:affiliates') {
//             if (!canUseAdmin(interaction.member)) {
//                 return interaction.reply({ flags: 64, content: 'Sem permissão.' });
//             }

//             const modal = new ModalBuilder().setCustomId('ticket:affiliates:modal').setTitle('Criar Afiliados');
//             const ids = new TextInputBuilder()
//                 .setCustomId('ids')
//                 .setLabel('IDs de Discord')
//                 .setPlaceholder('Ids separados por "," 123,456,789')
//                 .setStyle(TextInputStyle.Paragraph)
//                 .setRequired(true)
//                 .setMaxLength(500);

//             return interaction.showModal(modal.addComponents(new ActionRowBuilder().addComponents(ids)));
//         }

//         // ========== SUBMIT: CriarAfiliados ==========
//         if (interaction.isModalSubmit() && interaction.customId === 'ticket:affiliates:modal') {
//             if (!canUseAdmin(interaction.member)) {
//                 return interaction.reply({ flags: 64, content: 'Sem permissão.' });
//             }
//             await interaction.deferReply({ flags: 64 })

//             const raw = interaction.fields.getTextInputValue('ids') || '';
//             let ids = raw.split(',').map(s => s.trim()).filter(Boolean);
//             ids = ids.filter((v, i) => ids.indexOf(v) === i); // únicos
//             ids = ids.slice(0, CONFIG.MAX_AFFILIATES);

//             if (!ids.length) return interaction.editReply({ content: 'Nenhum ID informado.' });

//             const parentTicket = await client.db.TicketDetroitPoliceCity.findOne({ where: { channelId: interaction.channel.id } });
//             if (!parentTicket) return interaction.editReply({ content: 'Ticket principal não encontrado.' });

//             const guild = interaction.guild;
//             const base = parentTicket.baseName || 'ticket';
//             const seq = parentTicket.seqGlobal || await nextSeq();
//             const emoji = CONFIG.EMOJI.PAGO; // conforme solicitado: EmojiDoPago
//             const results = [];

//             // cria subtickets 1..N
//             for (let i = 0; i < ids.length; i++) {
//                 const userId = ids[i];
//                 const indexHuman = i + 1;

//                 const ch = await guild.channels.create({
//                     name: `${emoji}-${base}-${indexHuman}-${seq}`,
//                     type: ChannelType.GuildText,
//                     parent: CONFIG.CATEGORY.PAGO, // colocar subtickets em PAGO
//                     permissionOverwrites: [
//                         { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
//                         ...CONFIG.ADMIN_ROLE_IDS.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
//                         { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
//                     ],
//                 });

//                 await client.db.TicketDetroitPoliceCity.create({
//                     channelId: ch.id,
//                     creatorId: userId,
//                     creationDate: new Date().toISOString(),
//                     categoria: 'PAGO',
//                     abandono: 'NAO',
//                     seqGlobal: seq,
//                     baseName: base,
//                     parentTicketId: parentTicket.id,
//                     subIndex: indexHuman
//                 });

//                 await ch.send({ content: `Canal criado para <@${userId}> (subticket **${indexHuman}** de **#${seq}**).` });
//                 results.push(ch.toString());
//             }

//             return interaction.editReply({ flags: 64, content: `✅ Criados: ${results.join(', ')}` });
//         }
//     } catch (err) {
//         console.error('[tickets handler]', err);
//         if (interaction.isRepliable()) {
//             try { await interaction.editReply({ flags: 64, content: 'Ocorreu um erro ao processar esta ação.' }); } catch { }
//         }
//     }
// });

