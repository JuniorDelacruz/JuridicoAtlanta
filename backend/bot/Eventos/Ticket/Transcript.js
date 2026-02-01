// 'use strict';

// /**
//  * Variáveis úteis no .env:
//  *  - RENDER_API_URL, RENDER_API_KEY
//  *  - TRANSCRIPT_UPLOAD_URL, TRANSCRIPT_UPLOAD_TOKEN
//  *  - TRANSCRIPTS_DEBUG=1 (ativa logs detalhados)
//  */

// require('../../index');
// const Discord = require('discord.js');
// const client = require('../../index');
// const config = require('../../config');
// const fetch = require('node-fetch');
// const FormData = require('form-data');

// const Ticket = require('../../Schemas/Tickets');

// /** ========= CONFIG ========= **/
// const STAFF_ROLE_IDS = ["1343289102145028098"]; // fallback
// const _staffMemo = new Map();

// // guildId -> logChannelId
// const LOG_CHANNEL_MAP = { "1343285235558780980": "1343285236993233071" };

// // API de render (server.js com criptografia/senha)
// const RENDER_API_URL = process.env.RENDER_API_URL || 'https://api-transcript.starkstore.dev.br/render.html';
// const RENDER_API_KEY = process.env.RENDER_API_KEY || 'testandodev'; // opcional

// // Storage de transcripts (seu uploader)
// const UPLOAD_URL = process.env.TRANSCRIPT_UPLOAD_URL || 'http://168.231.91.248:3001/upload';
// const UPLOAD_TOKEN = process.env.TRANSCRIPT_UPLOAD_TOKEN || 'Bearer 348874010341146625-9b6a1e6fae9e894af2c5b24f961af92860914a6307e46f62f49217da685429d2';

// const processingTickets = new Set();

// /** ========= DEBUG/HELPERS ========= **/
// const DEBUG = String(process.env.TRANSCRIPTS_DEBUG || '') === '1';
// function dlog(...args) { if (DEBUG) console.log('[TRANSCRIPTS]', ...args); }

// async function resolveLogChannel(guild, desiredIdOrNull) {
//   if (!guild) return null;

//   // 1) Tenta ID mapeado
//   if (desiredIdOrNull) {
//     try {
//       const ch = guild.channels.cache.get(desiredIdOrNull) || await guild.channels.fetch(desiredIdOrNull);
//       if (ch && ch.isTextBased()) return ch;
//     } catch (e) {
//       dlog('resolveLogChannel: ID mapeado falhou', desiredIdOrNull, e?.message);
//     }
//   }

//   // 2) Nomes mais comuns
//   const candidatesByName = ['transcripts', 'transcripts-log', 'logs', 'ticket-logs'];
//   for (const name of candidatesByName) {
//     const ch = guild.channels.cache.find(c => c.isTextBased() && c.name?.toLowerCase() === name);
//     if (ch) return ch;
//   }

//   // 3) Primeiro canal onde o bot pode falar
//   const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
//   for (const ch of guild.channels.cache.values()) {
//     try {
//       if (!ch?.isTextBased()) continue;
//       const perms = me ? ch.permissionsFor(me) : null;
//       if (perms?.has(Discord.PermissionFlagsBits.ViewChannel) &&
//         perms?.has(Discord.PermissionFlagsBits.SendMessages)) {
//         return ch;
//       }
//     } catch { }
//   }

//   return null;
// }

// async function safeSend(to, payload, tag = 'send') {
//   try {
//     const msg = await to.send(payload);
//     dlog(`${tag}: ok em #${to?.name || to?.id}`);
//     return msg;
//   } catch (e) {
//     console.error(`[${tag}] falhou:`, {
//       name: e?.name,
//       code: e?.code,
//       status: e?.status,
//       message: e?.message,
//       raw: e?.rawError || e
//     });
//     return null;
//   }
// }

