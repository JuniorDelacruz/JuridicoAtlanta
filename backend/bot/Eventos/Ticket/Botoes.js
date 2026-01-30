// require('../../index')
// const Discord = require('discord.js')
// const client = require('../../index');
// const config = require('../../config');
// const Ticket = require('../../Schemas/Tickets');
// const logError = require('../../errorLogger');

// const roleIds = config.cargosadministracao

// let botao = new Discord.ActionRowBuilder().addComponents(

//   new Discord.ButtonBuilder()
//     .setCustomId("poke")
//     .setEmoji("\<:chat:1267852529757192244> ")
//     .setLabel("Poke")
//     .setStyle(Discord.ButtonStyle.Primary),

//   new Discord.ButtonBuilder()
//     .setCustomId("reinvidicarticket")
//     .setEmoji("\<:support_StorM:1267852238009798775> ")
//     .setLabel("Reinvidicar Ticket")
//     .setStyle(Discord.ButtonStyle.Primary)
//     .setDisabled(true),

//   new Discord.ButtonBuilder()
//     .setCustomId("adicionarusuario")
//     .setEmoji("\<:Sv_Plus:1267851991665606718> ")
//     .setLabel("Adicionar Usuário")
//     .setStyle(Discord.ButtonStyle.Primary),

//   new Discord.ButtonBuilder()
//     .setCustomId("removerusuario")
//     .setEmoji("\<:menos:1267852180476530770> ")
//     .setLabel("Remover Usuário")
//     .setStyle(Discord.ButtonStyle.Primary)
// );

// const botao2 = new Discord.ActionRowBuilder().addComponents(
//   new Discord.ButtonBuilder()
//     .setCustomId("renomear")
//     .setEmoji("\<:informacoes:1317624240916136027> ")
//     .setLabel("Renomear Canal")
//     .setStyle(Discord.ButtonStyle.Primary),
//   new Discord.ButtonBuilder()
//     .setCustomId("finalizar")
//     .setEmoji("\<:topgg_ico_delete:1267852774624854136> ")
//     .setLabel("Finalizar Ticket")
//     .setStyle(Discord.ButtonStyle.Danger),

//   new Discord.ButtonBuilder()
//     .setCustomId("abandonei")
//     .setEmoji("\<:exit:1267850527681675420>   ")
//     .setLabel("Cancelar ou Sair")
//     .setStyle(Discord.ButtonStyle.Danger),
// )

// module.exports = { botao, botao2 }


// client.on("interactionCreate", async (interaction) => {



//   if (interaction.customId === "renomear_modal") {
//     const novoNome = interaction.fields.getTextInputValue("novo_nome").trim();
//     const canal = interaction.channel;

//     if (!novoNome || novoNome === canal.name) {
//       return interaction.reply({ content: "❌ O nome do canal não foi alterado.", ephemeral: true });
//     }

//     try {
//       await canal.setName(novoNome);
//       await interaction.reply({ content: `✅ O canal foi renomeado para **${novoNome}**!`, ephemeral: true });
//     } catch (error) {
//       console.error(error);
//       await interaction.reply({ content: "❌ Erro ao renomear o canal.", ephemeral: true });
//     }
//   }


//   if (interaction.isButton()) {




//     if (interaction.customId === 'contratar' || interaction.customId === 'demitir') {
//       const action = interaction.customId === 'contratar' ? 'contratar' : 'demitir';

//       // Criando um select menu para escolher um usuário
//       const row = new Discord.ActionRowBuilder()
//         .addComponents(
//           new Discord.UserSelectMenuBuilder()
//             .setCustomId(`select_user_${action}`)
//             .setPlaceholder('Selecione um usuário')
//         );

//       await interaction.reply({ content: `Selecione um usuário para ${action}:`, components: [row], ephemeral: true });
//       return
//     }

//     if (interaction.customId === "renomear") {
//       const currentChannelName = interaction.channel.name;

//       const modal = new Discord.ModalBuilder()
//         .setCustomId("renomear_modal")
//         .setTitle("Renomear Canal");

//       const input = new Discord.TextInputBuilder()
//         .setCustomId("novo_nome")
//         .setLabel("Novo nome do canal")
//         .setPlaceholder("Digite um novo nome para o canal")
//         .setStyle(Discord.TextInputStyle.Short)
//         .setValue(currentChannelName) // Preenche com o nome atual do canal
//         .setRequired(false); // Não é obrigatório alterar o nome

