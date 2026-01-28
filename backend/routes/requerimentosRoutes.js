// backend/routes/requerimentosRoutes.js
import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";
import { Sequelize } from "sequelize";

const router = express.Router();
const { Requerimento, User } = db;

// GET /api/requerimentos - Lista (com filtro por tipo/status)
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

// ✅ GET /api/requerimentos/resumo (DEIXA ANTES DO /:numero)
router.get("/resumo", authMiddleware(), async (req, res) => {
    try {
        const where = {};
        if (!["admin", "conselheiro"].includes(req.user.role) && req.user.subRole !== "equipejuridico") {
            where.userId = req.user.id;
        }

        const rows = await Requerimento.findAll({
            where,
            attributes: ["tipo", "status", [Sequelize.fn("COUNT", Sequelize.col("numero")), "count"]],
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

// ✅ GET /api/requerimentos/triagem?tipo=Troca%20de%20Nome
router.get(
    "/triagem",
    authMiddleware(["juiz", "promotor", "promotorchefe", "tabeliao", "escrivao", "admin"]),
    async (req, res) => {
        try {
            const where = { status: "PENDENTE" };
            const { tipo } = req.query;
            if (tipo) where.tipo = tipo;

            const pendentes = await Requerimento.findAll({
                where,
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

// ✅ PATCH /api/requerimentos/:numero/aprovar
router.patch(
    "/:numero/aprovar",
    authMiddleware(["juiz", "promotor", "promotorchefe", "tabeliao", "escrivao", "admin"]),
    async (req, res) => {
        try {
            const numero = Number(req.params.numero);
            if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Número inválido" });

            const item = await Requerimento.findOne({ where: { numero } });
            if (!item) return res.status(404).json({ msg: "Requerimento não encontrado" });

            if (item.status !== "PENDENTE") {
                return res.status(400).json({ msg: "Somente requerimentos PENDENTES podem ser aprovados" });
            }

            item.status = "APROVADO";
            await item.save();

            res.json({ msg: "Requerimento aprovado", requerimento: item });
        } catch (err) {
            console.error(err);
            res.status(500).json({ msg: "Erro ao aprovar requerimento" });
        }
    }
);

// ✅ PATCH /api/requerimentos/:numero/indeferir
router.patch(
    "/:numero/indeferir",
    authMiddleware(["juiz", "promotor", "promotorchefe", "tabeliao", "escrivao", "admin"]),
    async (req, res) => {
        try {
            const numero = Number(req.params.numero);
            if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Número inválido" });

            const item = await Requerimento.findOne({ where: { numero } });
            if (!item) return res.status(404).json({ msg: "Requerimento não encontrado" });

            if (item.status !== "PENDENTE") {
                return res.status(400).json({ msg: "Somente requerimentos PENDENTES podem ser indeferidos" });
            }

            item.status = "INDEFERIDO";
            await item.save();

            res.json({ msg: "Requerimento indeferido", requerimento: item });
        } catch (err) {
            console.error(err);
            res.status(500).json({ msg: "Erro ao indeferir requerimento" });
        }
    }
);

// GET /api/requerimentos/:numero (DEPOIS DAS ROTAS FIXAS)
router.get("/:numero", authMiddleware(), async (req, res) => {
    try {
        const numero = Number(req.params.numero);
        if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Rota inválida" });

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

export default router;