// /** ========= UTIL ========= **/
// // Busca TODOS membros e retorna IDs com pelo menos um dos cargos em STAFF_ROLE_IDS
// async function collectStaffIds(guild, { minAccept = 1, ttlMs = 5 * 60 * 1000, fetchTimeoutMs = 10_000 } = {}) {
//   // 0) memo
//   const memo = _staffMemo.get(guild.id);
//   if (memo && memo.expiresAt > Date.now()) {
//     return memo.ids.slice();
//   }

//   // 1) Caminho rápido: por roles em cache (NÃO chama fetch global)
//   const fast = new Set();
//   try {
//     // garanta que os cargos existem
//     // (não custa tentar puxar pra popular o cache de roles)
//     await guild.roles.fetch().catch(() => null);

//     for (const rid of STAFF_ROLE_IDS) {
//       const role = guild.roles.cache.get(rid);
//       if (!role) continue;
//       // role.members retorna só membros no cache — rápido e sem chunking
//       role.members.forEach(m => fast.add(String(m.id)));
//     }
//   } catch (e) {
//     console.warn('[collectStaffIds] roles pass:', e?.message || e);
//   }

//   // Se o fast-path já resolveu, memoiza e retorna
//   if (fast.size >= minAccept) {
//     const out = [...fast];
//     _staffMemo.set(guild.id, { expiresAt: Date.now() + ttlMs, ids: out });
//     return out;
//   }

//   // 2) Fetch global com timeout controlado (requer GuildMembers intent)
//   //    Use com parcimônia. Em guilds MUITO grandes pode falhar/ser custoso.
//   let fetchedAllOk = false;
//   try {
//     const fetchAll = guild.members.fetch(); // Promise
//     const timeout = new Promise((_, rej) =>
//       setTimeout(() => rej(new Error('members_fetch_timeout')), fetchTimeoutMs)
//     );

//     await Promise.race([fetchAll, timeout]); // aborta se demorar demais
//     fetchedAllOk = true;
//   } catch (e) {
//     console.warn('[collectStaffIds] fetch all members:', e?.message || e);
//   }

//   // Recoleta staff do cache (agora idealmente populado)
//   if (fetchedAllOk) {
//     try {
//       for (const rid of STAFF_ROLE_IDS) {
//         const role = guild.roles.cache.get(rid);
//         if (!role) continue;
//         role.members.forEach(m => fast.add(String(m.id)));
//       }
//     } catch (e) {
//       console.warn('[collectStaffIds] second pass:', e?.message || e);
//     }
//   }

//   const out = [...fast];
//   // 3) memoiza mesmo que vazio (evita martelar o gateway)
//   _staffMemo.set(guild.id, { expiresAt: Date.now() + ttlMs, ids: out });

//   return out;
// }

// /**
//  * Pagina o histórico de um canal em blocos de 100 até 'limit'
//  */
// async function fetchChannelMessages(channel, limit = 800) {
//   const max = Math.min(Number(limit) || 800, 5000);
//   let all = [];
//   let lastId;

//   while (all.length < max) {
//     const toFetch = Math.min(100, max - all.length);
//     const batch = await channel.messages.fetch({ limit: toFetch, before: lastId }).catch(() => null);
//     if (!batch || batch.size === 0) break;
//     const arr = [...batch.values()];
//     all.push(...arr);
//     lastId = arr[arr.length - 1].id;
//     if (arr.length < toFetch) break;
//   }

//   // ordena (antigo -> recente)
//   all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
//   return all;
// }

// /**
//  * Converte discord.js Message para item da API render
//  */
// async function mapMessageToTranscriptItem(m) {
//   // tentar garantir member para checar role (caso venha parcial)
//   let member = m.member;
//   try {
//     if (!member && m.guild && m.author?.id) {
//       member = await m.guild.members.fetch(m.author.id).catch(() => null);
//     }
//   } catch { }

//   // ----- reply (mensagem respondida)
//   let reply = null;
//   try {
//     if (m.reference?.messageId) {
//       const ref = await m.fetchReference(); // pode falhar
//       reply = {
//         id: ref.id,
//         authorName:
//           ref.member?.displayName ??
//           ref.author?.globalName ??
//           ref.author?.username ??
//           'User',
//         contentPreview: (ref.cleanContent ?? ref.content ?? '').slice(0, 180),
//         jumpUrl: ref.url
//       };
//     }
//   } catch { }

