import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";
import { requirePerm } from "../middleware/requirePerm.js";

const router = express.Router();
const { Lancamento, Requerimento, User, CadastroCidadao, ServicoJuridico, sequelize } = db;

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function isHighSubRole(subRole) {
  const s = norm(subRole);
  return s === "master" || s === "responsaveljuridico";
}

function canViewAll(user) {
  const sub = norm(user?.subRole);
  const role = norm(user?.role);

  // quem pode ver o geral
  const allowedSubRoles = ["master", "responsaveljuridico", "equipejuridico"];
  const allowedRoles = ["juiz", "promotor chefe"];

  return allowedSubRoles.includes(sub) || allowedRoles.includes(role);
}

function moneyToCents(v) {
  // aceita "1000", "1000.50", "1.000,50"
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n)) return null;
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

function countArmasFromDados(dados) {
  const a = dados?.arma;
  if (!a) return 0;
  if (Array.isArray(a)) return a.filter(Boolean).length;
  return 1;
}

function isPorteTipo(tipo) {
  const t = norm(tipo);
  return t.includes("porte");
}

/**
 * =========================
 * VALIDAR REQUERIMENTO
 * GET /api/lancamentos/validar-requerimento/:numero
 * =========================
 */
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

    const dados = requerimento.dados || {};
    const porte = isPorteTipo(requerimento.tipo);

    if (!porte) {
      const ja = await Lancamento.findOne({ where: { requerimentoNumero: numero } });
      if (ja) {
        return res.status(409).json({
          ok: false,
          msg: "Esse requerimento já está vinculado a um lançamento.",
          vinculado: { lancamentoId: ja.id },
        });
      }

      // mantém também a checagem antiga do campo dados (pra não-porte)
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
    }

    // ✅ PORTE: permite vários vínculos até bater o limite de armas
    const armasCount = countArmasFromDados(dados);
    if (armasCount <= 0) {
      return res.status(400).json({ ok: false, msg: "Porte sem armas em dados.arma." });
    }

    const vinculosCount = await Lancamento.count({ where: { requerimentoNumero: numero } });

    if (vinculosCount >= armasCount) {
      return res.status(409).json({
        ok: false,
        msg: `Todas as armas desse porte já foram lançadas (${vinculosCount}/${armasCount}).`,
        limite: { armasCount, vinculosCount },
      });
    }

    return res.json({
      ok: true,
      msg: `Requerimento OK para vínculo (porte). (${vinculosCount}/${armasCount})`,
      requerimento: {
        numero: requerimento.numero,
        tipo: requerimento.tipo,
        status: requerimento.status,
        solicitante: requerimento.solicitante,
      },
      porte: {
        armasCount,
        vinculosCount,
        proximoVinculo: vinculosCount + 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: "Erro ao validar requerimento." });
  }
});

/**
 * =========================
 * MEUS LANÇAMENTOS
 * GET /api/lancamentos/meus
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
 * MEMBROS DO JURÍDICO
 * GET /api/lancamentos/membros-juridico
 * =========================
 */
