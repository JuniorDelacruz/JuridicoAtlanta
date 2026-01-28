// backend/routes/triagemRequerimentosRoutes.js
import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";
import { notifyDiscord, WEBHOOK_TYPES } from "../utils/discordWebhook.js";

const router = express.Router();
const { Requerimento, User , CadastroCidadao} = db;

const allowedTriagemRoles = ["juiz", "promotor", "promotorchefe", "tabeliao", "escrivao", "admin"];


function webhookTypeByRequerimentoTipo(tipo) {
    switch (tipo) {

        case "Porte de Arma":
        case "Porte de Armas":
            return WEBHOOK_TYPES.PORTE_ARMA;


        case "Registro de Arma":
        case "Registro de Armas":
            return WEBHOOK_TYPES.REGISTRO_ARMA;


        case "Troca de Nome":
            return WEBHOOK_TYPES.TROCA_NOME;


        case "Casamento":
            return WEBHOOK_TYPES.CASAMENTO;


        case "Divórcio":
        case "Divorcio":
            return WEBHOOK_TYPES.DIVORCIO;


        case "Limpeza de Ficha":
            return WEBHOOK_TYPES.LIMPEZA_FICHA;


        case "Porte Suspenso":
            return WEBHOOK_TYPES.PORTE_SUSPENSO;


        case "Alvará":
        case "Alvara":
            return WEBHOOK_TYPES.ALVARA;


        default:
            return null;
    }
}

function buildWebhookPayload(item, reqUser) {
    const cid = item?.dados?.cidadao || {};
    return {
        id: item.numero,
        status: item.status,
        aprovadoPor: item?.dados?.workflow?.juiz?.aprovadoPorNome || reqUser?.username || String(reqUser?.id || "Sistema"),


        // dados comuns (se existir no seu schema)
        nomeCompleto: cid?.nomeCompleto,
        registro: cid?.id,
        discordId: cid?.discordId,
        pombo: cid?.pombo,
        identidade: cid?.identidade,
        profissao: cid?.profissao,
        residencia: cid?.residencia,


        // dados específicos que você já usa em PORTE/REGISTRO
        validade: item?.dados?.workflow.juiz.validade,
        arma: item?.dados?.arma,
        serial: item?.dados?.numeroSerial,
    };
}

router.get("/", authMiddleware(allowedTriagemRoles), async (req, res) => {
    try {
        const { tipo } = req.query;


        const where = {};


        if (tipo === "carimbo") {
            where.status = "AGUARDANDO_CARIMBO";
            where.tipo = "Porte de Arma"; // opcional: só Porte de Arma no carimbo
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

router.patch("/:numero/carimbar", authMiddleware(allowedTriagemRoles), async (req, res) => {
    try {
        const numero = Number(req.params.numero);
        if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Número inválido" });


        const item = await Requerimento.findOne({ where: { numero } });
        if (!item) return res.status(404).json({ msg: "Requerimento não encontrado" });


        if (item.status !== "AGUARDANDO_CARIMBO") {
            return res.status(400).json({ msg: "Somente AGUARDANDO_CARIMBO pode ser carimbado" });
        }


        item.status = "APROVADO";
        await item.save();


        // ✅ webhook (não bloqueia resposta)
        notifyDiscord(WEBHOOK_TYPES.CARIMBO_PORTE_ARMA, {
            id: item.numero,
            status: item.status,
            aprovadoPor: req.user?.username || String(req.user?.id || ""),
            // dados do cidadão (normalmente dentro de dados.cidadao)
            nomeCompleto: item.dados?.cidadao?.nomeCompleto,
            discordId: item.dados?.cidadao?.discordId,
            identidade: item.dados?.cidadao?.identidade,
            categoria: item.dados?.categoria,
            validade: item.dados?.validade,
        }).catch((e) => console.error("[webhook carimbo] falha:", e?.message || e));


        return res.json({ msg: "Requerimento carimbado", requerimento: item });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Erro ao carimbar requerimento" });
    }
});

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

        // ✅ Fluxo especial: Porte -> juiz/aprovação encaminha pra carimbo
        // ATENÇÃO no seu código: `role === "juiz" || "admin"` tá errado (sempre true).
        // O correto é:
        const isJuizOuAdmin = role === "juiz" || role === "admin";
        const Solicitante = await CadastroCidadao.findOne({
        where: { discordId: req.user.discordId}
    })

        if ((item.tipo === "Porte de Arma" || item.tipo === "Porte de Armas") && isJuizOuAdmin) {
            const dadosAtual = item.dados || {};

            item.status = "AGUARDANDO_CARIMBO";
            item.dados = {
                ...dadosAtual,
                workflow: {
                    ...(dadosAtual.workflow || {}),
                    juiz: {
                        aprovado: true,
                        aprovadoPor: req.user?.id || null,
                        aprovadoPorNome: Solicitante.nomeCompleto || req.user?.username,
                        validade: "90 dias",
                        data: new Date().toISOString(),
                    },
                },
            };

            await item.save();

            // (Opcional) webhook de "encaminhado para carimbo" se você quiser criar um type específico.
            // Por enquanto, não manda webhook final aqui.

            // ✅ Decide qual webhook mandar
            const hookType = webhookTypeByRequerimentoTipo(item.tipo);

            if (hookType) {
                const payload = buildWebhookPayload(item, req.user);
                notifyDiscord(hookType, payload).catch((e) =>
                    console.error("[webhook aprovar] falha:", e?.message || e)
                );
            } else {
                console.warn("[webhook aprovar] tipo sem mapeamento:", item.tipo);
            }



            return res.json({
                msg: "Aprovado pelo Juiz. Encaminhado para Carimbo.",
                requerimento: item,
                next: { slug: "carimbo", numero: item.numero },
            });



        }

        // ✅ Fluxo padrão: finaliza aprovação
        item.status = "APROVADO";
        await item.save();

        // ✅ Decide qual webhook mandar
        const hookType = webhookTypeByRequerimentoTipo(item.tipo);

        if (hookType) {
            const payload = buildWebhookPayload(item, req.user);
            notifyDiscord(hookType, payload).catch((e) =>
                console.error("[webhook aprovar] falha:", e?.message || e)
            );
        } else {
            console.warn("[webhook aprovar] tipo sem mapeamento:", item.tipo);
        }

        return res.json({ msg: "Requerimento aprovado", requerimento: item });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Erro ao aprovar requerimento" });
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