//       const actionRow = new Discord.ActionRowBuilder().addComponents(input);
//       modal.addComponents(actionRow);

//       await interaction.showModal(modal);
//       return
//     }

//     const ticketButtons = ["abandonei", "finalizar", "adicionarusuario", "removerusuario", "reinvidicarticket"];

//     if (ticketButtons.includes(interaction.customId)) {



//       const ticket = await Ticket.findOne({ channelId: interaction.channel.id })
//       const userticket = await interaction.guild.members.cache.get(ticket.creatorId);





//       if (interaction.customId === "abandonei") {
//         if (interaction.user.id === ticket.creatorId) {

//           interaction.channel.permissionOverwrites.delete(interaction.member.id).then(async () => {

//             let embed = new Discord.EmbedBuilder()
//               .setColor("Green")
//               .setDescription(`O autor(a) do ticket
//           Nickname: \`${interaction.member.nickname}\`
//           Tag: \`${interaction.user.tag}\`
//           Discord Id: \`${interaction.member.id}\`
          
//           Resolveu sair do ticket...
    
//           Este ticket pode ser Finalizado`)
//               .setTimestamp()
//               .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
//               .setFooter({
//                 text: "South Roleplay - by junior.js",
//                 iconURL: interaction.guild.iconURL({ dynamic: true })
//               })
//             let botao = new Discord.ActionRowBuilder().addComponents(
//               new Discord.ButtonBuilder()
//                 .setCustomId("finalizar")
//                 .setEmoji("✅")
//                 .setLabel("Finalizar")
//                 .setStyle(Discord.ButtonStyle.Success),
//             );

//             interaction.update({ embeds: [embed], components: [botao], content: `${interaction.member}` })
//             interaction.channel.edit({
//               topic: `Ticket abandonado/cancelado pelo dono(a) ${interaction.member.nickname}`
//             })

//             const creationDate = `<t:${Math.floor(Date.now() / 1000)}>`;



//             if (ticket) {
//               ticket.abandono = creationDate
//               ticket.save()
//                 .then(() => console.log('✅ Ticket updated successfully'))
//                 .catch(err => console.error('❌ Error saving ticket:', err));
//             }



//           }).catch(error => {
//             console.error("Erro ao deletar permissões:", error);
//             let embed = new Discord.EmbedBuilder()
//               .setColor("Green")
//               .setDescription(`Ocorreu um erro ao sair do ticket por favor tente novamente!`)
//               .setTimestamp()
//               .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
//               .setFooter({
//                 text: "South Roleplay - by junior.js",
//                 iconURL: interaction.guild.iconURL({ dynamic: true })
//               })


//             interaction.update({ embeds: [embed], content: `${interaction.member}` })
//           });
//           return

//         } else {
//           let embed = new Discord.EmbedBuilder()
//             .setColor("Red")
//             .setDescription(`Você não é o autor do ticket para sair do mesmo!`)
//             .setTimestamp()
//             .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
//             .setFooter({
//               text: "South Roleplay - by junior.js",
//               iconURL: interaction.guild.iconURL({ dynamic: true })
//             })


//           const message = await interaction.reply({ embeds: [embed], content: `${interaction.member}`, ephemeral: true })

//           setTimeout(() => {
//             message.delete()
//           }, 5000);
//           return
//         }
//         return
//       }










//       if (interaction.customId === "finalizar") {

//         let embed = new Discord.EmbedBuilder()
//           .setColor("Gold")
//           .setDescription(`Por favor confirme a finalização deste ticket, ao finalizar será salvo o transcript do mesmo.`)
//           .setTimestamp()
//           .setFooter({
//             text: "South Roleplay - by junior.js",
//             iconURL: interaction.guild.iconURL({ dynamic: true })
//           })
//         const botao = new Discord.ActionRowBuilder()
//           .addComponents(
//             new Discord.ButtonBuilder()
//               .setCustomId("fechar_ticket")
//               .setEmoji("\<:acerto:1176084296612724816>")
//               .setLabel("Sim")
//               .setStyle(Discord.ButtonStyle.Danger),
//             new Discord.ButtonBuilder()
//               .setCustomId("naofechar")
//               .setEmoji("\<:9989830467264266541:1155584055295877140>")
//               .setLabel("Não")
//               .setStyle(Discord.ButtonStyle.Success),
//           )

//         await interaction.reply({ embeds: [embed], components: [botao] })
//       }






