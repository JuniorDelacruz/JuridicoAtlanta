// backend/controllers/arquivos.controller.js
import { Op, Sequelize } from "sequelize";
import db from "../models/index.js"; // ajuste se seu projeto exporta de outro jeito

const { CadastroCidadao, Requerimento } = db;

const normalize = (v) => String(v ?? "").trim();
const isNumeric = (s) => /^\d+$/.test(String(s || "").trim());

function safeCidadao(c) {
    if (!c) return null;
    return {
        id: c.id,
        nomeCompleto: c.nomeCompleto,
        identidade: c.identidade,
        status: c.status,
        discordId: c.discordId,
        pombo: c.pombo,
        profissao: c.profissao,
        residencia: c.residencia,
        // imagemIdentidade: c.imagemIdentidade, // ⚠️ recomendo NÃO enviar por padrão (privacidade). Libera se quiser.
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}

function buildJsonbEqualsAny(fieldPaths, value) {
    const v = String(value);


    // comparação em TEXT (jsonb ->> 'campo') = 'valor'
    return fieldPaths.map((path) =>
        Sequelize.where(Sequelize.json(path), v)
    );
}

function classifyRequerimento(req) {
    const tipo = String(req?.tipo || "").toLowerCase();

    // heurísticas: ajusta depois quando seus tipos estiverem “cravados”
    const isPorte =
        tipo.includes("porte") && (tipo.includes("arma") || tipo.includes("armas"));
    const isTrocaNome =
        tipo.includes("troca") && tipo.includes("nome");

    if (isPorte) return "porte";
    if (isTrocaNome) return "trocaNome";
    return "outro";
}

function mapPorte(req) {
    const d = req.dados || {};

    const validade =
        d?.workflow?.juiz?.validade ||
        d.validade ||
        d.dataValidade ||
        d.vencimento ||
        null;

    return {
        id: req.id ?? req.numero,
        numero: req.numero,
        status: req.status,
        // você decide seu campo real (validade / dataValidade / vencimento)
        validade,
        arma: d.arma || d.armas || null,
        createdAt: req.createdAt,
    };
}

function mapTrocaNome(req) {
    const d = req.dados || {};
    return {
        id: req.id ?? req.numero,
        numero: req.numero,
        status: req.status,
        novoNome: d.novoNome || d.nomeNovo || d.nome || null,
        motivo: d.motivo || null,
        createdAt: req.createdAt,
    };
}

function mapOutro(req) {
    return {
        id: req.id ?? req.numero,
        numero: req.numero,
        tipo: req.tipo,
        status: req.status,
        createdAt: req.createdAt,
    };
}

/**
 * GET /api/arquivos/cidadao?query=...&mode=id|nome
 */
export async function getCidadao(req, res) {
    try {
        const query = normalize(req.query.query);
        const mode = normalize(req.query.mode) || "nome";

        if (!query) return res.status(400).json({ message: "Parâmetro query é obrigatório." });

        let cidadao = null;

        if (mode === "id") {
            // tenta por PK (id numérico), depois identidade, depois discordId
            const whereOr = [];

            if (isNumeric(query)) whereOr.push({ id: Number(query) });

            // identidade pode ser numérica ou string (depende do seu RP)
            whereOr.push({ identidade: query });

            // discordId normalmente é string numérica grande
            whereOr.push({ discordId: query });

            cidadao = await CadastroCidadao.findOne({
                where: { [Op.or]: whereOr },
                order: [["updatedAt", "DESC"]],
            });
        } else {
            // modo nome: ILIKE %query%
            cidadao = await CadastroCidadao.findOne({
                where: {
                    nomeCompleto: { [Op.iLike]: `%${query}%` },
                },
                order: [["updatedAt", "DESC"]],
            });

            // fallback: se ninguém por nome, tenta identidade exata
            if (!cidadao) {
                cidadao = await CadastroCidadao.findOne({
                    where: { identidade: query },
                    order: [["updatedAt", "DESC"]],
                });
            }
        }

        return res.json({ cidadao: safeCidadao(cidadao) });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

/**
 * GET /api/arquivos/cidadao/vinculos?cidadaoId=...&identidade=...
 */
export async function getVinculosCidadao(req, res) {
    try {
        const cidadaoId = normalize(req.query.cidadaoId);
        const identidade = normalize(req.query.identidade);

        if (!cidadaoId && !identidade) {
            return res.status(400).json({ message: "Informe cidadaoId ou identidade." });
        }

        // 1) resolve o cidadão (pra pegar identidade/discordId)
        let cidadao = null;

        if (cidadaoId && isNumeric(cidadaoId)) {
            cidadao = await CadastroCidadao.findByPk(Number(cidadaoId));
        }

        if (!cidadao && identidade) {
            cidadao = await CadastroCidadao.findOne({ where: { identidade } });
        }

        if (!cidadao && cidadaoId) {
            // fallback: cidadaoId pode ser na real “identidade” ou “discordId”
            cidadao = await CadastroCidadao.findOne({
                where: {
                    [Op.or]: [
                        { identidade: cidadaoId },
                        { discordId: cidadaoId },
                    ],
                },
            });
        }

        if (!cidadao) {
            return res.status(404).json({ message: "Cidadão não encontrado para carregar vínculos." });
        }

        const ident = normalize(cidadao.identidade);
        const disc = normalize(cidadao.discordId);
        const idPk = cidadao.id;

        // 2) monta filtro JSONB no requerimentos.dados (PostgreSQL)
        const orJson = [];

        if (ident) {
            orJson.push(
                ...buildJsonbEqualsAny(
                    [
                        "dados.cidadao.identidade",
                        "dados.identidade", // deixa caso alguns antigos usem raiz
                    ],
                    ident
                )
            );
        }


        // discordId (string)
        if (disc) {
            orJson.push(
                ...buildJsonbEqualsAny(
                    [
                        "dados.cidadao.discordId",
                        "dados.discordId",
                        "dados.discord_id",
                    ],
                    disc
                )
            );
        }

        if (idPk !== undefined && idPk !== null) {
            // às vezes você salva o id do cadastro dentro do JSON
            orJson.push(
                ...buildJsonbEqualsAny(["dados.cidadao.id"], idPk),
                ...buildJsonbEqualsAny(["dados.numeroIdentificacao", "dados.numeroRegistro"], idPk)
            );
        }

        // Se nada foi montado (não deveria), bloqueia
        if (orJson.length === 0) {
            return res.json({ portes: [], trocasNome: [], requerimentos: [] });
        }

        // 3) busca requerimentos vinculados
        const reqs = await Requerimento.findAll({
            where: {
                [Op.or]: orJson,
            },
            order: [["createdAt", "DESC"]],
            limit: 200, // evita explodir se tiver muito
        });

        // 4) classifica e retorna no formato do frontend
        const portes = [];
        const trocasNome = [];
        const outros = [];

        for (const r of reqs) {
            const kind = classifyRequerimento(r);
            if (kind === "porte") portes.push(mapPorte(r));
            else if (kind === "trocaNome") trocasNome.push(mapTrocaNome(r));
            else outros.push(mapOutro(r));
        }

        return res.json({
            portes,
            trocasNome,
            requerimentos: outros,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}



export async function suggestCidadao(req, res) {
  try {
    const q = normalize(req.query.q);
    let limit = Number(req.query.limit || 8);

    if (!q || q.length < 2) return res.json({ items: [] });

    // trava pra não explodir
    if (!Number.isFinite(limit) || limit < 1) limit = 8;
    if (limit > 15) limit = 15;

    // se o cara digitou número, não sugere (provavelmente id/identidade)
    if (isNumeric(q)) return res.json({ items: [] });

    const rows = await CadastroCidadao.findAll({
      where: {
        nomeCompleto: { [Op.iLike]: `%${q}%` },
      },
      order: [["updatedAt", "DESC"]],
      limit,
    });

    return res.json({ items: rows.map(safeCidadao) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}