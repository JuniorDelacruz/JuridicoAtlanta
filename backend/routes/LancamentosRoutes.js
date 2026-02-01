import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { Lancamento, Requerimento, User, CadastroCidadao, Servico, sequelize } = db;
const { Op } = db.Sequelize;

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function canViewAll(user) {
  const sub = norm(user?.subRole);
  return ["master", "responsaveljuridico", "equipejuridico"].includes(sub);
}

function isAdminServico(user) {
  const sub = norm(user?.subRole);
  return ["master", "responsaveljuridico"].includes(sub);
}

function canUseServico(user, servico) {
  const sub = norm(user?.subRole);
  if (["master", "responsaveljuridico"].includes(sub)) return true;

  if (servico?.allowAny) return true;

  const role = norm(user?.role);
  const roles = (servico?.roles || []).map(norm);
  const subRoles = (servico?.subRoles || []).map(norm);

  return roles.includes(role) || subRoles.includes(sub);
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
 * ======================================================
 * SERVIÇOS (DINÂMICO) - para o select do lançamento
 * ======================================================
 */

// LISTA serviços que o usuário pode usar (para o select)
router.get("/servicos", authMiddleware(), async (req, res) => {
  try {
    if (!Servico) return res.status(500).json({ msg: "Model Servico não está registrado no db." });

    const rows = await Servico.findAll({
      where: { ativo: true },
      order: [["label", "ASC"]],
    });

    const filtrados = rows.filter((s) => canUseServico(req.user, s));
    res.json(filtrados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao listar serviços" });
  }
});

// ADMIN - listar todos (ativos + inativos)
router.get("/servicos/admin/all", authMiddleware(), async (req, res) => {
  try {
    if (!isAdminServico(req.user)) return res.status(403).json({ msg: "Sem permissão." });
    const rows = await Servico.findAll({ order: [["label", "ASC"]] });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao listar serviços (admin)" });
  }
});

// ADMIN - criar serviço
router.post("/servicos", authMiddleware(), async (req, res) => {
  try {
    if (!isAdminServico(req.user)) return res.status(403).json({ msg: "Sem permissão." });

    const {
      tipo,
      label,
      allowAny,
      roles,
      subRoles,
      valorTotal, // pode vir "1000,00"
      repasseAdvogado, // pode vir "600,00"
      ativo,
    } = req.body;

    if (!tipo) return res.status(400).json({ msg: "tipo é obrigatório." });
    if (!label) return res.status(400).json({ msg: "label é obrigatório." });

    const valorTotalCents = moneyToCents(valorTotal);
    const repasseAdvogadoCents = moneyToCents(repasseAdvogado);

    if (valorTotalCents <= 0) return res.status(400).json({ msg: "Valor total precisa ser maior que zero." });
    if (repasseAdvogadoCents < 0) return res.status(400).json({ msg: "Repasse do advogado inválido." });
    if (repasseAdvogadoCents > valorTotalCents)
      return res.status(400).json({ msg: "Repasse do advogado não pode ser maior que o total." });

    const novo = await Servico.create({
      tipo: String(tipo).trim(),
      label: String(label).trim(),
      allowAny: !!allowAny,
      roles: Array.isArray(roles) ? roles : [],
      subRoles: Array.isArray(subRoles) ? subRoles : [],
      valorTotalCents,
      repasseAdvogadoCents,
      ativo: ativo !== false,
      criadoPor: req.user.id,
      atualizadoPor: req.user.id,
    });

    res.json(novo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao criar serviço" });
  }
});

// ADMIN - editar serviço
router.put("/servicos/:id", authMiddleware(), async (req, res) => {
  try {
    if (!isAdminServico(req.user)) return res.status(403).json({ msg: "Sem permissão." });

    const serv = await Servico.findByPk(req.params.id);
    if (!serv) return res.status(404).json({ msg: "Serviço não encontrado." });

    const patch = { ...req.body, atualizadoPor: req.user.id };

    // se vier valorTotal/repasse em string, converte
    if (patch.valorTotal !== undefined) patch.valorTotalCents = moneyToCents(patch.valorTotal);
    if (patch.repasseAdvogado !== undefined) patch.repasseAdvogadoCents = moneyToCents(patch.repasseAdvogado);

    // valida cents se alterou
    const vt = patch.valorTotalCents ?? serv.valorTotalCents;
    const ra = patch.repasseAdvogadoCents ?? serv.repasseAdvogadoCents;

    if (vt <= 0) return res.status(400).json({ msg: "Valor total precisa ser maior que zero." });
    if (ra < 0) return res.status(400).json({ msg: "Repasse do advogado inválido." });
    if (ra > vt) return res.status(400).json({ msg: "Repasse do advogado não pode ser maior que o total." });

    // campos permitidos
    const allowed = {
      tipo: patch.tipo,
      label: patch.label,
      allowAny: patch.allowAny,
      roles: Array.isArray(patch.roles) ? patch.roles : patch.roles === undefined ? undefined : [],
      subRoles: Array.isArray(patch.subRoles) ? patch.subRoles : patch.subRoles === undefined ? undefined : [],
      valorTotalCents: patch.valorTotalCents,
      repasseAdvogadoCents: patch.repasseAdvogadoCents,
      ativo: patch.ativo,
      atualizadoPor: patch.atualizadoPor,
    };

    // remove undefined
    Object.keys(allowed).forEach((k) => allowed[k] === undefined && delete allowed[k]);

    await serv.update(allowed);
    res.json(serv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao editar serviço" });
  }
});

// ADMIN - ativar/inativar
router.post("/servicos/:id/toggle", authMiddleware(), async (req, res) => {
  try {
    if (!isAdminServico(req.user)) return res.status(403).json({ msg: "Sem permissão." });

    const serv = await Servico.findByPk(req.params.id);
    if (!serv) return res.status(404).json({ msg: "Serviço não encontrado." });

    serv.ativo = !serv.ativo;
    serv.atualizadoPor = req.user.id;
    await serv.save();

    res.json(serv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao alternar serviço" });
  }
});

/**
 * ======================================================
 * VALIDAÇÃO DE REQUERIMENTO (usada no Wizard)
 * ======================================================
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

    // Já vinculado via JSONB
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

    if (paid === "1") where.pagoEm = { [Op.ne]: null };
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

    const juridicoRoles = ["escrivao", "tabeliao", "promotor", "conselheiro", "juiz"];

    const users = await User.findAll({
      where: {
        [Op.or]: [{ subRole: "equipejuridico" }, { role: { [Op.in]: juridicoRoles } }],
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
 * CRIAR LANÇAMENTO (com vínculo em Requerimento)
 * - valores AUTOMÁTICOS via Servico (backend)
 * body:
 * - tipo, titulo, descricao
 * - requerimentoNumero
 * (valorTotal/repasseAdvogado do front são ignorados)
 * =========================
 */
router.post("/", authMiddleware(), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tipo, titulo, descricao, requerimentoNumero } = req.body;

    if (!tipo) return res.status(400).json({ msg: "Tipo é obrigatório." });
    if (!requerimentoNumero) return res.status(400).json({ msg: "Número do requerimento é obrigatório." });

    // carrega serviço e trava se não existir
    if (!Servico) return res.status(500).json({ msg: "Model Servico não está registrado no db." });

    const servico = await Servico.findOne({
      where: { tipo: String(tipo).trim(), ativo: true },
      transaction: t,
    });

    if (!servico) return res.status(400).json({ msg: "Serviço não configurado ou inativo." });

    // valida permissão de usar o serviço
    if (!canUseServico(req.user, servico)) {
      return res.status(403).json({ msg: "Você não tem permissão para usar este serviço." });
    }

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

    // valores automáticos
    const totalCents = Number(servico.valorTotalCents || 0);
    const repAdvCents = Number(servico.repasseAdvogadoCents || 0);

    if (totalCents <= 0) return res.status(400).json({ msg: "Serviço com valor inválido." });
    if (repAdvCents < 0) return res.status(400).json({ msg: "Serviço com repasse inválido." });
    if (repAdvCents > totalCents) return res.status(400).json({ msg: "Serviço com repasse maior que total." });

    const repJurCents = totalCents - repAdvCents;

    const novo = await Lancamento.create(
      {
        tipo: servico.tipo,
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
      throw new Error("DADOS_REQUERIMENTO_JA_VINCULADOS");
    }

    requerimento.dados = {
      ...oldDados,
      lancamentoVinculado: {
        id: novo.id,
        tipo: novo.tipo,
        servicoLabel: servico.label,
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
          id: { [Op.in]: ids.map(Number).filter(Boolean) },
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
