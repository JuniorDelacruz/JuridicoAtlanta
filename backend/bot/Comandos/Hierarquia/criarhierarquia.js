// arquivo: Comandos/admin/criarhierarquia.js   (ou onde você guardar)

import { ApplicationCommandType, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
 import db from '../../../models/index.js'
 const { HierarquiaConfig, Hierarquia } = db

export default {
  name: "criarhierarquia",
  description: "Cria uma nova configuração de Hierarquia (nome, cargos, canal, cron).",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "nome",
      description: "Nome da hierarquia (ex.: Angels Wanted)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "cargos",
      description: "Mencione os cargos separados por vírgula (ex.: @Wanted, @Gerente, @Elite)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "canal",
      description: "Canal onde a hierarquia será postada",
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
    {
      name: "canal_log",
      description: "Canal de logs (opcional) para avisar quando alguém perde cargo",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
    {
      name: "cron",
      description: "Expressão CRON (padrão: 0 10 * * *)",
      type: ApplicationCommandOptionType.String,
      required: false,
    }
  ],

  run: async (client, interaction) => {
    
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.editReply({ 
        content: `Você não possui permissão para utilizar este comando.`, 
        ephemeral: true 
      });
    }

    const nome = interaction.options.getString("nome", true).trim();
    const cargosStr = interaction.options.getString("cargos", true);
    const canal = interaction.options.getChannel("canal", true);
    const canalLog = interaction.options.getChannel("canal_log", false);
    const cronExp = (interaction.options.getString("cron", false) || "0 10 * * *").trim();

    if (!canal?.isTextBased()) {
      return interaction.editReply({ 
        content: "❌ O canal informado precisa ser de texto.", 
        ephemeral: true 
      });
    }
    if (canalLog && !canalLog.isTextBased()) {
      return interaction.editReply({ 
        content: "❌ O canal de logs precisa ser de texto.", 
        ephemeral: true 
      });
    }

    // —— PARSE DE MENÇÕES/IDs SEPARADOS POR VÍRGULA ——
    const mentionRegex = /<@&(\d{17,20})>/g;
    const rawParts = cargosStr.split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const roleIds = new Set();

    for (const token of rawParts) {
      // tenta pegar como menção <@&id>
      let matched = false;
      let m;
      while ((m = mentionRegex.exec(token)) !== null) {
        roleIds.add(m[1]);
        matched = true;
      }
      if (matched) continue;

      // tenta pegar números "puros" colados
      const onlyDigits = token.replace(/[^\d]/g, "");
      if (/^\d{17,20}$/.test(onlyDigits)) {
        roleIds.add(onlyDigits);
        continue;
      }

      // tenta resolver por nome (caso alguém digite o nome do cargo)
      const byName = interaction.guild.roles.cache.find(r => 
        r.name.toLowerCase() === token.toLowerCase()
      );
      if (byName) roleIds.add(byName.id);
    }

    const finalRoleIds = Array.from(roleIds);
    if (!finalRoleIds.length) {
      return interaction.editReply({
        content: "❌ Informe ao menos **1** cargo válido (mencione-os separados por vírgula).",
        ephemeral: true
      });
    }

    // valida se existem na guild
    const notFound = finalRoleIds.filter(id => !interaction.guild.roles.cache.has(id));
    if (notFound.length) {
      return interaction.editReply({
        content: `❌ Cargo(s) não encontrado(s) no servidor: \`${notFound.join(", ")}\``,
        ephemeral: true
      });
    }

    // —— SALVA NO DB ——
    const row = await HierarquiaConfig.create({
      guildId: interaction.guild.id,
      name: nome,
      roleIds: finalRoleIds,
      channelId: canal.id,
      logChannelId: canalLog?.id || null,
      scheduleCron: cronExp,
      enabled: true
    });

    // re-agenda cron se o scheduler estiver ligado
    await client.hierarquiaReschedule?.(row.id);

    return interaction.editReply({
      ephemeral: true,
      content:
        `✅ Hierarquia **${nome}** criada!\n` +
        `• Cargos: ${finalRoleIds.map(id => `<@&${id}>`).join(", ")}\n` +
        `• Canal: <#${row.channelId}> ${row.logChannelId ? `• Logs: <#${row.logChannelId}>` : ""}\n` +
        `• CRON: \`${row.scheduleCron}\`\n` +
        `ID: \`${row.id}\``
    });
  }
};