//   // ----- components (ActionRows -> Buttons/Selects) para render estático
//   const components = [];
//   for (const row of m.components ?? []) {
//     // Buttons
//     const buttons = row.components?.filter(c => c?.data?.style !== undefined) || [];
//     if (buttons.length) {
//       components.push({
//         type: 'buttons',
//         buttons: buttons.map(b => ({
//           label: b.data.label ?? null,
//           style: b.data.style,         // 1..5
//           url: b.data.url ?? null,     // apenas estilo 5 (link)
//           disabled: !!b.data.disabled,
//           emoji: b.data.emoji?.name ?? null // unicode simples
//         }))
//       });
//       continue;
//     }

//     // StringSelect (e similares)
//     const selects = row.components?.filter(c => c?.data?.options) || [];
//     if (selects.length) {
//       for (const s of selects) {
//         components.push({
//           type: 'select',
//           placeholder: s.data.placeholder ?? null,
//           disabled: !!s.data.disabled,
//           options: (s.data.options || []).map(o => ({
//             label: o.label,
//             value: o.value,
//             description: o.description ?? null,
//             default: !!o.default,
//             emoji: o.emoji?.name ?? null
//           }))
//         });
//       }
//     }
//   }

//   const isStaffHere =
//     !!member?.roles?.cache?.some(r => STAFF_ROLE_IDS.includes(String(r.id)));

//   return {
//     id: m.id,
//     channelId: m.channelId,
//     guildId: m.guildId,
//     author: {
//       id: m.author?.id,
//       username: m.author?.username ?? null,
//       displayName:
//         member?.displayName ??
//         m.author?.globalName ??
//         m.author?.username ??
//         null,
//       isBot: !!m.author?.bot,
//       avatarURL: m.author?.displayAvatarURL?.({ size: 64 }) || null
//     },
//     // ✅ flag para o server.js reconhecer STAFF por item
//     isStaff: isStaffHere,
//     content: m.cleanContent ?? m.content ?? '',
//     attachments: [...m.attachments.values()].map(a => ({
//       id: a.id,
//       name: a.name,
//       url: a.url,
//       contentType: a.contentType || null,
//       size: a.size
//     })),
//     embeds: m.embeds?.map(e => ({
//       title: e.title ?? null,
//       description: e.description ?? null,
//       url: e.url ?? null,
//       fields: e.fields?.map(f => ({
//         name: f.name,
//         value: f.value,
//         inline: f.inline
//       })) ?? [],
//       footer: e.footer?.text ?? null
//     })) ?? [],
//     reply,
//     components,
//     createdAt: new Date(m.createdTimestamp).toISOString()
//   };
// }

// /**
//  * Chama a API render e devolve { buffer, fileName, password }
//  * - Ativa criptografia (encrypt: true)
//  * - Tenta ler a senha pelo header X-Transcript-Password
//  * - Fallback: output=json para garantir a senha em body
//  */
// async function renderTranscriptHTML(channel, items, {
//   after = null,
//   before = null,
//   staffIds = [],
//   openerId = null
// } = {}) {
//   const baseBody = {
//     guildId: channel.guild.id,
//     channelName: channel.name ? `#${channel.name}` : `#${channel.id}`,
//     after,
//     before,
//     items,
//     saveAssets: true,
//     staffIds: (staffIds || []).map(String),
//     openerId: openerId ? String(openerId) : null,
//     encrypt: true,
//     output: 'file' // preferência: arquivo + senha no header
//   };

//   dlog('renderTranscriptHTML: POST file');
//   let resp = await fetch(RENDER_API_URL, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       ...(RENDER_API_KEY ? { 'x-api-key': RENDER_API_KEY } : {})
//     },
//     body: JSON.stringify(baseBody)
//   });

