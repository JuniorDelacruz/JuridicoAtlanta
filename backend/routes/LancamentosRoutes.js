import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { Lancamento, Requerimento, User, CadastroCidadao, sequelize } = db;

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function canViewAll(user) {
  const sub = norm(user?.subRole);
  return ["master", "responsaveljuridico", "equipejuridico"].includes(sub);
}

function moneyToCents(v) {
  // aceita "1000", "1000.50", "1.000,50"
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function centsToNumber(c) {
  return Number(c || 0) / 100;
}

async function resolveNomePorDiscordId(discordId) {
  if (!discordId) return null;
  const cad = await CadastroCidadao.findOne({ where: { discordId } });
  return cad?.nomeCompleto || null;
}

/**
 * =========================
 * MEUS LANÇAMENTOS
 * =========================
 */
router.get("/meus", authMiddleware(), async (req, res) => {
  try {
    const rows = await Lancamento.findAll({
      where: { createdBy: req.user.id },
      order: [["data", "DESC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao buscar meus lançamentos" });
  }
});

/**
 * =========================
 * LISTAR (GERAL) — com filtros
 * - paid=0/1
 * - createdBy=ID
 * =========================
 */
router.get("/", authMiddleware(), async (req, res) => {
  try {
    if (!canViewAll(req.user)) {
      return res.status(403).json({ msg: "Sem permissão para ver todos os lançamentos." });
    }

    const paid = req.query.paid; // "0" | "1" | undefined
    const createdBy = req.query.createdBy ? Number(req.query.createdBy) : null;

    const where = {};
    if (createdBy) where.createdBy = createdBy;

    if (paid === "1") where.pagoEm = { [db.Sequelize.Op.ne]: null };
    if (paid === "0") where.pagoEm = null;

    const rows = await Lancamento.findAll({
      where,
      order: [["data", "DESC"]],
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao buscar lançamentos" });
  }
});

/**
 * =========================
 * MEMBROS DO JURÍDICO (tabela de pessoas)
 * =========================
 */
router.get("/membros-juridico", authMiddleware(), async (req, res) => {
  try {
    if (!canViewAll(req.user)) {
      return res.status(403).json({ msg: "Sem permissão." });
    }

    // Regra: pega todo mundo com subRole "equipejuridico" OU roles do jurídico
    // Ajuste aqui se sua regra real for diferente:
    const juridicoRoles = ["escrivao", "tabeliao", "promotor", "conselheiro", "juiz"];

    const users = await User.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { subRole: "equipejuridico" },
          { role: { [db.Sequelize.Op.in]: juridicoRoles } },
        ],
      },
      attributes: ["id", "username", "discordId", "role", "subRole"],
      order: [["username", "ASC"]],
    });

    // puxa nomeCompleto do CadastroCidadao via discordId (se existir)
    const enriched = [];
    for (const u of users) {
      const nomeCompleto = await resolveNomePorDiscordId(u.discordId);
      enriched.push({
        id: u.id,
        username: u.username,
        discordId: u.discordId,
        role: u.role,
        subRole: u.subRole,
        nomeCompleto: nomeCompleto || u.username,
      });
    }

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao buscar membros do jurídico" });
  }
});

/**
 * =========================
 * CRIAR LANÇAMENTO (com vínculo em Requerimento)
 * body:
 * - tipo, titulo, descricao
 * - requerimentoNumero
 * - valorTotal, repasseAdvogado
 * =========================
 */
router.post("/", authMiddleware(), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tipo, titulo, descricao, requerimentoNumero, valorTotal, repasseAdvogado } = req.body;

    if (!tipo) return res.status(400).json({ msg: "Tipo é obrigatório." });
    if (!requerimentoNumero) return res.status(400).json({ msg: "Número do requerimento é obrigatório." });

    const reqNum = Number(requerimentoNumero);
    if (!reqNum || Number.isNaN(reqNum)) return res.status(400).json({ msg: "Requerimento inválido." });

    const requerimento = await Requerimento.findByPk(reqNum, { transaction: t });
    if (!requerimento) return res.status(404).json({ msg: "Requerimento não encontrado." });

    // trava: 1 lançamento por requerimento
    const ja = await Lancamento.findOne({ where: { requerimentoNumero: reqNum }, transaction: t });
    if (ja) return res.status(409).json({ msg: "Esse requerimento já está vinculado a um lançamento." });

    // nome do advogado (quem lançou)
    const advogadoNome =
      (await resolveNomePorDiscordId(req.user?.discordId)) ||
      req.user?.username ||
      req.user?.name ||
      `ID:${req.user?.id}`;

    const advogadoDiscordId = req.user?.discordId ? String(req.user.discordId) : null;

    const totalCents = moneyToCents(valorTotal);
    const repAdvCents = moneyToCents(repasseAdvogado);

    if (totalCents <= 0) return res.status(400).json({ msg: "Valor total precisa ser maior que zero." });
    if (repAdvCents < 0) return res.status(400).json({ msg: "Repasse do advogado inválido." });
    if (repAdvCents > totalCents) return res.status(400).json({ msg: "Repasse do advogado não pode ser maior que o total." });

    const repJurCents = totalCents - repAdvCents;

    const novo = await Lancamento.create(
      {
        tipo,
        titulo: titulo || null,
        descricao: descricao || null,
        status: "ATIVO",
        data: new Date(),
        createdBy: req.user.id,

        requerimentoNumero: reqNum,
        solicitanteNome: requerimento.solicitante || null,

        advogadoNome,
        advogadoDiscordId,

        valorTotalCents: totalCents,
        repasseAdvogadoCents: repAdvCents,
        repasseJuridicoCents: repJurCents,
      },
      { transaction: t }
    );

    // Atualiza dados JSONB do Requerimento: preserva o que já tem e adiciona vínculo
    const oldDados = requerimento.dados || {};
    if (oldDados?.lancamentoVinculado?.id) {
      // redundante com a UNIQUE, mas deixa bem explícito no JSON também
      throw new Error("DADOS_REQUERIMENTO_JA_VINCULADOS");
    }

    requerimento.dados = {
      ...oldDados,
      lancamentoVinculado: {
        id: novo.id,
        tipo: novo.tipo,
        valorTotal: centsToNumber(totalCents),
        repasseAdvogado: centsToNumber(repAdvCents),
        repasseJuridico: centsToNumber(repJurCents),
        advogado: {
          userId: req.user.id,
          nome: advogadoNome,
          discordId: advogadoDiscordId,
        },
        vinculadoEm: new Date().toISOString(),
      },
    };

    await requerimento.save({ transaction: t });

    await t.commit();
    res.json({ msg: "Criado e vinculado ao requerimento", lancamento: novo });
  } catch (err) {
    await t.rollback();
    console.error(err);

    if (err?.message === "DADOS_REQUERIMENTO_JA_VINCULADOS") {
      return res.status(409).json({ msg: "Esse requerimento já possui vínculo registrado no campo dados." });
    }

    res.status(500).json({ msg: "Erro ao criar lançamento" });
  }
});