//       if (interaction.customId === "naofechar") {
//         await interaction.message.delete()
//         await interaction.reply({ content: `${interaction.member} Ação cancelada`, ephemeral: true })
//       }


















//       if (interaction.customId === "adicionarusuario") {
//         await interaction.deferReply({ ephemeral: true });
//         if (!ticket) {
//           return interaction.editReply({ content: "Ticket não encontrado.", ephemeral: true });
//         }
//         interaction.editReply({ content: "Por favor, insira o @ do usuairo na qual deseja adicionar ao ticket, ou digite /cancelar para cancelar a ação:", ephemeral: true });
//         const filter = (msg) => msg.author.id === interaction.user.id;
//         const collector = interaction.channel.createMessageCollector({ filter, time: 60000 }); // O tempo é definido em milissegundos (60 segundos neste caso)
//         let textoAnuncio = "";

//         // Coletar a mensagem com o novo nome
//         collector.on("collect", async (msg) => {
//           if (msg.content.toLowerCase() === "/cancelar") {
//             collector.stop();
//             setTimeout(() => {
//               msg.delete()
//             }, 1000);
//             return interaction.editReply({ content: "Alteração cancelada.", ephemeral: true });
//           } else {
//             collector.stop();
//             msg.delete()
//             const mentionedMember = msg.mentions.members.first();
//             if (mentionedMember) {
//               const isAlreadyAdded = interaction.channel.permissionOverwrites.cache.has(mentionedMember.id);
//               if (mentionedMember.id === ticket.creatorId && isAlreadyAdded) {
//                 return interaction.followUp({
//                   content: "Você não pode adicionar o dono do Ticket pois ele já está no ticket...", ephemeral: true
//                 })
//               }
//               if (isAlreadyAdded) {
//                 return interaction.followUp({ content: "Este usuário já foi adicionado ao ticket.", ephemeral: true });
//               }


//               const permissionsToAdd = {
//                 SendMessages: true,
//                 ViewChannel: true,
//                 ReadMessageHistory: true,
//               };
//               // Aqui você pode adicionar lógica adicional para o membro mencionado
//               console.log(`✅ Membro mencionado: ${mentionedMember.displayName}`);
//               interaction.channel.permissionOverwrites.create(mentionedMember.id, permissionsToAdd)
//               let embed = new Discord.EmbedBuilder()
//                 .setColor("Gold")
//                 .setDescription(`Usuário ${mentionedMember} Adicionado ao ticket`)
//                 .setTimestamp()
//                 .setFooter({
//                   text: "South Roleplay - by junior.js",
//                   iconURL: interaction.guild.iconURL({ dynamic: true })
//                 })
//               interaction.followUp({ embeds: [embed] });
//             } else {
//               await msg.reply("Por favor, tente novamente e mencione um usuário válido.");
//               msg.delete()
//             }
//             return;
//           }
//         });


//         collector.on("end", (collected, reason) => {
//           if (reason === "time" && textoAnuncio.length === 0) {
//             interaction.followUp({ content: "Tempo limite para entrada de anúncio atingido. Anúncio cancelado.", ephemeral: true });
//             return;
//           }

//           if (reason !== "user" && textoAnuncio.length === 0) {
//             interaction.followUp({ content: "Nenhuma mensagem de anúncio foi fornecida. Anúncio cancelado.", ephemeral: true });
//             return;
//           }
//         })
//       }


































//       if (interaction.customId === "reinvidicarticket") {
//         await interaction.deferReply({ ephemeral: true });

//         interaction.followUp({ content: "Por favor, insira o novo nome para o canal, ou digite /cancelar para cancelar a ação:", ephemeral: true });
//         const filter = (msg) => msg.author.id === interaction.user.id;
//         const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
//         let textoAnuncio = "";

//         collector.on("collect", (msg) => {
//           if (msg.content.toLowerCase() === "/cancelar") {
//             collector.stop("cancelado");
//             msg.delete();
//             interaction.followUp({ content: "Alteração cancelada.", ephemeral: true });
//             return;
//           } else {
//             textoAnuncio = msg.content; // Adicione a mensagem ao texto do anúncio
//             msg.delete();
//             collector.stop();
//           }
//         });

//         collector.on("end", async (collected, reason) => {
//           if (reason === "time" && textoAnuncio === "") {
//             interaction.followUp({ content: "Tempo limite para entrada de anúncio atingido. Anúncio cancelado.", ephemeral: true });
//             return;
//           }

