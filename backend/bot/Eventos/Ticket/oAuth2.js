// // Eventos/Verificacao/OAuthVerify.js
// require("../../index");
// const {
//   ActionRowBuilder,
//   StringSelectMenuBuilder,
//   StringSelectMenuOptionBuilder,
//   ButtonStyle,
//   EmbedBuilder,
//   PermissionFlagsBits,
// } = require("discord.js");
// const client = require("../../index");

// // ================= CONFIG =================
// const VERIFY_ROLE_ID = "1434660690794381353"; // TODO: ID do cargo de acesso
// const LIMIT_TO_CHANNEL_ID = null; // TODO (opcional): "123456..." para permitir clicar só neste canal
// const CODE_TTL_MS = 5 * 60 * 1000; // expira em 5 min
// const MAX_ATTEMPTS = 2;
// // =========================================

// // memória: userId -> { code, expiresAt, attempts }
// const pending = new Map();

// function rndCode() {
//   return Math.floor(1000 + Math.random() * 9000); // 1000..9999
// }

// function shuffle(arr) {
//   for (let i = arr.length - 1; i > 0; i--) {
//     const j = (Math.random() * (i + 1)) | 0;
//     [arr[i], arr[j]] = [arr[j], arr[i]];
//   }
//   return arr;
// }

// client.on("interactionCreate", async (interaction) => {
//   try {
//     // -------- clique no botão "Começar verificação"
//     if (interaction.isButton() && interaction.customId === "verify:start") {
//       if (LIMIT_TO_CHANNEL_ID && interaction.channelId !== LIMIT_TO_CHANNEL_ID) {
//         return interaction.reply({
//           ephemeral: true,
//           content: "⚠️ Use a verificação no canal indicado pelo servidor.",
//         });
//       }

//       // Já tem o cargo?
//       const member = interaction.member ?? (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));
//       if (!member) {
//         return interaction.reply({ ephemeral: true, content: "Não consegui validar seu usuário." });
//       }
//       if (VERIFY_ROLE_ID && member.roles.cache.has(VERIFY_ROLE_ID)) {
//         return interaction.reply({ ephemeral: true, content: "✅ Você já está verificado e tem acesso." });
//       }

//       // gera/renova o código p/ este usuário
//       const code = rndCode();
//       const distractors = new Set();
//       while (distractors.size < 4) {
//         const d = rndCode();
//         if (d !== code) distractors.add(d);
//       }
//       const options = shuffle([code, ...[...distractors]]).map((n) =>
//         new StringSelectMenuOptionBuilder().setLabel(String(n)).setValue(String(n))
//       );

//       // guarda estado
//       pending.set(interaction.user.id, {
//         code,
//         expiresAt: Date.now() + CODE_TTL_MS,
//         attempts: 0,
//       });

//       const embed = new EmbedBuilder()
//         .setColor(0x58eb34)
//         .setTitle("Verificação")
//         .setDescription(
//           [
//             `Seu **código** é: \`${code}\``,
//             "Selecione no menu abaixo a opção **exatamente igual** ao código exibido.",
//             `Você tem ${Math.ceil(CODE_TTL_MS / 60000)} min e até ${MAX_ATTEMPTS} tentativas.`,
//           ].join("\n")
//         );

//       const menu = new StringSelectMenuBuilder()
//         .setCustomId("verify:pick")
//         .setPlaceholder("Escolha seu código")
//         .addOptions(options);

//       return interaction.reply({
//         ephemeral: true,
//         embeds: [embed],
//         components: [new ActionRowBuilder().addComponents(menu)],
//       });
//     }

//     // -------- escolha no select (o “oauth” de 4 dígitos)
//     if (interaction.isStringSelectMenu() && interaction.customId === "verify:pick") {
//       await interaction.deferReply({ ephemeral: true });

//       const state = pending.get(interaction.user.id);
//       if (!state || Date.now() > state.expiresAt) {
//         pending.delete(interaction.user.id);
//         return interaction.editReply({
//           content: "⌛ Seu desafio expirou. Clique no botão novamente para gerar um novo código.",
//         });
//       }

//       const chosen = interaction.values[0];
//       state.attempts += 1;

//       if (String(chosen) !== String(state.code)) {
//         if (state.attempts >= MAX_ATTEMPTS) {
//           pending.delete(interaction.user.id);
//           return interaction.editReply({
//             content: "❌ Código incorreto. Você atingiu o limite de tentativas. Clique no botão para tentar de novo.",
//           });
//         }
//         pending.set(interaction.user.id, state);
//         return interaction.editReply({
//           content: `❌ Código incorreto. Tentativa ${state.attempts}/${MAX_ATTEMPTS}. Tente novamente.`,
//         });
//       }

//       // Acertou
//       pending.delete(interaction.user.id);

//       const member =
//         interaction.member ??
//         (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));

//       if (!member) {
//         return interaction.editReply({ content: "Verificado, mas não consegui localizar seu membro no servidor." });
//       }

//       if (VERIFY_ROLE_ID) {
//         try {
//           await member.roles.add(VERIFY_ROLE_ID, "Verificação concluída");
//         } catch (e) {
//           return interaction.editReply({
//             content:
//               "✅ Verificação confirmada, mas não consegui atribuir o cargo (cheque permissões/posição do cargo do bot).",
//           });
//         }
//       }

//       return interaction.editReply({
//         content: "✅ Verificação concluída! Seu acesso foi liberado. Bem-vindo(a)!",
//       });
//     }
//   } catch (err) {
//     console.error("[verify] erro:", err);
//     if (interaction.isRepliable()) {
//       try {
//         await interaction.reply({ ephemeral: true, content: "❌ Ocorreu um erro ao processar a verificação." });
//       } catch {}
//     }
//   }
// });
