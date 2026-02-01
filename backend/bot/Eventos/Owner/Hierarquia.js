// Eventos/Owner/Hierarquia.js  (ou o nome que você usa)

import cron from 'node-cron';
import { Client } from 'discord.js';

// Importe o client exportado (ajuste o caminho conforme sua estrutura)
import { client } from '../../index.js';  // ou '../index.js', etc.
import db from '../../../models/index.js'
import { HierarquiaConfig, Hierarquia } from db

// Divide e envia mensagens grandes em partes (até 2000 chars)
async function sendMessageInParts(channel, content, maxLength = 2000) {
  const lines = content.split("\n");
  let part = "";
  for (const line of lines) {
    if ((part + line + "\n").length > maxLength) {
      await channel.send(part.trim()).catch(() => { });
      part = "";
    }
    part += line + "\n";
  }
  if (part.trim()) await channel.send(part.trim()).catch(() => { });
}

/**
 * Executa a coleta e postagem de uma única hierarquia (por config)
 */
export async function runHierarchyForConfig(client, configRow) {
  try {
    const { id: configId, guildId, name, roleIds, channelId, logChannelId } = configRow;

    const guild = await client.guilds.fetch(guildId);
    if (!guild) return;

    // Pre-cache members (uma vez por execução)
    await guild.members.fetch().catch(() => { });

    const roleMembersMap = new Map();
    const currentMembers = [];

    // Mapeia membros por cargo
    for (const roleId of roleIds) {
      const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
      if (!role) continue;

      const membersWithRole = role.members.map(m => ({
        userId: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        roleId
      }));

      roleMembersMap.set(roleId, membersWithRole);
      currentMembers.push(...membersWithRole);
    }

    // Compara com snapshot do banco
    const dbMembers = await Hierarquia.findAll({ where: { configId } });
    const dbMap = new Map(dbMembers.map(m => [m.userId, m]));

    // Remove "presentes" do mapa → sobram os removidos
    for (const cm of currentMembers) {
      if (dbMap.has(cm.userId)) dbMap.delete(cm.userId);
    }
    const removedMembers = [...dbMap.values()];

    // Aviso de removidos (se houver logChannel)
    if (logChannelId) {
      const chLog = await client.channels.fetch(logChannelId).catch(() => null);
      if (chLog) {
        if (removedMembers.length > 0) {
          let removedText = `## Membros que perderam cargos em **${name}**:\n\n`;
          removedText += removedMembers
            .map(m => `- <@${m.userId}> (ID: ${m.userId}) — Cargo: <@&${m.roleId}>`)
            .join("\n");
          await sendMessageInParts(chLog, removedText);
        } else {
          await chLog.send(`Nenhum membro perdeu cargos em **${name}** desta vez.`).catch(() => { });
        }
      }
    }

    // Limpa snapshot antigo e grava o novo (apenas desta config)
    await Hierarquia.destroy({ where: { configId } });
    if (currentMembers.length) {
      await Hierarquia.bulkCreate(currentMembers.map(m => ({ ...m, configId })));
    }

    // Limpa mensagens anteriores do bot no canal alvo
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const msgs = await channel.messages.fetch({ limit: 90 }).catch(() => null);
    if (msgs) {
      for (const msg of msgs.values()) {
        if (msg.author?.id === client.user.id) {
          await msg.delete().catch(() => { });
        }
      }
    }

    // Monta texto da hierarquia
    let hierarchyText = `# ・・・ HIERARQUIA ${name} ・・・\n\n`;
    for (const [roleId, membersWithRole] of roleMembersMap.entries()) {
      const role = guild.roles.cache.get(roleId);
      if (!role) continue;
      hierarchyText += `### ${role.toString()} (${membersWithRole.length} membros)\n` +
        (membersWithRole.length > 0 ? membersWithRole.map(m => `<@${m.userId}>`).join("\n") : "・・・") +
        "\n\n";
    }
    hierarchyText += `# ・・・ FIM DA HIERARQUIA ・・・`;

    // Envia
    await sendMessageInParts(channel, hierarchyText);

    // Atualiza lastRun
    configRow.lastRunAt = new Date();
    await configRow.save();
  } catch (e) {
    console.error(`Erro ao executar hierarquia #${configRow?.id}:`, e);
  }
}

/* =========================
   Orquestração + watcher
   ========================= */
client.hierarquiaJobs = new Map(); // idConfig → cron.Job
client.hierarquiaCache = new Map(); // idConfig → assinatura (string)
client.hierarquiaWatchLock = false;  // evita corridas
client.hierarquiaWatcher = null;