//   if (resp.ok) {
//     const password = resp.headers.get('x-transcript-password') || null;
//     const arrayBuf = await resp.arrayBuffer();
//     const buffer = Buffer.from(arrayBuf);
//     const fileName = `${channel.name || channel.id}.html`;
//     dlog('render ok (file). password header?', !!password);
//     if (password) {
//       return { buffer, fileName, password };
//     } else {
//       try {
//         dlog('renderTranscriptHTML: fallback JSON para pegar senha');
//         resp = await fetch(RENDER_API_URL, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             ...(RENDER_API_KEY ? { 'x-api-key': RENDER_API_KEY } : {})
//           },
//           body: JSON.stringify({ ...baseBody, output: 'json' })
//         });
//         if (resp.ok) {
//           const data = await resp.json();
//           const buf = Buffer.from(data.htmlBase64, 'base64');
//           return { buffer: buf, fileName: data.filename || fileName, password: data.password || null };
//         }
//       } catch (e) {
//         console.error('[renderTranscriptHTML] fallback json error:', e?.message || e);
//       }
//       return { buffer, fileName, password: null };
//     }
//   }

//   const errText = await resp.text().catch(() => String(resp.status));
//   console.warn(`[renderTranscriptHTML] output=file falhou (${resp.status}): ${errText}`);

//   dlog('renderTranscriptHTML: tentando JSON');
//   resp = await fetch(RENDER_API_URL, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       ...(RENDER_API_KEY ? { 'x-api-key': RENDER_API_KEY } : {})
//     },
//     body: JSON.stringify({ ...baseBody, output: 'json' })
//   });

//   if (!resp.ok) {
//     const e2 = await resp.text().catch(() => String(resp.status));
//     throw new Error(`API render falhou (json ${resp.status}): ${e2}`);
//   }

//   const data = await resp.json();
//   const buffer = Buffer.from(data.htmlBase64, 'base64');
//   const fileName = data.filename || `${channel.name || channel.id}.html`;
//   const password = data.password || null;
//   dlog('render ok (json). tem senha?', !!password);
//   return { buffer, fileName, password };
// }

// /** Helpers */
// function hasStaffPerm(member) {
//   if (!member) return false;
//   const roleOK = member.roles?.cache?.some(r => STAFF_ROLE_IDS.includes(String(r.id)));
//   const permOK = member.permissions?.has(Discord.PermissionFlagsBits.ManageChannels) ||
//     member.permissions?.has(Discord.PermissionFlagsBits.Administrator);
//   return roleOK || permOK;
// }

// function categoryLabel(cat) {
//   const map = {
//     "SUPORTE": "🔴 Suporte",
//     "PARCERIA": "🤝 Parceria",
//     "PAGO": "🟢 Pago",
//     "ABERTO": "🔵 ABERTO"
//   };
//   return map[cat] || (cat ? `${cat}` : "Não especificada");
// }

// /** ========= HANDLER ========= **/
// client.on("interactionCreate", async (interaction) => {
//   // precisa ser botão fechar_ticket, em guild
//   if (!interaction.isButton()) return;

//   if (interaction.customId.startsWith('senha_')) {
//     const [, senha] = interaction.customId.split('_', 2); // ["senha", "<valor>"]
//     if (!senha) {
//       return interaction.reply({ content: 'Senha não encontrada no customId.', ephemeral: true });
//     }
//     return interaction.reply({ content: `||${senha}||`, ephemeral: true });
//   }
//   if (!interaction.inGuild()) {
//     return interaction.reply({ ephemeral: true, content: "Este comando só pode ser usado em servidores." });
//   }
//   if (interaction.customId !== "fechar_ticket") return
//   const channel = interaction.channel;

//   // Ajuste aqui conforme seu ORM / schema real:
//   const ticket =
//     (client?.db?.TicketDetroitPoliceCity && await client.db.TicketDetroitPoliceCity.findOne({ where: { channelId: channel.id } }).catch(() => null)) ||
//     (await Ticket.findOne({ channelId: channel.id }).catch(() => null));

//   if (!ticket) {
//     return interaction.reply({ ephemeral: true, content: "❌ Ticket não encontrado para este canal." });
//   }

