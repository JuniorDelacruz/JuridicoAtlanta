// Commands/Slash/editarhierarquia.js

import {
  ApplicationCommandType,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder
} from 'discord.js';
 import db from '../../../models/index.js'
 const { HierarquiaConfig, Hierarquia } = db

export default {
  name: "editarhierarquia",
  description: "Edita uma hierarquia existente (nome, cargos, canal, cron).",
  type: ApplicationCommandType.ChatInput,
  options: [],

  run: async (client, interaction) => {
    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.editReply({ 
          content: "Você não possui permissão para utilizar este comando.", 
          ephemeral: true 
        });
      }

      const configs = await HierarquiaConfig.findAll({ 
        where: { guildId: interaction.guild.id } 
      });

      if (!configs.length) {
        return interaction.editReply({ 
          content: "⚠️ Não há hierarquias criadas neste servidor.", 
          ephemeral: true 
        });
      }

      // Garante que o Map de drafts exista
      if (!client.hierarquiaDrafts) {
        client.hierarquiaDrafts = new Map();
      }

      // Monta o menu de seleção
      const menu = new StringSelectMenuBuilder()
        .setCustomId("hierarquia_select")
        .setPlaceholder("Selecione uma hierarquia para editar")
        .addOptions(
          configs.slice(0, 25).map(c => ({
            label: c.name.slice(0, 90),
            value: String(c.id),
            description: `Cargos: ${c.roleIds.length} • CRON: ${c.scheduleCron}`.slice(0, 100)
          }))
        );

      const row = new ActionRowBuilder().addComponents(menu);

      // Responde com o menu (ephemeral)
      await interaction.editReply({
        ephemeral: true,
        content: "Escolha a hierarquia que deseja editar:",
        components: [row]
      });

    } catch (err) {
      console.error("Erro em editarhierarquia (slash):", err);

      // Tenta responder mesmo se já tiver respondido/deferido
      const content = "❌ Ocorreu um erro ao executar o comando.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content, ephemeral: true }).catch(() => {});
      }
    }
  }
};