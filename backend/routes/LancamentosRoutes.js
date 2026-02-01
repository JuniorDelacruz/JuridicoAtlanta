import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { Lancamento } = db;

// helper
const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function canViewAll(user) {
  const sub = norm(user?.subRole);
  return ["master", "responsaveljuridico", "equipejuridico"].includes(sub);
}

// meus lançamentos
router.get("/meus", authMiddleware(), async (req, res) => {
  try {
    const rows = await Lancamento.findAll({
      where: { createdBy: req.user.id },
      order: [["data", "DESC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao buscar meus lançamentos" });
  }
});

// ver todos (com permissão)
router.get("/", authMiddleware(), async (req, res) => {
  try {
    if (!canViewAll(req.user)) {
      return res.status(403).json({ msg: "Sem permissão para ver todos os lançamentos." });
    }

    const rows = await Lancamento.findAll({
      order: [["data", "DESC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao buscar lançamentos" });
  }
});

// criar lançamento
router.post("/", authMiddleware(), async (req, res) => {
  try {
    const { tipo, titulo, descricao } = req.body;

    if (!tipo) return res.status(400).json({ msg: "Tipo é obrigatório." });

    const novo = await Lancamento.create({
      tipo,
      titulo: titulo || null,
      descricao: descricao || null,
      status: "ATIVO",
      data: new Date(),
      createdBy: req.user.id,
    });

    res.json({ msg: "Criado", lancamento: novo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao criar lançamento" });
  }
});

export default router;
