// backend/routes/triagemRequerimentosRoutes.js
import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";
import { notifyDiscord, WEBHOOK_TYPES } from "../utils/discordWebhook.js";
import { where } from "sequelize";

const router = express.Router();
const { Requerimento, User, CadastroCidadao } = db;

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


        case "Emitir Alvará":
            return WEBHOOK_TYPES.ALVARA;


        case "Carimbo":
            return WEBHOOK_TYPES.CARIMBO_PORTE_ARMA;

        default:
            return null;
    }
}

function isPortDeArmas(tipo) {
    const t = String(tipo || "").toLowerCase();
    return t.includes('porte') && (t.includes('arma') || t.includes('armas'));
}
function isTrocaDeNome(tipo) {
    const t = String(tipo || "").toLowerCase();
    return t.includes('troca') && (t.includes('nome') || t.includes('nomes'));
}

function isEmitirAlvara(tipo) {
    return String(tipo || "").toLowerCase().includes("Emitir Alvará");
}

function isCasamento(tipo) {
    return String(tipo || "").toLowerCase().includes("casamento");
}



function mapPessoaCidadao(c) {
    if (!c) return null;
    return {
        nomeCompleto: c.nomeCompleto,
        registro: c.id,
        identidade: c.identidade,
        discordId: c.discordId,
        pombo: c.pombo,
        profissao: c.profissao,
        residencia: c.residencia,
        status: c.status,
    };
}

function buildWebhookPayload(item, reqUser) {
    const dados = item?.dados || {};

    const isPorte = isPortDeArmas(item?.tipo);
    const isTroca = isTrocaDeNome(item?.tipo);
    const casamento = isCasamento(item?.tipo);
    const isAlvara = isEmitirAlvara(item?.tipo);

    // padrão antigo (1 cidadao)
    const cid = dados?.cidadao || {};

    // casamento (vários cidadaos)
    const noivo = dados?.cidadaoNoivo || null;
    const noiva = dados?.cidadaoNoiva || null;

    const testemunhas = [
        dados?.cidadaoTest1,
        dados?.cidadaoTest2,
        dados?.cidadaoTest3,
    ].filter(Boolean);


    let payloadPessoa = {
        nomeCompleto: cid?.nomeCompleto,
        registro: cid?.id,
        discordId: cid?.discordId,
        pombo: cid?.pombo,
        identidade: cid?.identidade,
        profissao: cid?.profissao,
        residencia: cid?.residencia,
    };

    if (casamento) {
        payloadPessoa = {
            noivo: mapPessoaCidadao(noivo),
            noiva: mapPessoaCidadao(noiva),
            testemunhas: testemunhas.map(mapPessoaCidadao),
        };
    } else if (isAlvara) {
        payloadPessoa = {
            razaosocial: dados?.razaosocial,
            setor: dados?.setor,
            cidade: dados?.cidade,
            estado: dados?.nomeEstado,
        };
    }

    return {
        id: item.numero,
        tipo: item.tipo,
        status: item.status,

        aprovadoPor:
            item?.dados?.workflow?.juiz?.aprovadoPorNome ||
            reqUser?.username ||
            String(reqUser?.id || "Sistema"),

        ...payloadPessoa,

        ...(isTroca && { novoNome: dados?.novoNome }),

        ...(isPorte && {
            validade: dados?.workflow?.juiz?.validade || dados?.validade || null,
            arma: dados?.arma || null,
        }),
    };
}



async function resolveNomeAprovador(reqUser, CadastroCidadao) {
    if (reqUser?.discordId) {
        const c = await CadastroCidadao.findOne({ where: { discordId: String(reqUser.discordId) } });
        if (c?.nomeCompleto) return c.nomeCompleto;
    }
    return reqUser?.username || String(reqUser?.id || "Sistema");
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
    // ⚠️ fora do try também, pra logar até se estourar antes
    try {
        const numero = Number(req.params.numero);
        if (!Number.isFinite(numero)) return res.status(400).json({ msg: "Número inválido" });

        const item = await Requerimento.findOne({ where: { numero } });
        if (!item) return res.status(404).json({ msg: "Requerimento não encontrado" });

        if (item.status !== "PENDENTE") {
            return res.status(400).json({ msg: "Somente PENDENTES podem ser aprovados" });
        }

        const role = req.user?.role;






        const discordId = await User.findOne({ where: { id: req.user.id } })


        const Solicitante = await CadastroCidadao.findOne({
            where: { discordId: discordId.discordId }
        })


        const aprovadoPorNome = Solicitante.nomeCompleto
        const dadosJson = item.dados || {};

        item.dados = {
            ...dadosJson,
            workflow: {
                ...(dadosJson.workflow || {}),
                juiz: {
                    ...(dadosJson.workflow?.juiz || {}),
                    aprovadoPor: req.user?.id || null,
                    aprovadoPorNome
                }
            }
        }

        await item.save();




        if (item.tipo === "Emitir Alvará") {
            const dados = item.dados || {};

            item.dados = {
                ...dados,
                workflow: {
                    ...(dados.workflow || {}),
                    juiz: {
                        ...(dados.workflow?.juiz || {}),
                        aprovado: true,
                        validade: "30 dias",
                        data: new Date().toISOString(),
                    },
                },
            };


            await item.save();

        }


        if ((item.tipo === "Porte de Arma" || item.tipo === "Porte de Armas")) {
            const dadosAtual = item.dados || {};

            item.status = "AGUARDANDO_CARIMBO";
            item.dados = {
                ...dadosAtual,
                workflow: {
                    ...(dadosAtual.workflow || {}),
                    juiz: {
                        ...(dadosAtual.workflow?.juiz || {}),
                        aprovado: true,
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

                const payload = await buildWebhookPayload(item, req.user);
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


        if (item.tipo === "Casamento") {
            const dados = item.dados || {};

            const noivoId = dados?.cidadaoNoivo?.id;
            const noivaId = dados?.cidadaoNoiva?.id;

            if (!noivoId || !noivaId) {
                throw new Error("Casamento: cidadaoNoivo.id ou cidadaoNoiva.id ausente no JSON dados.");
            }

            const noivo = await CadastroCidadao.findOne({ where: { id: noivoId } });
            const noiva = await CadastroCidadao.findOne({ where: { id: noivaId } });

            if (!noivo || !noiva) {
                throw new Error("Casamento: noivo ou noiva não encontrados no cartório.");
            }

            await noivo.update({ conjuge: noivaId });
            await noiva.update({ conjuge: noivoId });



            item.dados = {
                ...dados,
                workflow: {
                    ...(dados.workflow || {}),
                    juiz: {
                        ...(dados?.workflow?.juiz || {}),
                        aprovado: true,
                        data: new Date().toISOString(),
                    },
                },
            };

            await item.save();

        }

        if (item.tipo === "Troca de Nome") {
            const discordId = item?.dados.cidadao.discordId;
            const novoNome = item?.dados?.novoNome;

            if (!discordId || !novoNome) {
                throw new Error("Troca de Nome: discordId ou novoNome ausente no JSON dados.");
            }
            const cidadao = await CadastroCidadao.findOne({ where: { discordId } });

            if (!cidadao) {
                throw new Error(`Cidadão não encontrado no cartório para o discordId=${discordId}`)
            }

            await cidadao.update({ nomeCompleto: String(novoNome).trim() });
        }

        // ✅ Fluxo padrão: finaliza aprovação
        item.status = "APROVADO";
        await item.save();

        // ✅ Decide qual webhook mandar
        const hookType = webhookTypeByRequerimentoTipo(item.tipo);

        if (hookType) {

            console.log(item)
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