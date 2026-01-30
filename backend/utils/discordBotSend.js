import { client } from "../bot/index.js";

export async function botSendMessage(channelId, payload) {
    if (!client.isReady()) throw new Error("Bot ainda não está pronto.");

    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) throw new Error("Canal inválido ou não-texto.");

    return ch.send(payload); // payload pode ser { content, embeds, components... }
}


export async function botSetNickname(guildId, userId, nickname, reason = "Atualização via sistema jurídico") {
    if (!client.isReady()) throw new Error("Bot ainda não está pronto.");

    const gid = String(guildId || "").trim();
    const uid = String(userId || "").trim();

    if (!/^\d{5,25}$/.test(gid)) throw new Error("guildId inválido.");
    if (!/^\d{5,25}$/.test(uid)) throw new Error("userId inválido.");

    // Discord limita nickname a 32 chars
    const nick = nickname === null ? null : String(nickname || "").trim();
    if (nick !== null && (nick.length < 1 || nick.length > 32)) {
        throw new Error("Nickname deve ter entre 1 e 32 caracteres (ou null para remover).");
    }

    const guild = await client.guilds.fetch(gid).catch(() => null);
    if (!guild) throw new Error("Servidor (guild) não encontrado / bot não está nele.");

    // garante membros no cache
    const member = await guild.members.fetch(uid).catch(() => null);
    if (!member) throw new Error("Usuário não encontrado nesse servidor.");

    // tenta buscar o member do bot pra validar hierarquia
    const me = guild.members.me || (await guild.members.fetch(client.user.id).catch(() => null));
    if (!me) throw new Error("Não consegui resolver o membro do bot no servidor.");

    // Permissão
    if (!me.permissions.has("ManageNicknames")) {
        throw new Error("Bot sem permissão: ManageNicknames.");
    }

    // Hierarquia: bot precisa estar acima do alvo (a menos que seja o dono, etc.)
    // (Se o alvo tiver cargo >= bot, vai dar 403)
    if (member.roles.highest.position >= me.roles.highest.position) {
        throw new Error("Não posso alterar o apelido: o usuário tem cargo igual/maior que o bot.");
    }

    // setNickname aceita null pra resetar
    await member.setNickname(nick, reason);

    return {
        ok: true,
        guildId: gid,
        userId: uid,
        nickname: member.nickname, // nickname atual pós update (pode ser null)
    };
}