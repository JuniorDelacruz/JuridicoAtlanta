// backend/controllers/cartorio.controller.js (ou um novo controller)
import { where } from "sequelize";
import db from "../models/index.js";
const { Requerimento, CadastroCidadao } = db;

function isPorteDeArmas(tipo) {
    const t = String(tipo || "").toLowerCase();
    return t.includes("porte") && (t.includes("arma") || t.includes("armas"));
}

export async function validarPorte(req, res) {
    try {
        const porteNumero = Number(req.body?.porteNumero);
        const cidadaoId = String(req.body?.cidadaoId || "").trim();

        if (!porteNumero || !cidadaoId) {
            return res.status(400).json({ ok: false, message: "Informe porteNumero e cidadaoId." });
        }

        const porteReq = await Requerimento.findOne({
            where: { numero: porteNumero },
        });

        if (!porteReq) {
            return res.status(404).json({ ok: false, message: "Porte não encontrado." });
        }

        if (!isPorteDeArmas(porteReq.tipo)) {
            return res.status(400).json({ ok: false, message: "Esse requerimento não é Porte de Armas." });
        }

        // eu recomendo exigir aprovado, pra evitar registrar arma com porte pendente
        if (porteReq.status !== "APROVADO") {
            return res.status(400).json({ ok: false, message: "Porte ainda não está APROVADO." });
        }

        const porteCidId = String(porteReq?.dados?.cidadao?.id || "").trim();
        if (!porteCidId) {
            return res.status(400).json({ ok: false, message: "Porte sem dados.cidadao.id." });
        }

        if (porteCidId !== cidadaoId) {
            return res.status(400).json({
                ok: false,
                message: "O Número do Cidadão não bate com o cidadão do Porte.",
            });
        }

        return res.json({
            ok: true,
            porte: {
                numero: porteReq.numero,
                tipo: porteReq.tipo,
                status: porteReq.status,
                validade: porteReq?.dados?.workflow?.juiz?.validade ?? null,
                arma: porteReq?.dados?.arma ?? null,
            },
        });
    } catch (err) {
        return res.status(500).json({ ok: false, message: err.message });
    }
}


export async function criarRegistroArma(req, res) {
    try {
        const cidadaoId = Number(req.body?.cidadaoId);
        const porteNumero = Number(req.body?.porteNumero);
        const numeroSerial = String(req.body?.numeroSerial || "").trim();

        if (!Number.isInteger(cidadaoId)) {
            return res.status(400).json({ ok: false, message: "cidadaoId inválido." });
        }
        if (!Number.isInteger(porteNumero)) {
            return res.status(400).json({ ok: false, message: "porteNumero inválido." });
        }
        if (!numeroSerial) {
            return res.status(400).json({ ok: false, message: "numeroSerial é obrigatório." });
        }

        if (!req.file) {
            return res.status(400).json({ ok: false, message: "Envie a imagem." });
        }

        const cidadao = await CadastroCidadao.findOne({ where: { id: cidadaoId } });
        if (!cidadao) {
            return res.status(404).json({ ok: false, message: "Cidadão não encontrado." });
        }

        // discordId SEMPRE string
        const discordId = String(req.user?.id || "").trim();
        const displayRow = await CadastroCidadao.findOne({ where: { discordId } });

        const solicitante =
            displayRow?.nomeCompleto ||
            req.user?.username ||
            req.user?.name ||
            discordId ||
            "Sistema";

        const novo = await Requerimento.create({
            tipo: "Registro de Arma",
            status: "PENDENTE",
            solicitante,
            userId: req.user.id, // aqui ok se seu JWT tem o PK do User; se não tiver, tem que ajustar
            dados: {
                cidadao: {
                    id: cidadao.id,
                    nomeCompleto: cidadao.nomeCompleto,
                    identidade: cidadao.identidade,
                    profissao: cidadao.profissao,
                    residencia: cidadao.residencia,
                    discordId: cidadao.discordId,
                    pombo: cidadao.pombo,
                },
                porteNumero,
                numeroSerial,
                imagemIdentidadeUrl: `https://apijuridico.starkstore.dev.br/uploads/${req.file.filename}`,
            },
        });

        return res.json({ ok: true, msg: "Registro de Arma enviado para triagem!", requerimento: { numero: novo.numero } });
    } catch (err) {
        return res.status(500).json({ ok: false, message: err.message });
    }
}