router.get("/membros-juridico", authMiddleware(), async (req, res) => {
  try {
    if (!canViewAll(req.user)) {
      return res.status(403).json({ msg: "Sem permissão." });
    }

    const juridicoRoles = [
      "escrivao",
      "tabeliao",
      "promotor",
      "conselheiro",
      "juiz",
      "promotor chefe",
      "advogado",
      "auxiliar",
      "desembargador",
    ];

    const users = await User.findAll({
      where: {
        [db.Sequelize.Op.or]: [{ subRole: "equipejuridico" }, { role: { [db.Sequelize.Op.in]: juridicoRoles } }],
      },
      attributes: ["id", "username", "discordId", "role", "subRole"],
      order: [["username", "ASC"]],
    });

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
 * LISTAR (GERAL)
 * GET /api/lancamentos?paid=0/1&createdBy=ID
 * =========================
 */
router.get("/", authMiddleware(), requirePerm("lancamentos.view_all"), async (req, res) => {
  try {
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
 * CRIAR LANÇAMENTO (vínculo + valores automáticos do serviço)
 * POST /api/lancamentos
 * =========================
 */
router.post("/", authMiddleware(), requirePerm("lancamentos.create"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { servicoId, titulo, descricao, requerimentoNumero, valorTotal, repasseAdvogado } = req.body;

    if (!servicoId) return res.status(400).json({ msg: "Serviço é obrigatório." });
    if (!requerimentoNumero) return res.status(400).json({ msg: "Número do requerimento é obrigatório." });

    const reqNum = Number(requerimentoNumero);
    if (!reqNum || Number.isNaN(reqNum)) return res.status(400).json({ msg: "Requerimento inválido." });

    // ✅ lock aqui, não no COUNT
    const requerimento = await Requerimento.findByPk(reqNum, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!requerimento) return res.status(404).json({ msg: "Requerimento não encontrado." });

    const porte = isPorteTipo(requerimento.tipo);
    let numeroVinculo = null;

    if (!porte) {
      const ja = await Lancamento.findOne({ where: { requerimentoNumero: reqNum }, transaction: t });
      if (ja) return res.status(409).json({ msg: "Esse requerimento já está vinculado a um lançamento." });

      // se seu sistema usa esse campo como trava, mantém
      const oldDados = requerimento.dados || {};
      if (oldDados?.lancamentoVinculado?.id) {
        return res.status(409).json({ msg: "Esse requerimento já possui vínculo registrado no campo dados." });
      }
    } else {
      const dadosReq = requerimento.dados || {};
      const armasCount = countArmasFromDados(dadosReq);
      if (armasCount <= 0) return res.status(400).json({ msg: "Porte sem armas em dados.arma." });

      // ✅ mais robusto que count: pega o maior numeroVinculo e soma 1
      const last = await Lancamento.findOne({
        where: { requerimentoNumero: reqNum },
        attributes: ["numeroVinculo"],
        order: [["numeroVinculo", "DESC"]],
        transaction: t,
      });

      const lastNum = Number(last?.numeroVinculo || 0);
      const nextNum = lastNum + 1;

      if (nextNum > armasCount) {
        return res.status(409).json({
          msg: `Todas as armas desse porte já foram lançadas (${armasCount}/${armasCount}).`,
        });
      }

      numeroVinculo = nextNum;
    }

    const servico = await ServicoJuridico.findByPk(Number(servicoId), { transaction: t });
    if (!servico || !servico.ativo) return res.status(404).json({ msg: "Serviço não encontrado ou inativo." });

    const advogadoNome =
      (await resolveNomePorDiscordId(req.user?.discordId)) ||
      req.user?.username ||
      req.user?.name ||
      `ID:${req.user?.id}`;

    const advogadoDiscordId = req.user?.discordId ? String(req.user.discordId) : null;

    // valores padrão do serviço
    let totalCents = Number(servico.valorTotalCents || 0);
    let repAdvCents = Number(servico.repasseAdvogadoCents || 0);

    // override (somente master/responsavel)
    if (isHighSubRole(req.user?.subRole)) {
      const oTotal = moneyToCents(valorTotal);
      const oRep = moneyToCents(repasseAdvogado);

      if (oTotal !== null) totalCents = oTotal;
      if (oRep !== null) repAdvCents = oRep;
    }

    if (!Number.isFinite(totalCents) || totalCents <= 0) return res.status(400).json({ msg: "Valor total inválido no serviço." });
    if (!Number.isFinite(repAdvCents) || repAdvCents < 0) return res.status(400).json({ msg: "Repasse inválido no serviço." });
    if (repAdvCents > totalCents) return res.status(400).json({ msg: "Repasse do advogado não pode ser maior que o total." });

    const repJurCents = totalCents - repAdvCents;

    const novo = await Lancamento.create(
      {
        tipo: servico.value,
        servicoId: servico.id,
        servicoLabel: servico.label,

        titulo: titulo || null,
        descricao: descricao || null,
        status: "ATIVO",
        data: new Date(),
        createdBy: req.user.id,

        requerimentoNumero: reqNum,
        numeroVinculo, // null pros outros; 1..N no porte
        solicitanteNome: requerimento.solicitante || null,

        advogadoNome,
        advogadoDiscordId,

        valorTotalCents: totalCents,
        repasseAdvogadoCents: repAdvCents,
        repasseJuridicoCents: repJurCents,
      },
      { transaction: t }
    );

    const oldDados = requerimento.dados || {};

    if (!porte) {
      // ✅ aqui você cola seu bloco real (você tinha comentado "/* seu bloco atual */")
      requerimento.dados = {
        ...oldDados,
        lancamentoVinculado: {
          id: novo.id,
          tipo: novo.tipo,
          servico: { id: servico.id, label: servico.label, value: servico.value },
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
    } else {
      const arr = Array.isArray(oldDados?.lancamentosVinculados) ? oldDados.lancamentosVinculados : [];
      arr.push({
        id: novo.id,
        numeroVinculo,
        servico: { id: servico.id, label: servico.label, value: servico.value },
        valorTotal: centsToNumber(totalCents),
        repasseAdvogado: centsToNumber(repAdvCents),
        repasseJuridico: centsToNumber(repJurCents),
        advogado: { userId: req.user.id, nome: advogadoNome, discordId: advogadoDiscordId },
        vinculadoEm: new Date().toISOString(),
      });

      requerimento.dados = {
        ...oldDados,
        lancamentosVinculados: arr,
      };
    }

    await requerimento.save({ transaction: t });

    await t.commit();
    res.json({ msg: "Criado e vinculado ao requerimento", lancamento: novo });
  } catch (err) {
    await t.rollback();
    console.error(err);

    // se você criar o índice UNIQUE e der colisão, cai aqui:
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ msg: "Conflito de vínculo (tente novamente).", detail: err?.errors?.[0]?.message });
    }

    res.status(500).json({ msg: "Erro ao criar lançamento" });
  }
});

/**
 * =========================
 * REGISTRAR REPASSE
 * POST /api/lancamentos/registrar-repasse
 * body: { ids: number[] }
 * =========================
 */
router.post("/registrar-repasse", authMiddleware(), async (req, res) => {
  const t = await sequelize.transaction();
  try {
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
          pagoEm: null,
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
