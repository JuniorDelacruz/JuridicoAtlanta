// backend/routes/triagemRequerimentosRoutes.js
import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { Requerimento, User } = db;

const allowedTriagemRoles = ["juiz", "promotor", "promotorchefe", "tabeliao", "escrivao", "admin"];

// GET /api/triagem/requerimentos?tipo=Troca%20de%20Nome
router.get("/", authMiddleware(allowedTriagemRoles), async (req, res) => {
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
});

// GET /api/triagem/requerimentos/:numero
router.get("/:numero", authMiddleware(allowedTriagemRoles), async (req, res) => {
    try {
        const numero = Number(req.params.numero);
        if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Número inválido" });


        const item = await Requerimento.findOne({
            where: { numero },
            include: [{ model: User, attributes: ["id", "username"] }],
        });


        if (!item) return res.status(404).json({ msg: "Requerimento não encontrado" });


        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Erro ao carregar detalhes (triagem)" });
    }
});

// PATCH /api/triagem/requerimentos/:numero/aprovar
router.patch("/:numero/aprovar", authMiddleware(allowedTriagemRoles), async (req, res) => {
    try {
        const numero = Number(req.params.numero);
        if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Número inválido" });


        const item = await Requerimento.findOne({ where: { numero } });
        if (!item) return res.status(404).json({ msg: "Requerimento não encontrado" });


        if (item.status !== "PENDENTE") {
            return res.status(400).json({ msg: "Somente PENDENTES podem ser aprovados" });
        }


        const role = req.user?.role;


        // ✅ PORTE DE ARMAS: aprovação do juiz não finaliza, encaminha p/ carimbo
        // Ajuste "porte_de_armas" conforme seu banco
        if (item.tipo === "porte_de_armas" && role === "juiz" || "admin") {
            const dadosAtual = item.dados || {};


            item.status = "AGUARDANDO_CARIMBO";
            item.dados = {
                ...dadosAtual,
                workflow: {
                    ...(dadosAtual.workflow || {}),
                    juiz: {
                        aprovado: true,
                        aprovadoPor: req.user?.id || null,
                        aprovadoPorNome: req.user?.username || null,
                        data: new Date().toISOString(),
                    },
                },
            };


            await item.save();


            return res.json({
                msg: "Aprovado pelo Juiz. Encaminhado para Carimbo.",
                requerimento: item,
                next: { slug: "carimbo", numero: item.numero }, // útil pro front redirecionar
            });
        }


        // ✅ fluxo padrão: aprova e finaliza
        item.status = "APROVADO";
        await item.save();


        res.json({ msg: "Requerimento aprovado", requerimento: item });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Erro ao aprovar requerimento" });
    }
});

// PATCH /api/triagem/requerimentos/:numero/indeferir
router.patch("/:numero/indeferir", authMiddleware(allowedTriagemRoles), async (req, res) => {
    try {
        const numero = Number(req.params.numero);
        if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Número inválido" });

        const item = await Requerimento.findOne({ where: { numero } });
        if (!item) return res.status(404).json({ msg: "Requerimento não encontrado" });

        if (item.status !== "PENDENTE") {
            return res.status(400).json({ msg: "Somente PENDENTES podem ser indeferidos" });
        }

        item.status = "INDEFERIDO";
        await item.save();

        res.json({ msg: "Requerimento indeferido", requerimento: item });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Erro ao indeferir requerimento" });
    }
});

export default router;