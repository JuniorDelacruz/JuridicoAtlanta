// backend/utils/discordWebhook.js
import axios from "axios";
import db from "../models/index.js";
import { botSendMessage, botSetNickname } from "./discordBotSend.js";
import { buildNickname } from "./nickname.js";
import { client } from "../bot/index.js";

const { WebhookConfig, Requerimento } = db;

/**
 * Tipos oficiais (padroniza as chaves)
 */
export const WEBHOOK_TYPES = {
  CADASTRO_CIDADAO: "cadastroCidadao",
  PORTE_ARMA: "porteArma",
  REGISTRO_ARMA: "registroArma",
  TROCA_NOME: "trocaNome",
  CASAMENTO: "casamento",
  DIVORCIO: "divorcio",
  LIMPEZA_FICHA: "limpezaFicha",
  PORTE_SUSPENSO: "porteSuspenso",
  ALVARA: "alvara",
  CARIMBO_PORTE_ARMA: "carimboPorteArma",
  RENOVACAO_ALVARA: "renovacaoAlvara",
};

/**
 * Helpers
 */
const safe = (val) => (val === undefined || val === null || val === "" ? "—" : String(val));

const safeJoin = (val, sep = `,\n`) => {
  if (val === undefined || val === null) return "—";
  if (Array.isArray(val)) return val.length ? val.join(sep) : "—";
  const s = String(val).trim();
  if (!s) return "—";
  return s.replace(/,\s*/g, sep);
};

const mentionUser = (discordId) => {
  const id = String(discordId ?? "").trim();
  return /^\d{5,25}$/.test(id) ? `<@${id}>` : safe(discordId);
};

function isDiscordId(v) {
  return /^\d{5,25}$/.test(String(v ?? "").trim());
}

/**
 * =========================
 *  DISCORD FORUM HELPERS
 * =========================
 */

async function fetchChannelSafe(channelId) {
  if (!client?.isReady?.()) throw new Error("Bot ainda não está pronto.");
  if (!isDiscordId(channelId)) throw new Error("channelId inválido.");
  return client.channels.fetch(String(channelId)).catch(() => null);
}

async function botCreateForumPost(forumChannelId, { title, message, appliedTags = [] }) {
  const ch = await fetchChannelSafe(forumChannelId);

  // discord.js v14: ForumChannel type = 15
  // Mas em runtime é mais seguro validar se tem .threads.create
  if (!ch || !ch.threads?.create) {
    throw new Error("Canal não é fórum ou não suporta criar threads.");
  }

  const thread = await ch.threads.create({
    name: title?.slice(0, 100) || "Requerimento",
    message, // { content, embeds, components }
    appliedTags: Array.isArray(appliedTags) ? appliedTags.filter(Boolean) : [],
  });

  return thread; // ThreadChannel
}

async function botSendToThread(threadId, payload) {
  const thread = await fetchChannelSafe(threadId);
  if (!thread || !thread.isTextBased?.()) throw new Error("Thread inválida ou não-texto.");
  return thread.send(payload);
}

/**
 * Atualiza tags do post (Thread do fórum)
 * - Em discord.js v14: thread.setAppliedTags([...tagIds])
 */
async function botEditThreadTags(threadId, tagIds = []) {
  const thread = await fetchChannelSafe(threadId);
  if (!thread || typeof thread.setAppliedTags !== "function") {
    throw new Error("Thread não suporta tags (não é post de fórum?).");
  }
  await thread.setAppliedTags(Array.isArray(tagIds) ? tagIds.filter(Boolean) : []);
  return { ok: true, threadId: String(threadId), tags: tagIds };
}

/**
 * =========================
 *  DESTINO (DB + fallback)
 * =========================
 *
 * Seu banco hoje salva "url" mas na real é ID de canal.
 * Vamos tratar assim:
 * - WebhookConfig.url pode ser:
 *   - um Discord channelId (texto)  ✅ (seu caso)
 *   - ou uma URL webhook https://discord.com/api/webhooks/... (se algum dia usar)
 *
 * E vamos permitir modo forum via WebhookConfig.mode = "forum"
 * + opcional: tag ids no banco
 */
