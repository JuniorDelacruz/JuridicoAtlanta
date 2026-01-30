const Discord = require("discord.js");
const { text } = require("express");

module.exports = {
    name: "dm",
    description: "Envie uma mensagem privada via embed para um usuário.",
    type: Discord.ApplicationCommandType.ChatInput,
    options: [
        {
            name: "usuário",
            description: "Selecione o usuário que irá receber a mensagem.",
            type: Discord.ApplicationCommandOptionType.User,
            required: true,
        }
    ],

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.KickMembers)) {
            return interaction.reply({
                content: `Você não possui permissão para utilizar este comando.`,
                ephemeral: true,
            });
        }

        const cargoid = "1337282894489718794"
        const role = interaction.guild.roles.cache.get(cargoid)
        const user = interaction.options.getUser("usuário");

        const modal = new Discord.ModalBuilder()
            .setCustomId(`modal_dm_${user.id}`)
            .setTitle(`Mensagem Privada para ${user.username}`);

        const input = new Discord.TextInputBuilder()
            .setCustomId("mensagem_dm")
            .setLabel("Digite a mensagem que será enviada:")
            .setStyle(Discord.TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setRequired(true);

        const row = new Discord.ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        await interaction.showModal(modal);

        const filter = (i) => i.customId === `modal_dm_${user.id}` && i.user.id === interaction.user.id;

        interaction
            .awaitModalSubmit({ filter, time: 5 * 60 * 1000 })
            .then(async (modalInteraction) => {
                const msg = modalInteraction.fields.getTextInputValue("mensagem_dm");


                const embed = new Discord.EmbedBuilder()
                    .setTitle(`High Command Detroit Police`)
                    .setDescription(msg)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .setColor("Blue")
                    .setFooter({ text: `Enviado por ${interaction.member.nickname || interaction.member.displayName}`, iconURL: interaction.user.displayAvatarURL() });

                const channellog = interaction.guild.channels.cache.get("1360597172437127229")

                let succes = 0;
                let failed = 0; 

                const members = role.members

                for (const [_, member] of member)
                {
                    try {
                        await member.send({ embeds: [embed ]})
                        succes++;
                    } catch {
                        failed++;
                    }
                }

                await channellog?.send({
                    conten: `Mensagem enviada`,
                    embeds: [embed]
                })

                await modalInteraction.reply({
                    content: `Mensagem enviado para ${succes} , Falhou para ${failed}`,
                    flags: 64
                })
            })
            .catch(async () => {
                // Apenas tenta responder se a interação ainda estiver válida
                if (!interaction.replied && !interaction.deferred) {
                    try {
                        await interaction.reply({
                            content: `⏰ Tempo esgotado. Nenhuma mensagem foi enviada.`,
                            ephemeral: true,
                        });
                    } catch (e) {
                        console.error("Erro ao tentar responder após timeout:", e);
                    }
                }
            });
    },
};
