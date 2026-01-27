// backend/routes/requerimentosRoutes.js
import express from "express";
import { Sequelize } from "sequelize";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { Requerimento, User } = db;

// ✅ GET /api/requerimentos/resumo (TEM QUE VIR ANTES DE /:numero)
router.get("/resumo", authMiddleware(), async (req, res) => {
  try {
    const where = {};
    if (!["admin", "conselheiro"].includes(req.user.role) && req.user.subRole !== "equipejuridico") {
      where.userId = req.user.id;
    }

    const rows = await Requerimento.findAll({
      where,
      attributes: [
        "tipo",
        "status",
        [Sequelize.fn("COUNT", Sequelize.col("numero")), "count"],
      ],
      group: ["tipo", "status"],
    });

    const resumo = {};
    for (const r of rows) {
      const tipo = r.get("tipo");
      const status = r.get("status");
      const count = Number(r.get("count") || 0);

      resumo[tipo] ||= { PENDENTE: 0, APROVADO: 0, INDEFERIDO: 0, TOTAL: 0 };
      resumo[tipo][status] += count;
      resumo[tipo].TOTAL += count;
    }

    res.json(resumo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao carregar resumo" });
  }
});

// GET /api/requerimentos/triagem (também antes de /:numero)
router.get(
  "/triagem",
  authMiddleware(["juiz", "promotor", "promotorchefe", "tabeliao", "escrivao", "admin"]),
  async (req, res) => {
    try {
      const pendentes = await Requerimento.findAll({
        where: { status: "PENDENTE" },
        include: [{ model: User, attributes: ["username"] }],
        order: [["createdAt", "ASC"]],
      });
      res.json(pendentes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Erro ao carregar triagem" });
    }
  }
);

// GET /api/requerimentos?tipo=...&status=...
router.get("/", authMiddleware(), async (req, res) => {
  try {
    const where = {};
    const { tipo, status } = req.query;

    if (!["admin", "conselheiro"].includes(req.user.role) && req.user.subRole !== "equipejuridico") {
      where.userId = req.user.id;
    }

    if (tipo) where.tipo = tipo;
    if (status && ["PENDENTE", "APROVADO", "INDEFERIDO"].includes(status)) where.status = status;

    const requerimentos = await Requerimento.findAll({
      where,
      include: [{ model: User, attributes: ["username"] }],
      order: [["createdAt", "DESC"]],
    });

    res.json(requerimentos);
  } catch (err) {
    console.error("Erro ao listar requerimentos:", err);
    res.status(500).json({ msg: "Erro ao listar requerimentos" });
  }
});

// POST /api/requerimentos
router.post("/", authMiddleware(), async (req, res) => {
  const { tipo, dados } = req.body;
  if (!tipo || dados == null) return res.status(400).json({ msg: "Tipo e dados são obrigatórios" });

  try {
    const novo = await Requerimento.create({
      tipo,
      dados,
      solicitante: req.user.username || "Usuário",
      status: "PENDENTE",
      userId: req.user.id,
    });

    res.status(201).json(novo);
  } catch (err) {
    console.error("Erro ao criar requerimento:", err);
    res.status(500).json({ msg: "Erro ao criar requerimento" });
  }
});

// ✅ GET /api/requerimentos/:numero — SÓ NÚMEROS
router.get("/:numero", authMiddleware(), async (req, res) => {
  try {
    const numero = Number(req.params.numero);

    const requerimento = await Requerimento.findOne({
      where: { numero },
      include: [{ model: User, attributes: ["username"] }],
    });

    if (!requerimento) return res.status(404).json({ msg: "Requerimento não encontrado" });

    if (requerimento.userId !== req.user.id && !["admin"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Acesso negado" });
    }

    res.json(requerimento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao carregar detalhes" });
  }
});

// PATCH /api/requerimentos/:id/carimbar
router.patch("/:id/carimbar", authMiddleware(["tabeliao", "escrivao"]), async (req, res) => {
  try {
    const requer = await Requerimento.findByPk(req.params.id);
    if (!requer) return res.status(404).json({ msg: "Requerimento não encontrado" });

    if (requer.tipo !== "Porte de Arma" || requer.status !== "APROVADO") {
      return res.status(400).json({ msg: "Não pode carimbar este requerimento" });
    }

    // Se essas colunas não existem no model/tabela, isso também vai quebrar.
    requer.carimbadoPor = req.user.id;
    requer.dataCarimbo = new Date();
    await requer.save();

    res.json({ msg: "Carimbado com sucesso", requerimento: requer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao carimbar" });
  }
});

export default router;