async function resolveDest(type) {
  // default fallback
  const fallback = {
    mode: "channel", // channel | webhook | forum
    channelId: process.env.DISCORD_CHANNEL_DEFAULT,
    webhookUrl: process.env.DISCORD_WEBHOOK_DEFAULT,
    forumChannelId: process.env.DISCORD_FORUM_DEFAULT,
    tags: {},
  };

  // 1) Banco
  try {
    if (WebhookConfig) {
      const row = await WebhookConfig.findOne({ where: { tipo: type } });
      if (row && row.enabled) {
        const raw = String(row.url || "").trim();

        // modo explicitamente setado no banco
        const mode = String(row.mode || "").trim().toLowerCase();

        // tags opcionais (se existir no model)
        const tags = row.tags || row.tagConfig || {};

        // se for forum
        if (mode === "forum") {
          return {
            mode: "forum",
            forumChannelId: raw,
            tags,
          };
        }

        // se for webhook URL de verdade
        if (/^https?:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\//i.test(raw)) {
          return { mode: "webhook", webhookUrl: raw, tags };
        }

        // caso normal: channelId (seu caso)
        return { mode: "channel", channelId: raw, tags };
      }
    }
  } catch (e) {
    console.error("[discordWebhook] falha ao buscar destino no banco:", e?.message || e);
  }

  // 2) fallback env (simples)
  return fallback;
}

/**
 * =========================
 *  EMBEDS / POSTS BUILDERS
 * =========================
 */