/**
 * =========================
 * REGISTRAR REPASSE (marcar como pago)
 * body: { ids: number[] }
 * =========================
 */

// GET /api/lancamentos/validar-requerimento/:numero
router.get("/validar-requerimento/:numero", authMiddleware(), async (req, res) => {
    try {
        const numero = Number(req.params.numero);
        if (!numero || Number.isNaN(numero)) {
            return res.status(400).json({ ok: false, msg: "Número do requerimento inválido." });
        }

        const requerimento = await Requerimento.findByPk(numero);
        if (!requerimento) {
            return res.status(404).json({ ok: false, msg: "Requerimento não encontrado." });
        }

        // Já vinculado via tabela de lançamentos (regra principal)
        const ja = await Lancamento.findOne({ where: { requerimentoNumero: numero } });
        if (ja) {
            return res.status(409).json({
                ok: false,
                msg: "Esse requerimento já está vinculado a um lançamento.",
                vinculado: { lancamentoId: ja.id },
            });
        }

        // (opcional) Já vinculado também no JSON do requerimento (se você estiver gravando lá)
        const dados = requerimento.dados || {};
        if (dados?.lancamentoVinculado?.id) {
            return res.status(409).json({
                ok: false,
                msg: "Esse requerimento já possui vínculo registrado.",
                vinculado: { lancamentoId: dados.lancamentoVinculado.id },
            });
        }

        return res.json({
            ok: true,
            msg: "Requerimento OK para vínculo.",
            requerimento: {
                numero: requerimento.numero,
                tipo: requerimento.tipo,
                status: requerimento.status,
                solicitante: requerimento.solicitante,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, msg: "Erro ao validar requerimento." });
    }
});


router.post("/registrar-repasse", authMiddleware(), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!canViewAll(req.user)) {
      return res.status(403).json({ msg: "Sem permissão." });
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ msg: "Envie uma lista de ids." });
    }

    const pagoPorNome =
      (await resolveNomePorDiscordId(req.user?.discordId)) ||
      req.user?.username ||
      req.user?.name ||
      `ID:${req.user?.id}`;

    const now = new Date();

    const [updatedCount] = await Lancamento.update(
      { pagoEm: now, pagoPor: req.user.id, pagoPorNome },
      {
        where: {
          id: { [db.Sequelize.Op.in]: ids.map(Number).filter(Boolean) },
          pagoEm: null, // só paga os pendentes
        },
        transaction: t,
      }
    );

    await t.commit();
    res.json({ msg: "Repasses registrados", updatedCount });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ msg: "Erro ao registrar repasse" });
  }
});

export default router;
