const Discord = require("discord.js")

module.exports = {
    name: "move", // Coloque o nome do comando
    description: "Mova um ticket entre categorias", // Coloque a descrição do comando
    type: Discord.ApplicationCommandType.ChatInput,

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) {
            interaction.editReply({ content: `Você não possui permissão para utilizar este comando.` })
        }
        const select = new Discord.StringSelectMenuBuilder()
            .setCustomId('ticket:move:select')
            .setPlaceholder('Selecione a categoria')
            .addOptions(
                new Discord.StringSelectMenuOptionBuilder().setLabel('Parceria').setValue('PARCERIA').setEmoji('🤝'),
                new Discord.StringSelectMenuOptionBuilder().setLabel('Pago').setValue('PAGO').setEmoji('🟢'),
                new Discord.StringSelectMenuOptionBuilder().setLabel('Suporte').setValue('SUPORTE').setEmoji('🔴'),
                new Discord.StringSelectMenuOptionBuilder().setLabel('Windows').setValue('WINDOWS').setEmoji('⚪'),
                new Discord.StringSelectMenuOptionBuilder().setLabel('Aberto').setValue('ABERTO').setEmoji('🔵'), // NOVO
            );

        return interaction.editReply({
            components: [new Discord.ActionRowBuilder().addComponents(select)]
        });
    }
};

