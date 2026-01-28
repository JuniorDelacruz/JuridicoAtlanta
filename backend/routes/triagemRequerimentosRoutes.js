// backend/routes/triagemRequerimentosRoutes.js
import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { Requerimento, User } = db;

const allowedTriagemRoles = ["juiz", "promotor", "promotorchefe", "tabeliao", "escrivao", "admin"];

router.get("/", authMiddleware(allowedTriagemRoles), async (req, res) => {
    try {
        const { tipo } = req.query;


        const where = {};


        if (tipo === "carimbo") {
            where.status = "AGUARDANDO_CARIMBO";
            where.tipo = "porte_de_armas"; // opcional: só porte de armas no carimbo
        } else {
            where.status = "PENDENTE";
            if (tipo) where.tipo = tipo;
        }


        const itens = await Requerimento.findAll({
            where,
            include: [{ model: User, attributes: ["username"] }],
            order: [["createdAt", "ASC"]],
        });


        res.json(itens);
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

// PATCH /api/triagem/requerimentos/:numero/carimbar
router.patch("/:numero/carimbar", authMiddleware(allowedTriagemRoles), async (req, res) => {
    try {
        const numero = Number(req.params.numero);
        if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Número inválido" });


        const item = await Requerimento.findOne({ where: { numero } });
        if (!item) return res.status(404).json({ msg: "Requerimento não encontrado" });


        if (item.tipo !== "Porte de Armas") {
            return res.status(400).json({ msg: "Somente Porte de Armas pode ser carimbado" });
        }


        if (item.status !== "AGUARDANDO_CARIMBO") {
            return res.status(400).json({ msg: "Somente AGUARDANDO_CARIMBO pode ser carimbado" });
        }


        item.status = "APROVADO"; // ou "CARIMBADO" se quiser separar
        await item.save();


        res.json({ msg: "Requerimento carimbado", requerimento: item });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Erro ao carimbar requerimento" });
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
        // Ajuste "Porte de Armas" conforme seu banco
        if (item.tipo === "Porte de Armas" && role === "juiz" || "admin") {
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