function buildEmbed(type, data) {
  const base = {
    color: 0x2ecc71,
    thumbnail: { url: "https://i.imgur.com/A22LhtG.png" },
    timestamp: new Date().toISOString(),
    author: { name: "Jurídico Atlanta RP", icon_url: "https://i.imgur.com/A22LhtG.png" },
  };

  switch (type) {
    case WEBHOOK_TYPES.CADASTRO_CIDADAO: {
      return {
        ...base,
        title: "CADASTRO DE CIDADÃO",
        footer: { text: `Aprovado por: ${safe(data?.aprovadoPor)}` },
        description: `CADASTRO DE CIDADÃO Nº ${safe(data?.dados?.id)}`,
        image: { url: data?.imagemIdentidade },
        fields: [
          { name: "Nome Completo", value: `\`${safe(data?.dados?.nomeCompleto)}\``, inline: false },
          { name: "Pombo", value: safe(data?.dados?.pombo), inline: false },
          { name: "Identidade", value: safe(data?.dados?.identidade), inline: false },
          { name: "Profissão", value: safe(data?.dados?.profissao), inline: false },
          { name: "Residência", value: safe(data?.dados?.residencia), inline: false },
          { name: "ID Discord", value: mentionUser(data?.dados?.discordId), inline: false },
        ],
      };
    }

    case WEBHOOK_TYPES.REGISTRO_ARMA: {
      return {
        ...base,
        color: 0x3498db,
        title: "REGISTRO DE ARMA",
        footer: { text: `Aprovado por: ${safe(data?.aprovadoPor)}` },
        description: `REGISTRO Nº ${safe(data?.id)}`,
        fields: [
          { name: "NOME DO PORTADOR", value: `\`${safe(data?.nomeCompleto)}\``, inline: false },
          { name: "ID Discord", value: mentionUser(data?.discordId), inline: false },
          { name: "Arma", value: safe(data?.arma), inline: true },
          { name: "Serial", value: safe(data?.serial), inline: true },
          { name: "Status", value: safe(data?.status), inline: true },
          { name: "Aprovado por", value: safe(data?.aprovadoPor), inline: false },
        ],
      };
    }

    case WEBHOOK_TYPES.PORTE_ARMA: {
      return {
        ...base,
        color: 0xf1c40f,
        title: "PORTE DE ARMA APROVADO",
        footer: { text: `Aprovado por: ${safe(data?.aprovadoPor)}` },
        description: `**Requerimento Nº ${safe(data?.id)}**`,
        fields: [
          { name: "NOME COMPLETO", value: `\`${safe(data?.nomeCompleto)}\``, inline: true },
          { name: "REGISTRO CARTÓRIO", value: `\`${safe(data?.registro)}\``, inline: true },
          { name: "POMBO", value: `\`${safe(data?.pombo)}\``, inline: false },
          { name: "VALIDADE", value: `\`${safe(data?.validade)}\``, inline: false },
          { name: "ARMAMENTOS APROVADOS", value: `\`${safeJoin(data?.arma)}\``, inline: false },
          {
            name: "STATUS",
            value:
              `\`APROVADO\`\n\n` +
              `Declaração válida enquanto mantidas as condições legais.\n` +
              `**Blackwater**,\n**Dr.(a) ${safe(data?.aprovadoPor)}**\n*Juíz(a) Federal*`,
            inline: true,
          },
        ],
      };
    }

    case WEBHOOK_TYPES.TROCA_NOME: {
      return {
        ...base,
        color: 0xf1c40f,
        title: "REGISTRO DE NOME APROVADO",
        description: `**Requerimento Nº ${safe(data?.id)}**`,
        fields: [
          { name: "NOME ANTERIOR", value: `\`${safe(data?.nomeCompleto)}\``, inline: true },
          { name: "REGISTRO CARTÓRIO", value: `\`${safe(data?.registro)}\``, inline: true },
          { name: "POMBO", value: `\`${safe(data?.pombo)}\``, inline: false },
          { name: "NOVO NOME", value: `\`${safe(data?.novoNome)}\``, inline: false },
          {
            name: "STATUS",
            value:
              `\`APROVADO\`\n\n` +
              `**Blackwater**,\n**Dr.(a) ${safe(data?.aprovadoPor)}**\n*Juíz(a) Federal*`,
            inline: true,
          },
        ],
      };
    }

    case WEBHOOK_TYPES.CASAMENTO: {
      return {
        ...base,
        color: 0xf1c40f,
        title: "REGISTRO DE CASAMENTO APROVADO",
        footer: { text: `Aprovado por: ${safe(data?.aprovadoPor)}` },
        description: `**Requerimento Nº ${safe(data?.id)}**`,
        fields: [
          { name: "NOIVO", value: `${safe(data?.noivo?.nomeCompleto)} (CID: ${safe(data?.noivo?.registro)})` },
          { name: "NOIVA", value: `${safe(data?.noiva?.nomeCompleto)} (CID: ${safe(data?.noiva?.registro)})` },
          { name: "TESTEMUNHA 1", value: `${safe(data?.testemunhas?.[0]?.nomeCompleto)} (CID: ${safe(data?.testemunhas?.[0]?.registro)})` },
          { name: "TESTEMUNHA 2", value: `${safe(data?.testemunhas?.[1]?.nomeCompleto)} (CID: ${safe(data?.testemunhas?.[1]?.registro)})` },
          {
            name: "TESTEMUNHA 3",
            value:
              `${safe(data?.testemunhas?.[2]?.nomeCompleto)} (CID: ${safe(data?.testemunhas?.[2]?.registro)})\n\n` +
              `**Blackwater**,\n**Dr.(a) ${safe(data?.aprovadoPor)}**\n*Juíz(a) Federal*`,
          },
        ],
      };
    }

    default: {
      return {
        ...base,
        color: 0x95a5a6,
        title: "REQUERIMENTO",
        description: `Tipo: ${safe(type)} • ID: ${safe(data?.id)}`,
        fields: [
          { name: "Solicitante", value: safe(data?.nomeCompleto || data?.nome || data?.author), inline: false },
          { name: "ID Discord", value: mentionUser(data?.discordId), inline: false },
          {
            name: "Dados",
            value: "```json\n" + JSON.stringify(data ?? {}, null, 2).slice(0, 900) + "\n```",
            inline: false,
          },
        ],
      };
    }
  }
}

/**
 * Builder de Fórum para ALVARÁ
 * (você pode ajustar layout/tags depois)
 */
