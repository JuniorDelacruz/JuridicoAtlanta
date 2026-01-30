const Discord = require("discord.js")

module.exports = {
    name: "paineladmin", // Coloque o nome do comando
    description: "Abra o painel admin de um ticket", // Coloque a descrição do comando
    type: Discord.ApplicationCommandType.ChatInput,


    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageChannels)) {
            interaction.editReply({ content: `Você não possui permissão para utilizar este comando.`, ephemeral: true })
        }
        const btnFechar = new Discord.ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🗑️').setStyle(Discord.ButtonStyle.Danger);
        const btnTrocar = new Discord.ButtonBuilder().setCustomId('ticket:move').setLabel('TrocarCategoria').setEmoji('🔁').setStyle(Discord.ButtonStyle.Secondary);
        const btnAfiliados = new Discord.ButtonBuilder().setCustomId('ticket:affiliates').setLabel('CriarAfiliados').setEmoji('🧩').setStyle(Discord.ButtonStyle.Primary);

         const row = new Discord.ActionRowBuilder().addComponents( btnFechar, btnTrocar, btnAfiliados);

        await interaction.editReply({ content: "Painel ADM", components: [row]})
    }
};