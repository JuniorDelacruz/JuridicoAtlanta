const Discord = require("discord.js")

module.exports = {
    name: "close", // Coloque o nome do comando
    description: "Abra o painel admin de um ticket", // Coloque a descrição do comando
    type: Discord.ApplicationCommandType.ChatInput,


    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageChannels)) {
            interaction.editReply({ content: `Você não possui permissão para utilizar este comando.`, ephemeral: true })
        }
        
        const btnFechar = new Discord.ButtonBuilder().setCustomId('fechar_ticket').setLabel('Sim').setEmoji('✅').setStyle(Discord.ButtonStyle.Danger);
        const btnTrocar = new Discord.ButtonBuilder().setCustomId('negarfechar').setLabel('Não').setEmoji('🔁').setStyle(Discord.ButtonStyle.Secondary);
        const row = new Discord.ActionRowBuilder().addComponents(btnFechar,btnTrocar)

        await interaction.editReply({ content: "Você realmente deseja finalizar esse ticket?", components: [row]})
    }
};


require('../../index')
const client = require('../../index');
const config = require('../../config');


client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton) return
    if (interaction.customId === "negarfechar") return interaction.reply({ content: "Ação cancelada", ephemeral: true})
    
});