function buildForumPost(type, data) {
  const dados = data?.dados || data || {};
  const cid = dados?.cidadao || {};

  if (type === WEBHOOK_TYPES.ALVARA || type === WEBHOOK_TYPES.RENOVACAO_ALVARA) {
    const id = safe(data?.id || data?.numero || dados?.numeroIdentificacao);

    return {
      title: `${type === WEBHOOK_TYPES.RENOVACAO_ALVARA ? "Renovação" : "Alvará"} #${id} — ${safe(dados?.razaosocial)}`,
      message: {
        content:
          `**${type === WEBHOOK_TYPES.RENOVACAO_ALVARA ? "Pedido de RENOVAÇÃO" : "Pedido de ALVARÁ"}**\n` +
          `**Razão Social:** ${safe(dados?.razaosocial)}\n` +
          `**Setor:** ${safe(dados?.setor)}\n` +
          `**Estado:** ${safe(dados?.nomeEstado)}\n` +
          `**Cidade:** ${safe(dados?.cidade)}\n` +
          `**Cidadão:** ${safe(cid?.nomeCompleto)} (${mentionUser(cid?.discordId)})\n` +
          `**Identidade:** ${safe(cid?.identidade)}\n`,
        embeds: [
          {
            color: 0x3498db,
            title: "Anexos",
            fields: [
              { name: "Mapa (nome visível)", value: safe(dados?.fotoNomeEmpresaMapaUrl), inline: false },
              { name: "Fachada", value: safe(dados?.fotoFachadaUrl), inline: false },
              { name: "Inventário", value: safe(dados?.fotoInvUrl), inline: false },
            ],
          },
        ],
      },
    };
  }

  // fallback: manda como embed normal
  const embed = buildEmbed(type, data);
  return { title: `Requerimento — ${safe(type)}`, message: { embeds: [embed] } };
}

/**
 * =========================
 *  NOTIFY PRINCIPAL
 * =========================
 */
export async function notifyDiscord(type, data) {
  const dest = await resolveDest(type);

  try {
    // regra extra: trocaNome ajusta nick antes de notificar
    if (type === WEBHOOK_TYPES.TROCA_NOME) {
      const nick = buildNickname(data?.novoNome, data?.pombo);
      await botSetNickname("1288884651422650478", data?.discordId, nick, "Troca de nome aprovada");
    }

    // (A) Fórum
    if (dest.mode === "forum") {
      const post = buildForumPost(type, data);

      const tagsCfg = dest.tags || {};
      const appliedTags = [];

      // tenta usar tags por status se vierem do banco/env
      // exemplo esperado: tagsCfg = { PENDENTE: "123", APROVADO: "456", INDEFERIDO: "789" }
      const status = String(data?.status || "PENDENTE").toUpperCase();
      if (tagsCfg?.[status]) appliedTags.push(tagsCfg[status]);

      const thread = await botCreateForumPost(dest.forumChannelId, {
        title: post.title,
        message: post.message,
        appliedTags,
      });

      // opcional: salva threadId no Requerimento se existir model/coluna
      // se não existir, só ignora
      if (Requerimento && data?.id) {
        try {
          await Requerimento.update(
            { forumThreadId: thread.id, forumChannelId: String(dest.forumChannelId) },
            { where: { id: data.id } }
          );
        } catch {
          // ignora se coluna não existe
        }
      }

      return { ok: true, mode: "forum", threadId: thread.id };
    }

    // (B) Webhook URL real
    if (dest.mode === "webhook") {
      const embed = buildEmbed(type, data);
      const payload = { embeds: [embed] };

      const res = await axios.post(dest.webhookUrl, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10_000,
      });

      console.log(`[discordWebhook] webhook enviado type="${type}" status=${res.status}`);
      return { ok: true, mode: "webhook", status: res.status };
    }

    // (C) Canal normal (SEU CASO ATUAL: "webhookUrl" era channelId)
    const channelId = dest.channelId;
    if (!channelId) {
      console.error(`[discordWebhook] Nenhum channelId configurado para type="${type}".`);
      return { ok: false, reason: "missing_channelId" };
    }

    const embed = buildEmbed(type, data);
    const payload = { embeds: [embed] };

    await botSendMessage(channelId, payload);
    console.log(`[discordWebhook] canal enviado type="${type}" channelId=${channelId}`);
    return { ok: true, mode: "channel", channelId };
  } catch (err) {
    console.error(`[discordWebhook] erro ao enviar type="${type}":`, err?.message || err);
    if (err?.response) {
      console.error("Resposta:", JSON.stringify(err.response.data, null, 2));
    }
    return { ok: false, error: err?.message || String(err) };
  }
}

export default notifyDiscord;

/**
 * (Opcional) Exporta helpers de fórum caso você queira usar no controller
 */
export const forumHelpers = {
  botCreateForumPost,
  botSendToThread,
  botEditThreadTags,
};