//           if (reason === "cancelado") {
//             return;
//           }

//           if (textoAnuncio === "") {
//             interaction.followUp({ content: "Nenhuma mensagem de anúncio foi fornecida. Anúncio cancelado.", ephemeral: true });
//             return;
//           }


//           if (ticket.categoria === "DenunciaStaff") {
//             interaction.channel.edit({
//               name: `🪽|${textoAnuncio}`
//             }).then(updatedChannel => {
//               let embed = new Discord.EmbedBuilder()
//                 .setColor("Gold")
//                 .setDescription(`
//                       ## Ticket Reinvidicado
          
//                       A partir desse momento o(a) Staff ${interaction.member} irá lhe atender!
//                       `)
//                 .setTimestamp()
//                 .setFooter({
//                   text: "South Roleplay - by junior.js",
//                   iconURL: interaction.guild.iconURL({ dynamic: true })
//                 })

//               interaction.followUp({ embeds: [embed], content: `${userticket}` });

//               return;
//             }).catch(error => {
//               console.error('Erro ao atualizar o canal:', error);
//               interaction.followUp({ content: "Erro ao reinvidicar o ticket, por favor tente novamente! se persistir contate o suporte.", ephemeral: true });
//               return;
//             });
//           }


//           if (ticket.categoria === "DenunciaJogador") {
//             interaction.channel.edit({
//               name: `⛔┇${textoAnuncio}`,
//               permissionOverwrites: [
//                 {
//                   id: interaction.guild.id,
//                   deny: [
//                     Discord.PermissionFlagsBits.ViewChannel
//                   ]
//                 },
//                 {
//                   id: interaction.member.id,
//                   allow: [
//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.ManageChannels,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.SendMessages,
//                     Discord.PermissionFlagsBits.ViewChannel,
//                     Discord.PermissionFlagsBits.ReadMessageHistory
//                   ]
//                 },
//                 {
//                   id: ticket.creatorId,
//                   allow: [

//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.SendMessages,
//                     Discord.PermissionFlagsBits.ViewChannel,
//                     Discord.PermissionFlagsBits.ReadMessageHistory
//                   ]
//                 }
//               ].concat(
//                 roleIds.map(roleId => ({
//                   id: roleId,
//                   deny: [
//                     Discord.PermissionFlagsBits.SendMessages,
//                     Discord.PermissionFlagsBits.ViewChannel,
//                   ],
//                   allow: [
//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.ReadMessageHistory

//                   ]
//                 }))
//               )
//             }).then(updatedChannel => {
//               let embed = new Discord.EmbedBuilder()
//                 .setColor("Gold")
//                 .setDescription(`
//                       ## Ticket Reinvidicado
          
//                       A partir desse momento o(a) Staff ${interaction.member} irá lhe atender!
//                       `)
//                 .setTimestamp()
//                 .setFooter({
//                   text: "South Roleplay - by junior.js",
//                   iconURL: interaction.guild.iconURL({ dynamic: true })
//                 })

//               interaction.followUp({ embeds: [embed], content: `${userticket}` });

//               return;
//             }).catch(error => {
//               console.error('Erro ao atualizar o canal:', error);
//               interaction.followUp({ content: "Erro ao reinvidicar o ticket, por favor tente novamente! se persistir contate o suporte.", ephemeral: true });
//               return;
//             });
//           }



//           if (ticket.categoria === "DenunciaIlegal") {
//             interaction.channel.edit({
//               name: `🪽┇${textoAnuncio}`,
//               permissionOverwrites: [
//                 {
//                   id: interaction.guild.id,
//                   deny: [
//                     Discord.PermissionFlagsBits.ViewChannel
//                   ]
//                 },
//                 {
//                   id: interaction.member.id,
//                   allow: [
//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.ManageChannels,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.SendMessages,
//                     Discord.PermissionFlagsBits.ViewChannel,
//                     Discord.PermissionFlagsBits.ReadMessageHistory
//                   ]
//                 },
//                 {
//                   id: ticket.creatorId,
//                   allow: [

//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.SendMessages,
//                     Discord.PermissionFlagsBits.ViewChannel,
//                     Discord.PermissionFlagsBits.ReadMessageHistory
//                   ]
//                 }
//               ].concat(
//                 roleIds.map(roleId => ({
//                   id: roleId,
//                   deny: [
//                     Discord.PermissionFlagsBits.SendMessages,
//                     Discord.PermissionFlagsBits.ViewChannel,
//                   ],
//                   allow: [
//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.ReadMessageHistory

