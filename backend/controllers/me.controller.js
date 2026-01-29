// backend/controllers/me.controller.js
import db from "../models/index.js";
const { CadastroCidadao } = db;

export async function getMeuCidadao(req, res) {
  try {
    const discordId = String(req.user?.discordId || "").trim(); // seu JWT precisa ter id=DiscordId
    if (!discordId) return res.status(400).json({ message: "Token sem id." });

    const cidadao = await CadastroCidadao.findOne({
      where: { discordId },
      order: [["updatedAt", "DESC"]],
    });
    return res.json({
      cidadao: cidadao
        ? { id: cidadao.id, nomeCompleto: cidadao.nomeCompleto, discordId: cidadao.discordId }
        : null,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}