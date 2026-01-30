import { client } from "../bot/index.js";

export async function botSendMessage(channelId, payload) {
  if (!client.isReady()) throw new Error("Bot ainda não está pronto.");

  const ch = await client.channels.fetch(channelId);
  if (!ch || !ch.isTextBased()) throw new Error("Canal inválido ou não-texto.");

  return ch.send(payload); // payload pode ser { content, embeds, components... }
}