//                   ]
//                 }))
//               )
//             }).then(updatedChannel => {
//               let embed = new Discord.EmbedBuilder()
//                 .setColor("Gold")
//                 .setDescription(`
//                       ## Ticket Reinvidicado
          
//                       A partir desse momento o(a) Staff ${interaction.member} irá lhe atender!
//                       `)
//                 .setTimestamp()
//                 .setFooter({
//                   text: "South Roleplay - by junior.js",
//                   iconURL: interaction.guild.iconURL({ dynamic: true })
//                 })

//               interaction.followUp({ embeds: [embed], content: `${userticket}` });

//               return;
//             }).catch(error => {
//               console.error('Erro ao atualizar o canal:', error);
//               interaction.followUp({ content: "Erro ao reinvidicar o ticket, por favor tente novamente! se persistir contate o suporte.", ephemeral: true });
//               return;
//             });
//           }





//           if (ticket.categoria === "Suporte") {
//             interaction.channel.edit({
//               name: `🙋 | ${textoAnuncio}`,
//               permissionOverwrites: [
//                 {
//                   id: interaction.guild.id,
//                   deny: [
//                     Discord.PermissionFlagsBits.ViewChannel
//                   ]
//                 },
//                 {
//                   id: interaction.member.id,
//                   allow: [
//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.SendMessages,
//                     Discord.PermissionFlagsBits.ViewChannel,
//                     Discord.PermissionFlagsBits.ReadMessageHistory
//                   ]
//                 },
//                 {
//                   id: ticket.creatorId,
//                   allow: [

//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.SendMessages,
//                     Discord.PermissionFlagsBits.ViewChannel,
//                     Discord.PermissionFlagsBits.ReadMessageHistory
//                   ]
//                 }
//               ].concat(
//                 roleIds.map(roleId => ({
//                   id: roleId,
//                   deny: [
//                     Discord.PermissionFlagsBits.SendMessages,
//                   ],
//                   allow: [
//                     Discord.PermissionFlagsBits.ViewChannel,
//                     Discord.PermissionFlagsBits.AttachFiles,
//                     Discord.PermissionFlagsBits.EmbedLinks,
//                     Discord.PermissionFlagsBits.AddReactions,
//                     Discord.PermissionFlagsBits.ReadMessageHistory

//                   ]
//                 }))
//               )
//             }).then(updatedChannel => {
//               let embed = new Discord.EmbedBuilder()
//                 .setColor("Gold")
//                 .setDescription(`
//                       ## Ticket Reinvidicado
          
//                       A partir desse momento o(A) staff ${interaction.member} irá lhe atender!
//                       `)
//                 .setTimestamp()
//                 .setFooter({
//                   text: "South Roleplay - by junior.js",
//                   iconURL: interaction.guild.iconURL({ dynamic: true })
//                 })

//               interaction.followUp({ embeds: [embed], content: `${userticket}` });

//               return;
//             }).catch(error => {
//               console.error('Erro ao atualizar o canal:', error);
//               interaction.followUp({ content: "Erro ao reinvidicar o ticket, por favor tente novamente! se persistir contate o suporte.", ephemeral: true });
//               return;
//             });
//           }
//         })
//       }











































//       if (interaction.customId === "removerusuario") {
//         await interaction.deferReply({ ephemeral: true });
//         if (!ticket) {
//           return interaction.followUp({ content: "Ticket não encontrado.", ephemeral: true });
//         }
//         interaction.followUp({ content: "Por favor, insira o @ do usuairo na qual deseja remover do ticket, ou digite /cancelar para cancelar a ação:", ephemeral: true });
//         const filter = (msg) => msg.author.id === interaction.user.id;
//         const collector = interaction.channel.createMessageCollector({ filter, time: 60000 }); // O tempo é definido em milissegundos (60 segundos neste caso)
//         let textoAnuncio = "";

