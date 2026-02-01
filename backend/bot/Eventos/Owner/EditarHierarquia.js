// Eventos/Owner/hierarquiaEditor.js

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

// Importe o client exportado (ajuste o caminho conforme sua estrutura real)
import { client } from '../../index.js';  // ou '../index.js', ou onde o client é exportado
 import db from '../../../models/index.js'
 const { HierarquiaConfig, Hierarquia } = db

// util: extrai IDs de cargos de uma string (IDs ou menções <@&id>)
function extractRoleIds(str) {
  return Array.from(new Set((str.match(/\d{5,}/g) || [])));
}

function buildEditorContent(cfgOrDraft) {
  return (
    `**Editando:** ${cfgOrDraft.name}\n` +
    `• Canal atual: ${cfgOrDraft.channelId ? `<#${cfgOrDraft.channelId}>` : "—"}\n` +
    `• Logs: ${cfgOrDraft.logChannelId ? `<#${cfgOrDraft.logChannelId}>` : "—"}\n` +
    `• Cargos: ${cfgOrDraft.roleIds?.map(id => `<@&${id}>`).join(", ") || "—"}\n` +
    `• CRON: \`${cfgOrDraft.cron || cfgOrDraft.scheduleCron}\`\n` +
    `• Status: ${cfgOrDraft.enabled ? "Ativo" : "Inativo"}`
  );
}

function buildEditorComponents(cfgId, draft) {
  const chSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`hierarquia_channel_${cfgId}`)
    .setPlaceholder("Canal de hierarquia")
    .addChannelTypes(ChannelType.GuildText);

  const logSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`hierarquia_log_${cfgId}`)
    .setPlaceholder("Canal de logs (opcional)")
    .addChannelTypes(ChannelType.GuildText);

  const btnEdit = new ButtonBuilder()
    .setCustomId(`hierarquia_modal_${cfgId}`)
    .setLabel("Editar nome/cargos/cron")
    .setStyle(ButtonStyle.Primary);

  const btnSave = new ButtonBuilder()
    .setCustomId(`hierarquia_save_${cfgId}`)
    .setLabel("Salvar alterações")
    .setStyle(ButtonStyle.Success);

  const btnToggle = new ButtonBuilder()
    .setCustomId(`hierarquia_toggle_${cfgId}`)
    .setLabel(draft.enabled ? "Desativar" : "Ativar")
    .setStyle(draft.enabled ? ButtonStyle.Danger : ButtonStyle.Secondary);

  return [
    new ActionRowBuilder().addComponents(chSelect),
    new ActionRowBuilder().addComponents(logSelect),
    new ActionRowBuilder().addComponents(btnEdit, btnSave, btnToggle)
  ];
}