//   if (!hasStaffPerm(interaction.member)) {
//     const embed = new Discord.EmbedBuilder()
//       .setColor("Red")
//       .setDescription("Você não faz parte da equipe para abrir esse menu!")
//       .setFooter({ text: "Trinda Boost Service", iconURL: interaction.guild.iconURL({ dynamic: true }) })
//       .setTimestamp();
//     return interaction.reply({ embeds: [embed], ephemeral: true });
//   }

//   // idempotência
//   if (processingTickets.has(channel.id)) {
//     return interaction.reply({ ephemeral: true, content: "⏳ Este ticket já está sendo finalizado..." });
//   }
//   processingTickets.add(channel.id);

//   const workingEmbed = new Discord.EmbedBuilder()
//     .setColor("Green")
//     .setThumbnail(interaction.member.displayAvatarURL({ dynamic: true }))
//     .setDescription(`### Ticket Finalizado.\nSalvando Transcript, pode demorar alguns segundos...`)
//     .setTimestamp();

//   try { await interaction.channel.send({ embeds: [workingEmbed], components: [] }) } catch { }

//   try {
//     dlog('1) fetchChannelMessages...');
//     const msgs = await fetchChannelMessages(channel, 800);
//     const items = await Promise.all(msgs.map((m) => mapMessageToTranscriptItem(m)));
//     dlog('1) mensagens:', items.length);

//     dlog('2) collectStaffIds / openerId...');
//     const staffIds = await collectStaffIds(interaction.guild);
//     const openerId = ticket?.creatorId ? String(ticket.creatorId) : null;

//     dlog('3) renderTranscriptHTML...');
//     const { buffer, fileName, password } = await renderTranscriptHTML(channel, items, { staffIds, openerId });
//     dlog('3) render ok. has password?', !!password);

//     // ===== 4) Resolver canal de log com fallbacks
//     const mappedId = LOG_CHANNEL_MAP[interaction.guild.id];
//     const logChannel = await resolveLogChannel(interaction.guild, mappedId);
//     if (!logChannel) {
//       console.warn('[log] nenhum canal de log resolvido. guildId=', interaction.guild.id, 'map=', mappedId);
//     } else {
//       dlog('logChannel resolvido:', logChannel.id, logChannel.name);
//     }

//     // ===== 5) Upload para storage
//     let nomeDoArquivo = null;
//     try {
//       const form = new FormData();
//       form.append('file', buffer, fileName);

//       const up = await fetch(UPLOAD_URL, {
//         method: 'POST',
//         body: form,
//         headers: { Authorization: UPLOAD_TOKEN }
//       });

//       if (!up.ok) {
//         const t = await up.text().catch(() => String(up.status));
//         throw new Error(`Upload falhou (${up.status}): ${t}`);
//       }

//       const data = await up.json();
//       nomeDoArquivo = data.filename;
//       dlog('upload ok:', nomeDoArquivo);
//     } catch (uploadErr) {
//       console.error('[UPLOAD] erro:', uploadErr?.message || uploadErr);
//       if (logChannel) {
//         await safeSend(logChannel, {
//           content: '⚠️ Falha no upload externo. Enviando transcript em anexo.',
//           files: [new Discord.AttachmentBuilder(buffer, { name: fileName })]
//         }, 'log-upload-fallback');
//       }
//     }

//     // ===== 6) Montar botões (link se houver) + SENHA DESABILITADO
//     const buttons = [];
//     if (nomeDoArquivo) {
//       buttons.push(
//         new Discord.ButtonBuilder()
//           .setLabel('🔗 Acessar Transcript')
//           .setStyle(Discord.ButtonStyle.Link)
//           .setURL(`https://starkstore.dev.br/home/tickets/${nomeDoArquivo}`)
//       );
//     }
//     if (password) {
//       buttons.push(
//         new Discord.ButtonBuilder()
//           .setLabel(`🔒 Mostrar senha`)
//           .setStyle(Discord.ButtonStyle.Secondary)
//           .setCustomId(`senha_${password}`)
//           .setDisabled(false)
//       );
//     }
//     const viewRow = buttons.length
//       ? new Discord.ActionRowBuilder().addComponents(...buttons)
//       : null;

