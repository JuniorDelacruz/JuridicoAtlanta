const DISCORD_NICK_LIMIT = 32;

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function initialsMiddle(parts) {
  if (parts.length <= 2) return parts.join(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  const mids = parts.slice(1, -1).map(p => (p ? `${p[0].toUpperCase()}.` : "")).filter(Boolean);
  return [first, ...mids, last].join(" ");
}

function clampNick(s, limit = DISCORD_NICK_LIMIT) {
  const str = normalizeSpaces(s);
  if (str.length <= limit) return str;
  // corta e coloca reticências (mantém legível)
  return str.slice(0, Math.max(0, limit - 1)).trimEnd() + "…";
}

/**
 * Gera nickname no formato: "<Nome abreviado> | <pombo>"
 * com limite de 32 chars, degradando de forma inteligente.
 */
export function buildNickname(novoNome, pombo) {
  const name = normalizeSpaces(novoNome);
  const p = normalizeSpaces(pombo);

  if (!name) return clampNick(p || "—");

  const parts = name.split(" ").filter(Boolean);

  // 1) tentativa: nome abreviado + " | " + pombo
  let base = initialsMiddle(parts);
  let nick = p ? `${base} | ${p}` : base;
  if (nick.length <= DISCORD_NICK_LIMIT) return nick;

  // 2) se estourou, tenta reduzir/limitar pombo
  if (p) {
    const shortPombo = p.slice(0, 6); // ajusta como quiser
    nick = `${base} | ${shortPombo}`;
    if (nick.length <= DISCORD_NICK_LIMIT) return nick;

    // 3) remove pombo totalmente
    nick = base;
    if (nick.length <= DISCORD_NICK_LIMIT) return nick;
  }

  // 4) se ainda estourou: corta o nome abreviado com reticências
  return clampNick(base, DISCORD_NICK_LIMIT);
}