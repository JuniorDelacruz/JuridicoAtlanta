// backend/routes/requerimentosRoutes.js
import express from "express";
import db from "../models/index.js";
import { Sequelize } from "sequelize";
import authMiddleware from "../middleware/auth.js";
import { createImageUpload } from '../utils/upload.js';

const router = express.Router();
const { Requerimento, User, CadastroCidadao } = db;

const upload = createImageUpload({
    dest: "public/uploads",
    maxSizeMB: 5,
});


const maybeUploadAlvara = (req, res, next) => {
    // se não for multipart, segue normal (JSON)
    if (!req.is("multipart/form-data")) return next();

    // se for multipart, aceita os 3 campos de arquivo
    const mw = upload.fields([
        { name: "fotoNomeEmpresaMapa", maxCount: 1 },
        { name: "fotoFachada", maxCount: 1 },
        { name: "fotoInv", maxCount: 1 },
    ]);

    mw(req, res, (err) => {
        if (err) {
            return res.status(400).json({ msg: err.message || "Erro no upload" });
        }
        next();
    });
};

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

router.post("/", authMiddleware(), maybeUploadAlvara, async (req, res) => {
    const { tipo, dados } = req.body;

    if (!tipo || !dados) {
        return res.status(400).json({ msg: "Tipo e dados são obrigatórios" });
    }
    try {
        // helper: cria snapshot padronizado
        const snapCidadao = (c) => ({
            id: c.id,
            nomeCompleto: c.nomeCompleto,
            identidade: c.identidade,
            profissao: c.profissao,
            residencia: c.residencia,
            discordId: c.discordId,
            pombo: c.pombo,
            status: c.status, // opcional, mas útil
        });

        let dadosComAnexo = {};


        if (tipo === "Emitir Alvará") {
            const files = req.files || {};

            const f1 = files.fotoNomeEmpresaMapa?.[0];
            const f2 = files.fotoFachada?.[0];
            const f3 = files.fotoInv?.[0];

            if (!f1 || !f2 || !f3) {
                return res.status(400).json({
                    msg: "No Alvará, as 3 fotos são obrigatórias: fotoNomeEmpresaMapa, fotoFachada, fotoinv",
                });
            }

            // monta URL pública (igual você já faz no cartório)
            const base = process.env.URLAPI; // ex: https://apijuridico.starkstore.dev.br
            const toUrl = (file) => `${base}/uploads/${file.filename}`;

            dadosComAnexo = {
                ...dados,
                anexos: {
                    fotoNomeEmpresaMapa: toUrl(f1),
                    fotoFachada: toUrl(f2),
                    fotoinv: toUrl(f3),
                },
            };
        }

        if (tipo === "Casamento") {
            // pega e valida os 5
            const ids = {
                noivo: String(dados?.numeroIdentificacaoNoivo || "").trim(),
                noiva: String(dados?.numeroIdentificacaoNoiva || "").trim(),
                test1: String(dados?.numeroIdentificacaoTest1 || "").trim(),
                test2: String(dados?.numeroIdentificacaoTest2 || "").trim(),
                test3: String(dados?.numeroIdentificacaoTest3 || "").trim(),
            };

            // valida vazio
            for (const [k, v] of Object.entries(ids)) {
                if (!v) return res.status(400).json({ msg: `Campo obrigatório não informado: ${k}` });
            }

            // busca (ajuste "id" se sua PK não for id)
            const [cidadaoNoivo, cidadaoNoiva, cidadaoTest1, cidadaoTest2, cidadaoTest3] = await Promise.all([
                CadastroCidadao.findOne({ where: { id: ids.noivo } }),
                CadastroCidadao.findOne({ where: { id: ids.noiva } }),
                CadastroCidadao.findOne({ where: { id: ids.test1 } }),
                CadastroCidadao.findOne({ where: { id: ids.test2 } }),
                CadastroCidadao.findOne({ where: { id: ids.test3 } }),
            ]);

            // valida se achou
            if (!cidadaoNoivo) return res.status(400).json({ msg: "Cartório: noivo não encontrado." });
            if (!cidadaoNoiva) return res.status(400).json({ msg: "Cartório: noiva não encontrada." });
            if (!cidadaoTest1) return res.status(400).json({ msg: "Cartório: testemunha 1 não encontrada." });
            if (!cidadaoTest2) return res.status(400).json({ msg: "Cartório: testemunha 2 não encontrada." });
            if (!cidadaoTest3) return res.status(400).json({ msg: "Cartório: testemunha 3 não encontrada." });

            // se exigir APROVADO
            const mustAprovado = (c, label) => {
                if (c.status !== "APROVADO") {
                    return res.status(400).json({ msg: `Cadastro do(a) ${label} encontrado, porém está ${c.status}.` });
                }
            };
            mustAprovado(cidadaoNoivo, "noivo");
            mustAprovado(cidadaoNoiva, "noiva");
            mustAprovado(cidadaoTest1, "testemunha 1");
            mustAprovado(cidadaoTest2, "testemunha 2");
            mustAprovado(cidadaoTest3, "testemunha 3");

            // monta dados com anexo
            dadosComAnexo = {
                ...dados, // mantém os campos originais (numeros)
                cidadaoNoivo: snapCidadao(cidadaoNoivo),
                cidadaoNoiva: snapCidadao(cidadaoNoiva),
                cidadaoTest1: snapCidadao(cidadaoTest1),
                cidadaoTest2: snapCidadao(cidadaoTest2),
                cidadaoTest3: snapCidadao(cidadaoTest3),
            };
        } else {
            // ===== fluxo antigo (1 cadastro) =====
            const identidade =
                dados.numeroIdentificacao ||
                dados.numeroRegistro ||
                dados.identidade ||
                null;

            let cidadao = null;

            if (identidade) {
                cidadao = await CadastroCidadao.findOne({
                    where: { id: String(identidade).trim() }, // ajuste se precisar
                });

                if (!cidadao) {
                    return res.status(400).json({ msg: "Registro do cartório não encontrado." });
                }

                if (cidadao.status !== "APROVADO") {
                    return res.status(400).json({ msg: `Cadastro encontrado, porém está ${cidadao.status}.` });
                }
            }

            dadosComAnexo = {
                ...dados,
                cidadao: cidadao ? snapCidadao(cidadao) : null,
            };
        }

        // solicitante com safe optional chaining
        const solicitanteRow = await CadastroCidadao.findOne({
            where: { discordId: req.user.discordId },
        });

        const novo = await Requerimento.create({
            tipo,
            dados: dadosComAnexo,
            solicitante: solicitanteRow?.nomeCompleto || req.user?.username,
            status: "PENDENTE",
            userId: req.user.id,
        });

        return res.status(201).json(novo);
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