//         // Coletar a mensagem com o novo nome
//         collector.on("collect", (msg) => {
//           if (msg.content.toLowerCase() === "/cancelar") {
//             collector.stop();
//             setTimeout(() => {
//               msg.delete()
//             }, 1000);
//             interaction.followUp({ content: "Alteração cancelada.", ephemeral: true });
//             return;
//           } else {
//             collector.stop();
//             msg.delete()
//             const mentionedMember = msg.mentions.members.first();
//             if (mentionedMember) {
//               const isAlreadyAdded = interaction.channel.permissionOverwrites.cache.has(mentionedMember.id);
//               if (mentionedMember.id === ticket.creatorId && isAlreadyAdded) {
//                 return interaction.followUp({ content: "Você não pode remover o dono do Ticket...", ephemeral: true })
//               }
//               if (!isAlreadyAdded) {
//                 return interaction.followUp({ content: "Este usuário não está no ticket para ser removido.", ephemeral: true });
//               }


//               const permissionsToAdd = {
//                 SendMessages: false,
//                 ViewChannel: false,
//                 ReadMessageHistory: false,
//               };
//               // Aqui você pode adicionar lógica adicional para o membro mencionado
//               console.log(`✅ Membro mencionado: ${mentionedMember.displayName}`);
//               interaction.channel.permissionOverwrites.delete(mentionedMember.id, permissionsToAdd)
//               let embed = new Discord.EmbedBuilder()
//                 .setColor("Gold")
//                 .setDescription(`Usuário ${mentionedMember} removido do ticket`)
//                 .setTimestamp()
//                 .setFooter({
//                   text: "South Roleplay - by junior.js",
//                   iconURL: interaction.guild.iconURL({ dynamic: true })
//                 })
//               interaction.followUp({ embeds: [embed] });
//             } else {
//               interaction.followUp({ content: "Por favor, tente novamente e mencione um usuário válido.", ephemeral: true });
//             }
//             return;
//           }
//         });
//         collector.on("end", (collected, reason) => {
//           if (reason === "time" && textoAnuncio.length === 0) {
//             interaction.followUp({ content: "Tempo limite para entrada de anúncio atingido. Anúncio cancelado.", ephemeral: true });
//             return;
//           }

//           if (reason !== "user" && textoAnuncio.length === 0) {
//             interaction.followUp({ content: "Nenhuma mensagem de anúncio foi fornecida. Anúncio cancelado.", ephemeral: true });
//             return;
//           }
//         })
//       }


//       if (interaction.customId === "poke") {
//         await interaction.deferReply({ ephemeral: true })


//         const hasStaffRole = interaction.member.roles.cache.some(role => roleIds.includes(role.id));
//         if (!hasStaffRole) {
//           let embed = new Discord.EmbedBuilder()
//             .setColor("Red")
//             .setDescription(`Você não faz parte da staff para interajir com esse menu!`)
//             .setTimestamp()
//             .setFooter({
//               text: "South Roleplay - by junior.js",
//               iconURL: interaction.guild.iconURL({ dynamic: true })
//             })
//           interaction.editReply({ embeds: [embed], ephemeral: true })
//           return;
//         }


//         let embed = new Discord.EmbedBuilder()
//           .setColor("Red")
//           .setDescription(`Olá ${userticket} a equipe da staff aguarda sua resposta no ticket !`)
//           .setTimestamp()
//           .setFooter({
//             text: "South Roleplay - by junior.js",
//             iconURL: interaction.guild.iconURL({ dynamic: true })
//           })
//         let botão = new Discord.ActionRowBuilder().addComponents(
//           new Discord.ButtonBuilder()
//             .setStyle(Discord.ButtonStyle.Link)
//             .setURL(`https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`)
//             .setLabel("Acessar Ticket")
//             .setEmoji("<:_f:1232305604446650418> ")
//         )

//         try {
//           await userticket.send({ embeds: [embed], components: [botão], content: `${userticket}` });
//           await interaction.editReply({ content: "Mensagem enviada com sucesso.", ephemeral: true });
//         } catch (error) {
//           console.error("Erro ao enviar mensagem:", error);
//           if (error.code === 50007) { // Código de erro para "Cannot send messages to this user"
//             await interaction.editReply({
//               content: "Não foi possível enviar a mensagem para o usuário. Ele pode ter bloqueado mensagens diretas.",
//               ephemeral: true
//             });
//             logError(error)
//           } else {
//             // Trata outros tipos de erros genéricos
//             await interaction.editReply({
//               content: "Houve um erro ao tentar enviar a mensagem. Por favor, entre em contato com o desenvolvedor do bot para suporte e correção do erro.",
//               ephemeral: true
//             });
//             logError(error)
//           }
//         }
//       }
//     }
//   }
// });