import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";
import { requirePerm } from "../middleware/requirePerm.js";

const router = express.Router();
const { ServicoJuridico } = db;

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function isHighSubRole(subRole) {
  const s = norm(subRole);
  return s === "master" || s === "responsaveljuridico";
}

function canManageServicos(user) {
  return isHighSubRole(user?.subRole);
}

function canSeeServico(user, servico) {
  if (isHighSubRole(user?.subRole)) return true;

  const role = norm(user?.role);
  const sub = norm(user?.subRole);

  const allow = servico?.allow || {};
  if (allow.any) return true;

  const roles = (allow.roles || []).map(norm);
  const subRoles = (allow.subRoles || []).map(norm);

  return (roles.length && roles.includes(role)) || (subRoles.length && subRoles.includes(sub));
}

/**
 * GET /api/servicos
 * -> usado pelo SELECT do lançamento (retorna somente ativos e que o user pode ver)
 */
router.get("/", authMiddleware(), async (req, res) => {
  try {
    const rows = await ServicoJuridico.findAll({
      where: { ativo: true },
      order: [["label", "ASC"]],
    });

    const filtered = rows.filter((s) => canSeeServico(req.user, s));

    res.json(
      filtered.map((s) => ({
        id: s.id,
        label: s.label,
        value: s.value,
        valorTotalCents: s.valorTotalCents,
        repasseAdvogadoCents: s.repasseAdvogadoCents,
        allow: s.allow,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao listar serviços" });
  }
});

/**
 * GET /api/servicos/admin
 * -> lista tudo (admin)
 */
router.get("/admin", authMiddleware(), requirePerm("servicos.manage"), async (req, res) => {
  try {
    if (!canManageServicos(req.user)) return res.status(403).json({ msg: "Sem permissão." });

    const rows = await ServicoJuridico.findAll({ order: [["label", "ASC"]] });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao listar serviços (admin)" });
  }
});

/**
 * POST /api/servicos
 * -> cria (admin)
 */
router.post("/", authMiddleware(), async (req, res) => {
  try {
    if (!canManageServicos(req.user)) return res.status(403).json({ msg: "Sem permissão." });

    const { label, value, ativo, valorTotalCents, repasseAdvogadoCents, allow } = req.body;

    if (!label || !value) return res.status(400).json({ msg: "label e value são obrigatórios." });

    const total = Number(valorTotalCents || 0);
    const repAdv = Number(repasseAdvogadoCents || 0);

    if (!Number.isFinite(total) || total < 0) return res.status(400).json({ msg: "valorTotalCents inválido." });
    if (!Number.isFinite(repAdv) || repAdv < 0) return res.status(400).json({ msg: "repasseAdvogadoCents inválido." });
    if (repAdv > total) return res.status(400).json({ msg: "repasseAdvogado não pode ser maior que o total." });

    const created = await ServicoJuridico.create({
      label,
      value,
      ativo: ativo !== undefined ? !!ativo : true,
      valorTotalCents: total,
      repasseAdvogadoCents: repAdv,
      allow: allow || { any: true },
    });

    res.json({ msg: "Serviço criado", servico: created });
  } catch (err) {
    console.error(err);
    // unique error
    if (String(err?.name).includes("SequelizeUniqueConstraintError")) {
      return res.status(409).json({ msg: "Já existe um serviço com esse value." });
    }
    res.status(500).json({ msg: "Erro ao criar serviço" });
  }
});

/**
 * PUT /api/servicos/:id
 * -> edita (admin)
 */
router.put("/:id", authMiddleware(), async (req, res) => {
  try {
    if (!canManageServicos(req.user)) return res.status(403).json({ msg: "Sem permissão." });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ msg: "ID inválido." });

    const row = await ServicoJuridico.findByPk(id);
    if (!row) return res.status(404).json({ msg: "Serviço não encontrado." });

    const { label, value, ativo, valorTotalCents, repasseAdvogadoCents, allow } = req.body;

    const total = valorTotalCents !== undefined ? Number(valorTotalCents) : row.valorTotalCents;
    const repAdv = repasseAdvogadoCents !== undefined ? Number(repasseAdvogadoCents) : row.repasseAdvogadoCents;

    if (!Number.isFinite(total) || total < 0) return res.status(400).json({ msg: "valorTotalCents inválido." });
    if (!Number.isFinite(repAdv) || repAdv < 0) return res.status(400).json({ msg: "repasseAdvogadoCents inválido." });
    if (repAdv > total) return res.status(400).json({ msg: "repasseAdvogado não pode ser maior que o total." });

    await row.update({
      label: label !== undefined ? label : row.label,
      value: value !== undefined ? value : row.value,
      ativo: ativo !== undefined ? !!ativo : row.ativo,
      valorTotalCents: total,
      repasseAdvogadoCents: repAdv,
      allow: allow !== undefined ? allow : row.allow,
    });

    res.json({ msg: "Serviço atualizado", servico: row });
  } catch (err) {
    console.error(err);
    if (String(err?.name).includes("SequelizeUniqueConstraintError")) {
      return res.status(409).json({ msg: "Já existe um serviço com esse value." });
    }
    res.status(500).json({ msg: "Erro ao atualizar serviço" });
  }
});

export default router;
