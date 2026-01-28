// backend/routes/requerimentosRoutes.js
import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { Requerimento, User } = db;


// ✅ GET /api/requerimentos/resumo (TEM QUE VIR ANTES DE /:numero)
router.get("/resumo", authMiddleware(['admin']), async (req, res) => {
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

// GET /api/requerimentos?tipo=Troca%20de%20Nome&status=PENDENTE
router.get("/", authMiddleware(), async (req, res) => {
    try {
        const where = {};
        const { tipo, status } = req.query;

        // Admin/conselheiro/equipe vê tudo, senão vê só os seus
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

    if (!tipo || !dados) {
        return res.status(400).json({ msg: "Tipo e dados são obrigatórios" });
    }

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

// GET /api/requerimentos/:numero  (NUMÉRICO)
router.get("/:numero", authMiddleware(), async (req, res) => {
    try {
        const numero = Number(req.params.numero);
        if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Rota inválida" });

        const requerimento = await Requerimento.findOne({
            where: { numero },
            include: [{ model: User, attributes: ["username"] }],
        });

        if (!requerimento) {
            return res.status(404).json({ msg: "Requerimento não encontrado" });
        }

        // dono ou admin/equipejuridico/conselheiro
        const podeVerTudo =
            ["admin", "conselheiro"].includes(req.user.role) || req.user.subRole === "equipejuridico";

        if (!podeVerTudo && requerimento.userId !== req.user.id) {
            return res.status(403).json({ msg: "Acesso negado" });
        }

        res.json(requerimento);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Erro ao carregar detalhes" });
    }
});

export default router;