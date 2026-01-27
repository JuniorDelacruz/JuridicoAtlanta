// backend/utils/discordWebhook.js
import axios from "axios";
import db from "../models/index.js";

const { WebhookConfig } = db;

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
};

/**
 * Helpers
 */
const safe = (val) =>
  val === undefined || val === null || val === "" ? "—" : String(val);

const mentionUser = (discordId) => {
  const id = String(discordId ?? "").trim();
  // ID discord geralmente é só dígitos; evita <@—> e similares
  return /^\d{5,25}$/.test(id) ? `<@${id}>` : safe(discordId);
};

/**
 * Resolve webhook URL por tipo (via banco)
 * - 1) tenta WebhookConfig (enabled=true)
 * - 2) fallback para envs (JSON / env individuais / DEFAULT)
 */
async function resolveWebhookUrl(type) {
  // 1) Banco (prioridade máxima)
  try {
    if (WebhookConfig) {
      const row = await WebhookConfig.findOne({ where: { tipo: type } });
      if (row && row.enabled && row.url) return row.url;
    }
  } catch (e) {
    console.error("[discordWebhook] falha ao buscar webhook no banco:", e?.message || e);
  }

  // 2) Fallback env JSON
  const rawJson = process.env.DISCORD_WEBHOOKS_JSON;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      return parsed[type] || parsed.default || process.env.DISCORD_WEBHOOK_DEFAULT;
    } catch {
      // ignora JSON inválido e tenta envs individuais
    }
  }

  // 3) Fallback env individuais
  const envKeyByType = {
    [WEBHOOK_TYPES.CADASTRO_CIDADAO]: "DISCORD_WEBHOOK_CADASTRO_CIDADAO",
    [WEBHOOK_TYPES.PORTE_ARMA]: "DISCORD_WEBHOOK_PORTE_ARMA",
    [WEBHOOK_TYPES.REGISTRO_ARMA]: "DISCORD_WEBHOOK_REGISTRO_ARMA",
    [WEBHOOK_TYPES.TROCA_NOME]: "DISCORD_WEBHOOK_TROCA_NOME",
    [WEBHOOK_TYPES.CASAMENTO]: "DISCORD_WEBHOOK_CASAMENTO",
    [WEBHOOK_TYPES.DIVORCIO]: "DISCORD_WEBHOOK_DIVORCIO",
    [WEBHOOK_TYPES.LIMPEZA_FICHA]: "DISCORD_WEBHOOK_LIMPEZA_FICHA",
    [WEBHOOK_TYPES.PORTE_SUSPENSO]: "DISCORD_WEBHOOK_PORTE_SUSPENSO",
    [WEBHOOK_TYPES.ALVARA]: "DISCORD_WEBHOOK_ALVARA",
    [WEBHOOK_TYPES.CARIMBO_PORTE_ARMA]: "DISCORD_WEBHOOK_CARIMBO_PORTE_ARMA",
  };

  const envKey = envKeyByType[type];
  return (envKey && process.env[envKey]) || process.env.DISCORD_WEBHOOK_DEFAULT;
}

/**
 * Builders (um por requerimento)
 * Você pode ir adicionando aos poucos.
 */
function buildEmbed(type, data) {
  const base = {
    color: 0x2ecc71,
    thumbnail: { url: "https://i.imgur.com/A22LhtG.png" },
    timestamp: new Date().toISOString(),
    footer: { text: "Jurídico Atlanta RP" },
  };

  switch (type) {
    case WEBHOOK_TYPES.CADASTRO_CIDADAO: {
      return {
        ...base,
        title: "CADASTRO DE CIDADÃO",
        description: `CADASTRO DE CIDADÃO Nº ${safe(data?.id)}`,
        fields: [
          { name: "Nome Completo", value: safe(data?.nomeCompleto), inline: false },
          { name: "Pombo", value: safe(data?.pombo), inline: false },
          { name: "Identidade", value: safe(data?.identidade), inline: false },
          { name: "Profissão", value: safe(data?.profissao), inline: false },
          { name: "Residência", value: safe(data?.residencia), inline: false },
          { name: "ID Discord", value: mentionUser(data?.discordId), inline: false },
          { name: "Aprovado por", value: safe(data?.aprovadoPor), inline: false },
        ],
      };
    }

    case WEBHOOK_TYPES.REGISTRO_ARMA: {
      return {
        ...base,
        color: 0x3498db,
        title: "REGISTRO DE ARMA",
        description: `REGISTRO Nº ${safe(data?.id)}`,
        fields: [
          { name: "Cidadão", value: safe(data?.nomeCompleto), inline: false },
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
        title: "PORTE DE ARMA",
        description: `PORTE Nº ${safe(data?.id)}`,
        fields: [
          { name: "Cidadão", value: safe(data?.nomeCompleto), inline: false },
          { name: "ID Discord", value: mentionUser(data?.discordId), inline: false },
          { name: "Categoria", value: safe(data?.categoria), inline: true },
          { name: "Validade", value: safe(data?.validade), inline: true },
          { name: "Status", value: safe(data?.status), inline: true },
          { name: "Aprovado por", value: safe(data?.aprovadoPor), inline: false },
        ],
      };
    }

    // TODO: trocaNome, casamento, divorcio, limpezaFicha, porteSuspenso, alvara, carimboPorteArma
    default: {
      return {
        ...base,
        color: 0x95a5a6,
        title: "REQUERIMENTO",
        description: `Tipo: ${safe(type)} • ID: ${safe(data?.id)}`,
        fields: [
          {
            name: "Solicitante",
            value: safe(data?.nomeCompleto || data?.nome || data?.author),
            inline: false,
          },
          { name: "ID Discord", value: mentionUser(data?.discordId), inline: false },
          {
            name: "Dados",
            value:
              "```json\n" +
              JSON.stringify(data ?? {}, null, 2).slice(0, 900) +
              "\n```",
            inline: false,
          },
        ],
      };
    }
  }
}

/**
 * API principal
 */
export async function notifyDiscord(type, data) {
  const webhookUrl = await resolveWebhookUrl(type);

  if (!webhookUrl) {
    console.error(
      `[discordWebhook] Nenhum webhook configurado para type="${type}" (nem DEFAULT).`
    );
    return;
  }

  const embed = buildEmbed(type, data);
  const payload = { embeds: [embed] };

  try {
    const res = await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });
    console.log(`[discordWebhook] enviado type="${type}" status=${res.status}`);
  } catch (err) {
    console.error(`[discordWebhook] erro ao enviar type="${type}":`, err.message);
    if (err.response)
      console.error("Resposta do Discord:", JSON.stringify(err.response.data, null, 2));
  }
}

export default notifyDiscord;