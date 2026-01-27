// backend/routes/cadastrosRoutes.js
import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";
import { Op } from "sequelize";

const router = express.Router();
const { CadastroCidadao } = db;

// GET /api/cadastros/existe?identidade=123
router.get("/existe", authMiddleware(), async (req, res) => {
  try {
    const identidadeRaw = req.query.identidade;

    if (!identidadeRaw) {
      return res.status(400).json({ msg: "Parâmetro 'identidade' é obrigatório." });
    }

    const identidade = String(identidadeRaw).trim();
    const identidadeNorm = identidade.replace(/[^\w]/g, ""); // remove . - espaço etc

    console.log("[cadastros/existe] identidadeRaw:", identidadeRaw);
    console.log("[cadastros/existe] identidade:", identidade, "identidadeNorm:", identidadeNorm);

    // tenta achar por identidade exata OU normalizada (cobre casos com/sem pontuação)
    const cidadao = await CadastroCidadao.findOne({
      where: {
        [Op.or]: [
          { identidade: identidade },
          { identidade: identidadeNorm },
        ],
      },
      attributes: ["id", "nomeCompleto", "identidade", "status", "discordId", "createdAt"],
    });

    if (!cidadao) {
      return res.json({ exists: false });
    }

    return res.json({
      exists: true,
      cidadao,
    });
  } catch (err) {
    console.error("[cadastros/existe] erro:", err);
    return res.status(500).json({ msg: "Erro ao verificar identidade no cartório." });
  }
});

export default router;