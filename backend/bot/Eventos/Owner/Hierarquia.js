// Eventos/Owner/Hierarquia.js  (ou o nome que você usa)

import cron from 'node-cron';
import { Client } from 'discord.js';

// Importe o client exportado (ajuste o caminho conforme sua estrutura)
import { client } from '../../index.js';  // ou '../index.js', etc.
import db from '../../../models/index.js'
const { HierarquiaConfig, Hierarquia } = db

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
    if (!guild) {
      console.warn(`[hierarquia] Guild ${guildId} não encontrada para config #${configId}`);
      return;
    }

    console.log(`[hierarquia] Iniciando execução da config #${configId} - "${name}" no servidor ${guild.name} (${guild.id})`);

    const roleMembersMap = new Map();
    const currentMembers = [];

    // Processa cada cargo individualmente (fetch otimizado)
    for (const roleId of roleIds) {
      let role = guild.roles.cache.get(roleId);

      if (!role) {
        role = await guild.roles.fetch(roleId).catch(err => {
          console.error(`[hierarquia] Erro ao fetch cargo ${roleId}:`, err);
          return null;
        });
        if (!role) continue;
      }

      console.log(`[hierarquia] Processando cargo ${role.name} (${roleId}) - ${role.members.size} membros em cache inicial`);

      // Se o cache do cargo estiver vazio ou muito pequeno, faz fetch específico
      if (role.members.size < 5) {  // ajuste o número se quiser ser mais agressivo
        try {
          console.log(`[hierarquia] Fazendo fetch específico para membros do cargo ${role.name}`);
          const fetched = await guild.members.fetch({ user: role.members.keys() }).catch(err => {
            console.error(`[hierarquia] Falha no fetch específico do cargo ${roleId}:`, err);
            return role.members;
          });

          // Atualiza o cache do role
          role.members = fetched;
          console.log(`[hierarquia] Fetch específico concluído: ${fetched.size} membros para ${role.name}`);
        } catch (err) {
          console.error(`[hierarquia] Erro geral no fetch do cargo ${roleId}:`, err);
        }
      }

      const membersWithRole = role.members.map(m => ({
        userId: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        roleId
      })).filter(m => m.userId); // filtra possíveis nulos

      console.log(`[hierarquia] Encontrados ${membersWithRole.length} membros no cargo ${role.name}`);

      roleMembersMap.set(roleId, membersWithRole);
      currentMembers.push(...membersWithRole);
    }

    console.log(`[hierarquia] Total de membros atuais encontrados: ${currentMembers.length}`);

    // Compara com snapshot do banco
    const dbMembers = await client.db.Hierarquia.findAll({ where: { configId } });
    const dbMap = new Map(dbMembers.map(m => [m.userId, m]));

    for (const cm of currentMembers) {
      if (dbMap.has(cm.userId)) dbMap.delete(cm.userId);
    }
    const removedMembers = [...dbMap.values()];

    // Aviso de removidos
    if (logChannelId) {
      const chLog = await client.channels.fetch(logChannelId).catch(() => null);
      if (chLog?.isTextBased()) {
        if (removedMembers.length > 0) {
          let removedText = `## Membros que perderam cargos em **${name}** (${removedMembers.length}):\n\n`;
          removedText += removedMembers
            .map(m => `- <@${m.userId}> (ID: ${m.userId}) — Cargo: <@&${m.roleId}>`)
            .join("\n");
          await sendMessageInParts(chLog, removedText);
        } else {
          await chLog.send(`Nenhum membro perdeu cargos em **${name}** desta vez.`).catch(() => { });
        }
      }
    }

    // Limpa e grava novo snapshot
    await client.db.Hierarquia.destroy({ where: { configId } });
    if (currentMembers.length > 0) {
      await client.db.Hierarquia.bulkCreate(currentMembers.map(m => ({ ...m, configId })));
      console.log(`[hierarquia] Snapshot atualizado: ${currentMembers.length} membros salvos`);
    } else {
      console.log(`[hierarquia] Nenhum membro encontrado - snapshot limpo`);
    }

    // Limpa mensagens antigas do bot no canal
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      console.warn(`[hierarquia] Canal ${channelId} inválido ou não encontrado`);
      return;
    }

    try {
      const msgs = await channel.messages.fetch({ limit: 90 });
      const botMsgs = msgs.filter(m => m.author.id === client.user.id);
      if (botMsgs.size > 0) {
        await channel.bulkDelete(botMsgs, true).catch(err => {
          console.warn(`[hierarquia] Erro ao bulkDelete mensagens antigas:`, err);
        });
        console.log(`[hierarquia] ${botMsgs.size} mensagens antigas deletadas`);
      }
    } catch (err) {
      console.warn(`[hierarquia] Erro ao limpar mensagens antigas:`, err);
    }

    // Monta e envia a hierarquia
    let hierarchyText = `# ・・・ HIERARQUIA ${name.toUpperCase()} ・・・\n\n`;
    for (const [roleId, membersWithRole] of roleMembersMap.entries()) {
      const role = guild.roles.cache.get(roleId);
      if (!role) continue;

      hierarchyText += `### ${role.toString()} (${membersWithRole.length} membros)\n` +
        (membersWithRole.length > 0
          ? membersWithRole.map(m => `<@${m.userId}>`).join("\n")
          : "・・・ Nenhum membro no momento") +
        "\n\n";
    }
    hierarchyText += `# ・・・ FIM DA HIERARQUIA ・・・`;

    await sendMessageInParts(channel, hierarchyText);
    console.log(`[hierarquia] Hierarquia postada com sucesso no canal ${channelId}`);

    // Atualiza lastRun
    configRow.lastRunAt = new Date();
    await configRow.save();
  } catch (e) {
    console.error(`Erro crítico ao executar hierarquia #${configRow?.id || 'desconhecida'}:`, e);
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
export async function hierarquiaRunNow(configId) {
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

