// Commands/Slash/rodarhierarquia.js

import {
  ApplicationCommandType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType
} from 'discord.js';
import db from '../../../models/index.js'
import { hierarquiaRunNow } from '../../Eventos/HIERARQUIA/Hierarquia.js';
const { HierarquiaConfig, Hierarquia } = db

export default {
  name: "rodarhierarquia",
  description: "Executa agora a atualização de uma hierarquia (ignora o cron).",
  type: ApplicationCommandType.ChatInput,
  options: [],

  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.editReply({
        content: `Você não possui permissão para utilizar este comando.`,
        ephemeral: true
      });
    }

    // Carrega as configs deste servidor
    const configs = await HierarquiaConfig.findAll({
      where: { guildId: interaction.guild.id }
    }).catch(() => []);

    if (!configs.length) {
      return interaction.editReply({
        content: "⚠️ Não há hierarquias criadas neste servidor.",
        ephemeral: true
      });
    }

    // Monta o select menu
    const menu = new StringSelectMenuBuilder()
      .setCustomId("run_now_hierarchy")
      .setPlaceholder("Selecione a hierarquia para atualizar agora")
      .addOptions(
        configs.slice(0, 25).map(c => ({
          label: c.name.slice(0, 90),
          value: String(c.id),
          description: `Cargos: ${Array.isArray(c.roleIds) ? c.roleIds.length : 0}`.slice(0, 100)
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    // Responde com o menu (ephemeral)
    await interaction.editReply({
      content: "Escolha a hierarquia que deseja executar agora:",
      components: [row],
      ephemeral: true
    });

    try {
      // Aguarda a interação do select (60 segundos)
      const sel = await interaction.channel.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 60_000,
        filter: (i) =>
          i.user.id === interaction.user.id &&
          i.customId === "run_now_hierarchy"
      });

      const cfgId = Number(sel.values[0]);

      // Atualiza a mensagem original removendo o menu e mostrando "executando"
      await sel.update({
        content: "⏳ Executando atualização agora...",
        components: []
      });

      try {
        console.log(`[rodarhierarquia] Iniciando execução manual da config #${cfgId} por ${interaction.user.tag}`);

        if (typeof hierarquiaRunNow === "function") {
          await hierarquiaRunNow(cfgId);  // ← mantenha o await aqui
        } else {
          const { runHierarchyForConfig } = await import("../../Eventos/HIERARQUIA/Hierarquia.js");
          const cfg = await HierarquiaConfig.findByPk(cfgId);
          if (cfg) await runHierarchyForConfig(client, cfg);
        }

        console.log(`[rodarhierarquia] Execução da config #${cfgId} finalizada com sucesso`);

        await interaction.followUp({
          content: `✅ Hierarquia **#${cfgId}** atualizada com sucesso.`,
          ephemeral: true
        });
      } catch (e) {
        console.error(`[rodarhierarquia] Erro na execução da config #${cfgId}:`, e);
        await interaction.followUp({
          content: `❌ Erro ao atualizar hierarquia #${cfgId}: ${e.message || "desconhecido"}`,
          ephemeral: true
        });
      }

    } catch (e) {
      // Timeout ou erro
      if (e?.message?.toLowerCase?.().includes("time")) {
        await interaction.editReply({
          content: "⏰ Tempo esgotado. Tente novamente.",
          components: []
        });
        return;
      }

      console.error("Erro em rodarhierarquia:", e);
      await interaction.editReply({
        content: "❌ Ocorreu um erro ao executar a atualização.",
        components: []
      });
    }
  }
};