//     // ===== 7) DM ao autor (se existir)
//     const member = ticket?.creatorId
//       ? await interaction.guild.members.fetch(ticket.creatorId).catch(() => null)
//       : null;

//     const target = member?.user ?? null;
//     const catName = categoryLabel(ticket.categoria);
//     const nowTs = Math.floor(Date.now() / 1000);

//     const baseEmbed = new Discord.EmbedBuilder()
//       .setColor('Blurple')
//       .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
//       .setTimestamp();

//     const dmEmbed = Discord.EmbedBuilder.from(baseEmbed).setDescription(
//       `✅ **Ticket Finalizado**\n\n` +
//       `**Categoria:** ${catName}\n` +
//       `- **Seu ticket channel ID:** \`${ticket.channelId || channel.id}\`\n` +
//       `- **Ticket ID**: #${ticket.seqGlobal}\n` +
//       `- **Criado:** ${ticket.creationDate || '—'}\n` +
//       `- **Fechado:** <t:${nowTs}>`
//     );

//     if (target) {
//       await safeSend(target, {
//         embeds: [dmEmbed],
//         components: viewRow ? [viewRow] : []
//       }, 'dm-user');
//     } else {
//       dlog('sem DM target (creatorId ausente/inválido)');
//     }

//     // ===== 8) LOG (prioritário)
//     const logEmbed = Discord.EmbedBuilder.from(baseEmbed).setDescription(
//       `✅ **Ticket Finalizado**\n\n` +
//       `**Categoria:** ${catName}\n` +
//       `**Administrador:** ${interaction.member} \`${interaction.member.displayName}\`\n\n` +
//       `- **Ticket channel ID:** \`${ticket.channelId || channel.id}\`\n` +
//       `- **Ticket ID**: #${ticket.seqGlobal}\n` +
//       `- **Criado:** ${ticket.creationDate || '—'}\n` +
//       `- **Fechado:** <t:${nowTs}>`
//     );

//     let logOk = false;
//     if (logChannel) {
//       if (nomeDoArquivo) {
//         const sent = await safeSend(logChannel, {
//           embeds: [logEmbed],
//           components: viewRow ? [viewRow] : []
//         }, 'log-remoto');
//         logOk = !!sent;
//       } else {
//         const sent = await safeSend(logChannel, {
//           embeds: [logEmbed],
//           components: viewRow ? [viewRow] : [],
//           files: [new Discord.AttachmentBuilder(buffer, { name: fileName })]
//         }, 'log-anexo');
//         logOk = !!sent;
//       }
//     } else {
//       dlog('pulado envio em log: sem canal resolvido');
//     }

//     // ===== 9) Fallback final se não conseguiu logar: avisa no próprio ticket
//     if (!logOk) {
//       dlog('fallback: enviando confirmação no canal do ticket');
//       await safeSend(interaction.channel, {
//         content: '⚠️ Não consegui enviar no canal de logs. Seguem os dados por aqui.',
//         embeds: [logEmbed],
//         components: viewRow ? [viewRow] : [],
//         files: !nomeDoArquivo ? [new Discord.AttachmentBuilder(buffer, { name: fileName })] : []
//       }, 'ticket-fallback');
//     }

//     // ===== 10) Fechar canal
//     try { await channel.send({ content: "🗑️ Este ticket será fechado." }); } catch { }
//     try { await channel.delete(); } catch (err) {
//       console.error("[ticket close] delete channel error:", err);
//     }
//   } catch (err) {
//     console.error("[fechar_ticket] erro:", err);
//     if (interaction.isRepliable && interaction.isRepliable()) {
//       try { await interaction.reply({ ephemeral: true, content: "❌ Ocorreu um erro ao finalizar o ticket." }); } catch { }
//     }
//   } finally {
//     if (interaction?.channelId) processingTickets.delete(interaction.channelId);
//   }
// });
