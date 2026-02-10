// backend/utils/discordForum.js
import { client } from "../bot/index.js";

/**
 * Cria um "post" em um canal de Fórum e publica a mensagem inicial.
 *
 * @param {string} forumChannelId - ID do canal de Fórum
 * @param {object} options
 * @param {string} options.title - Título do post (obrigatório)
 * @param {object} [options.message] - Payload do Discord.js: { content, embeds, components, files, allowedMentions }
 * @param {string[]} [options.appliedTags] - Array de IDs de tags do fórum (opcional)
 * @param {number} [options.autoArchiveDuration] - Minutos (60, 1440, 4320, 10080) (opcional)
 * @param {string} [options.reason] - Motivo para auditoria
 */
export async function botCreateForumPost(forumChannelId, options) {
  if (!client.isReady()) throw new Error("Bot ainda não está pronto.");

  const cid = String(forumChannelId || "").trim();
  if (!/^\d{5,25}$/.test(cid)) throw new Error("forumChannelId inválido.");

  const title = String(options?.title || "").trim();
  if (!title) throw new Error("title é obrigatório.");
  if (title.length > 100) throw new Error("title muito longo (máx 100 chars).");

  const message = options?.message || {};
  const appliedTags = Array.isArray(options?.appliedTags) ? options.appliedTags : [];
  const autoArchiveDuration = options?.autoArchiveDuration;
  const reason = options?.reason || "Criação de post via sistema jurídico";

  const ch = await client.channels.fetch(cid).catch(() => null);
  if (!ch) throw new Error("Canal não encontrado.");
  if (ch.type !== 15 && ch.type !== "GUILD_FORUM") {
    // Discord.js v14: forum = ChannelType.GuildForum (15)
    throw new Error("Canal informado não é um Fórum.");
  }

  // valida payload mínimo
  const hasContent = !!String(message?.content || "").trim();
  const hasEmbeds = Array.isArray(message?.embeds) && message.embeds.length > 0;
  const hasFiles = Array.isArray(message?.files) && message.files.length > 0;

  if (!hasContent && !hasEmbeds && !hasFiles) {
    throw new Error("message precisa ter pelo menos content, embeds ou files.");
  }

  // (Opcional) valida tags existem no fórum
  if (appliedTags.length) {
    const available = new Set((ch.availableTags || []).map((t) => t.id));
    for (const tagId of appliedTags) {
      if (!available.has(tagId)) {
        throw new Error(`Tag inválida para esse fórum: ${tagId}`);
      }
    }
  }

  // cria o post (thread) + mensagem inicial
  const thread = await ch.threads.create({
    name: title,
    message, // { content, embeds, components, files, allowedMentions... }
    appliedTags: appliedTags.length ? appliedTags : undefined,
    autoArchiveDuration: autoArchiveDuration || undefined,
    reason,
  });

  return {
    ok: true,
    forumChannelId: cid,
    threadId: thread.id,
    threadName: thread.name,
    url: thread.url, // link direto pro post
  };
}

/**
 * Utilitário: lista tags disponíveis do fórum (pra você mapear no sistema)
 */
export async function botListForumTags(forumChannelId) {
  if (!client.isReady()) throw new Error("Bot ainda não está pronto.");

  const cid = String(forumChannelId || "").trim();
  if (!/^\d{5,25}$/.test(cid)) throw new Error("forumChannelId inválido.");

  const ch = await client.channels.fetch(cid).catch(() => null);
  if (!ch) throw new Error("Canal não encontrado.");
  if (ch.type !== 15 && ch.type !== "GUILD_FORUM") throw new Error("Canal informado não é um Fórum.");

  const tags = (ch.availableTags || []).map((t) => ({
    id: t.id,
    name: t.name,
    moderated: !!t.moderated,
    emoji: t.emoji
      ? {
          id: t.emoji.id || null,
          name: t.emoji.name || null,
        }
      : null,
  }));

  return { ok: true, forumChannelId: cid, tags };
}

/**
 * Caso queira mandar mensagens adicionais dentro do post já criado.
 */
export async function botSendMessageToThread(threadId, payload) {
  if (!client.isReady()) throw new Error("Bot ainda não está pronto.");

  const tid = String(threadId || "").trim();
  if (!/^\d{5,25}$/.test(tid)) throw new Error("threadId inválido.");

  const thread = await client.channels.fetch(tid).catch(() => null);
  if (!thread || !thread.isThread()) throw new Error("Thread inválida/não encontrada.");

  return thread.send(payload);
}