client.on("interactionCreate", async (i) => {
  try {
    // Só processa interações relevantes para o editor
    if (
      !i.isStringSelectMenu() &&
      !i.isChannelSelectMenu() &&
      !i.isButton() &&
      !i.isModalSubmit()
    ) return;

    // Garante o Map de drafts
    if (!client.hierarquiaDrafts) client.hierarquiaDrafts = new Map();

    // 1) Seleção inicial da hierarquia (vem do comando editarhierarquia)
    if (i.isStringSelectMenu() && i.customId === "hierarquia_select") {
      const cfgId = Number(i.values[0]);
      const cfg = await HierarquiaConfig.findByPk(cfgId);
      if (!cfg) {
        return i.update({ content: "❌ Configuração não encontrada.", components: [] });
      }

      // Cria draft temporário para o usuário
      client.hierarquiaDrafts.set(i.user.id, {
        userId: i.user.id,
        cfgId,
        guildId: i.guild.id,
        name: cfg.name,
        roleIds: [...cfg.roleIds],
        cron: cfg.scheduleCron,
        channelId: cfg.channelId,
        logChannelId: cfg.logChannelId,
        enabled: cfg.enabled
      });

      const content = buildEditorContent({
        name: cfg.name,
        roleIds: cfg.roleIds,
        cron: cfg.scheduleCron,
        channelId: cfg.channelId,
        logChannelId: cfg.logChannelId,
        enabled: cfg.enabled
      });

      return i.update({
        content,
        components: buildEditorComponents(cfgId, cfg)
      });
    }

    // Pega o draft do usuário atual
    const draft = client.hierarquiaDrafts.get(i.user.id);
    if (!draft) return; // não está editando nada

    // 2) Seleção de canal principal
    if (i.isChannelSelectMenu() && i.customId === `hierarquia_channel_${draft.cfgId}`) {
      draft.channelId = i.values[0] || null;
      return i.update({
        content: buildEditorContent(draft),
        components: buildEditorComponents(draft.cfgId, draft)
      });
    }

    // 3) Seleção de canal de logs
    if (i.isChannelSelectMenu() && i.customId === `hierarquia_log_${draft.cfgId}`) {
      draft.logChannelId = i.values[0] || null;
      return i.update({
        content: buildEditorContent(draft),
        components: buildEditorComponents(draft.cfgId, draft)
      });
    }

    // 4) Botão → abre modal para editar nome, cargos e cron
    if (i.isButton() && i.customId === `hierarquia_modal_${draft.cfgId}`) {
      const modal = new ModalBuilder()
        .setCustomId(`hierarquia_modal_submit_${draft.cfgId}`)
        .setTitle("Editar Hierarquia");

      const tiName = new TextInputBuilder()
        .setCustomId("name")
        .setLabel("Nome da hierarquia")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(draft.name || "");

      const tiRoles = new TextInputBuilder()
        .setCustomId("roles")
        .setLabel("Cargos (IDs, separados por vírgula/espaço)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setValue((draft.roleIds || []).join(", "));

      const tiCron = new TextInputBuilder()
        .setCustomId("cron")
        .setLabel("CRON (ex.: 0 10 * * *)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(draft.cron || "");

      modal.addComponents(
        new ActionRowBuilder().addComponents(tiName),
        new ActionRowBuilder().addComponents(tiRoles),
        new ActionRowBuilder().addComponents(tiCron)
      );

      return i.showModal(modal);
    }

    // 5) Submit do modal
    if (i.isModalSubmit() && i.customId === `hierarquia_modal_submit_${draft.cfgId}`) {
      const name = i.fields.getTextInputValue("name").trim();
      const rolesRaw = i.fields.getTextInputValue("roles").trim();
      const cron = i.fields.getTextInputValue("cron").trim();

      const roleIds = extractRoleIds(rolesRaw);

      if (!name) return i.reply({ ephemeral: true, content: "❌ Nome inválido." });
      if (!roleIds.length) return i.reply({ ephemeral: true, content: "❌ Informe ao menos 1 cargo válido." });
      if (!cron) return i.reply({ ephemeral: true, content: "❌ CRON inválido." });

      draft.name = name;
      draft.roleIds = roleIds;
      draft.cron = cron;

      return i.reply({
        ephemeral: true,
        content: "✅ Campos atualizados no rascunho. Clique em **Salvar alterações**."
      });
    }

    // 6) Salvar alterações no banco
    if (i.isButton() && i.customId === `hierarquia_save_${draft.cfgId}`) {
      const notFound = (draft.roleIds || []).filter(id => !i.guild.roles.cache.has(id));
      if (notFound.length) {
        return i.update({
          content: `❌ Cargo(s) não encontrado(s): \`${notFound.join(", ")}\`\n\n` + buildEditorContent(draft),
          components: buildEditorComponents(draft.cfgId, draft)
        });
      }

      const cfg = await HierarquiaConfig.findByPk(draft.cfgId);
      if (!cfg) {
        return i.update({ content: "❌ Configuração não encontrada.", components: [] });
      }

      cfg.name = draft.name;
      cfg.roleIds = draft.roleIds;
      cfg.scheduleCron = draft.cron;
      cfg.channelId = draft.channelId || null;
      cfg.logChannelId = draft.logChannelId || null;
      await cfg.save();

      // Re-agenda o cron job
      await client.hierarquiaReschedule?.(cfg.id);

      draft.enabled = cfg.enabled;

      return i.update({
        content: `✅ Alterações salvas e cron re-agendado.\n\n` + buildEditorContent(draft),
        components: buildEditorComponents(draft.cfgId, draft)
      });
    }

    // 7) Toggle Ativar/Desativar
    if (i.isButton() && i.customId === `hierarquia_toggle_${draft.cfgId}`) {
      const cfg = await HierarquiaConfig.findByPk(draft.cfgId);
      if (!cfg) {
        return i.update({ content: "❌ Configuração não encontrada.", components: [] });
      }

      cfg.enabled = !cfg.enabled;
      await cfg.save();

      await client.hierarquiaReschedule?.(cfg.id);

      draft.enabled = cfg.enabled;

      return i.update({
        content: `Status: **${cfg.enabled ? "Ativado" : "Desativado"}**.\n\n` + buildEditorContent(draft),
        components: buildEditorComponents(draft.cfgId, draft)
      });
    }
  } catch (e) {
    console.error("hierarquiaEditor handler error:", e);
    try {
      if (i.isRepliable()) {
        const content = "❌ Ocorreu um erro.";
        if (!i.replied && !i.deferred) {
          await i.reply({ content, ephemeral: true });
        } else {
          await i.editReply({ content });
        }
      }
    } catch {}
  }
});