/** Assinatura determinística da config (para detectar mudanças) */
function getConfigSignature(cfg) {
  const roleIds = Array.isArray(cfg.roleIds) ? [...cfg.roleIds].sort() : [];
  return JSON.stringify({
    enabled: !!cfg.enabled,
    scheduleCron: String(cfg.scheduleCron || ""),
    channelId: String(cfg.channelId || ""),
    logChannelId: String(cfg.logChannelId || ""),
    guildId: String(cfg.guildId || ""),
    name: String(cfg.name || ""),
    roleIds
  });
}

/** (Re)agenda um job isolado a partir do ID da config */
client.hierarquiaReschedule = async (configId) => {
  try {
    const old = client.hierarquiaJobs.get(configId);
    if (old) { old.stop(); client.hierarquiaJobs.delete(configId); }

    const cfg = await HierarquiaConfig.findByPk(configId);
    if (!cfg || !cfg.enabled) return;

    const cronExpr = cron.validate(cfg.scheduleCron || "") ? cfg.scheduleCron : "0 10 * * *";
    if (!cron.validate(cfg.scheduleCron || "")) {
      console.warn(`Hierarquia #${configId}: cron inválido "${cfg.scheduleCron}". Usando "0 10 * * *".`);
    }

    const job = cron.schedule(cronExpr, () => runHierarchyForConfig(client, cfg));
    client.hierarquiaJobs.set(cfg.id, job);
  } catch (e) {
    console.error("Erro ao re-agendar hierarquia:", e);
  }
};

/** Executa uma config manualmente (usado no comando /rodarhierarquia) */
client.hierarquiaRunNow = async (configId) => {
  const cfg = await HierarquiaConfig.findByPk(configId).catch(() => null);
  if (cfg) return runHierarchyForConfig(client, cfg);
};

/** Carrega/atualiza TODOS os jobs conforme o banco */
async function refreshJobsFromDB(initial = false) {
  const rows = await HierarquiaConfig.findAll().catch(() => []);
  const seen = new Set();

  for (const cfg of rows) {
    const id = cfg.id;
    seen.add(id);
    const sig = getConfigSignature(cfg);
    const prevSig = client.hierarquiaCache.get(id);
    const hasJob = client.hierarquiaJobs.has(id);

    if (!cfg.enabled) {
      if (hasJob) {
        client.hierarquiaJobs.get(id)?.stop();
        client.hierarquiaJobs.delete(id);
      }
      client.hierarquiaCache.set(id, sig);
      continue;
    }

    const cronExpr = cron.validate(cfg.scheduleCron || "") ? cfg.scheduleCron : "0 10 * * *";
    if (!cron.validate(cfg.scheduleCron || "")) {
      console.warn(`Hierarquia #${id}: cron inválido "${cfg.scheduleCron}". Usando "0 10 * * *".`);
    }

    if (!prevSig) {
      const job = cron.schedule(cronExpr, () => runHierarchyForConfig(client, cfg));
      client.hierarquiaJobs.set(id, job);
      client.hierarquiaCache.set(id, sig);
      continue;
    }

    if (prevSig !== sig) {
      await client.hierarquiaReschedule(id);
      client.hierarquiaCache.set(id, sig);
    }
  }

  // Limpa jobs de configs removidas
  for (const id of Array.from(client.hierarquiaJobs.keys())) {
    if (!seen.has(id)) {
      client.hierarquiaJobs.get(id)?.stop();
      client.hierarquiaJobs.delete(id);
      client.hierarquiaCache.delete(id);
    }
  }

  if (initial) {
    console.log(`Hierarquia Scheduler: ${client.hierarquiaJobs.size} job(s) ativo(s).`);
  }
}

/** Inicia no ready + watcher de 10s */
client.on("ready", async () => {
  console.log("Hierarquia Scheduler ligado.");

  await refreshJobsFromDB(true);

  if (client.hierarquiaWatcher) clearInterval(client.hierarquiaWatcher);
  client.hierarquiaWatcher = setInterval(async () => {
    if (client.hierarquiaWatchLock) return;
    client.hierarquiaWatchLock = true;
    try {
      await refreshJobsFromDB(false);
    } catch (e) {
      console.error("Watcher Hierarquia erro:", e);
    } finally {
      client.hierarquiaWatchLock = false;
    }
  }, 10_000); // 10 segundos
});

// Encerramento gracioso (opcional)
process.on("SIGINT", () => {
  if (client.hierarquiaWatcher) clearInterval(client.hierarquiaWatcher);
});
process.on("SIGTERM", () => {
  if (client.hierarquiaWatcher) clearInterval(client.hierarquiaWatcher);
});

