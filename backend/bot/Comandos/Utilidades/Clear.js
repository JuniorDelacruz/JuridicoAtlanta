const Discord = require("discord.js")




module.exports = {
    name: "clear", // Coloque o nome do comando
    description: "Limpe mensagem do chat", // Coloque a descrição do comando
    type: Discord.ApplicationCommandType.ChatInput,
    options: [
        {
            name: "quantidade",
            description: "quantidade de mensagens a serem limpas",
            type: Discord.ApplicationCommandOptionType.Integer,

        },
        {
            name: "autor",
            description: "selecione o membro",
            type: Discord.ApplicationCommandOptionType.User,

        },
    ],

    

    run: async (client, interaction) => {
        const { options } = interaction;
        await interaction.deferReply({ ephemeral: true })

        if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
            interaction.editReply({ content: "Apenas administradores podem usar o comando!", ephemeral: true })
            return;
        }

        if (!interaction.channel?.isTextBased()) {
            interaction.editReply({ content: "Este não é um canal de texto Válido!", ephemeral: true })
            return
        }

        const amount = options.getInteger("quantidade") || 1;
        const mention = options.getMember("autor");
      

        if (mention) {
            const messages = await interaction.channel.messages.fetch();
            const filtered = messages.filter(a => a.author.id == mention.id)
           interaction.channel.bulkDelete(filtered.first(Math.min(amount, 100)))
                .then(cleared => interaction.editReply({
                    content: cleared.size
                        ? `${cleared.size} mensagem de ${mention} deletadas com sucesso!`
                        : `não há mensagens de ${mention} para serem deletadas`
                })).catch((error) => interaction.editReply({
                    content: `Não foi possível deletar a mensagem:\n\`\`\`js\n${error}\n\`\`\``
                }))
                   
            return
        }

        interaction.channel.bulkDelete(Math.min(amount, 100))
        .then(cleared => interaction.editReply({
            content: cleared.size
                ? `${cleared.size} mensagens deletadas com sucesso!`
                : `não há mensagens para serem deletadas`
        })).catch((error) => interaction.editReply({
            content:`Não foi possível deletar a mensagem:\n\`\`\`js\n${error}\n\`\`\``
        }))
            
    }
};