import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { Servico } = db;

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function isAdmin(user) {
  const sub = norm(user?.subRole);
  return ["master", "responsaveljuridico"].includes(sub);
}

function canUseServico(user, serv) {
  const sub = norm(user?.subRole);
  if (["master", "responsaveljuridico"].includes(sub)) return true;

  if (serv.allowAny) return true;

  const role = norm(user?.role);
  const roles = (serv.roles || []).map(norm);
  const subRoles = (serv.subRoles || []).map(norm);

  return roles.includes(role) || subRoles.includes(sub);
}

// LISTAR serviços disponíveis pro usuário (select)
router.get("/", authMiddleware(), async (req, res) => {
  try {
    const servicos = await Servico.findAll({ where: { ativo: true }, order: [["label", "ASC"]] });
    const filtrados = servicos.filter((s) => canUseServico(req.user, s));
    res.json(filtrados);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Erro ao listar serviços" });
  }
});

// ADMIN - listar todos (inclui inativos)
router.get("/admin/all", authMiddleware(), async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ msg: "Sem permissão." });
  const servicos = await Servico.findAll({ order: [["label", "ASC"]] });
  res.json(servicos);
});

// ADMIN - criar
router.post("/", authMiddleware(), async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ msg: "Sem permissão." });

  const { tipo, label, allowAny, roles, subRoles, valorTotal, repasseAdvogado, ativo } = req.body;

  if (!tipo || !label) return res.status(400).json({ msg: "tipo e label são obrigatórios." });

  const valorTotalCents = Number(valorTotal) || 0;
  const repasseAdvogadoCents = Number(repasseAdvogado) || 0;

  if (valorTotalCents <= 0) return res.status(400).json({ msg: "Valor total deve ser > 0." });
  if (repasseAdvogadoCents < 0 || repasseAdvogadoCents > valorTotalCents)
    return res.status(400).json({ msg: "Repasse do advogado inválido." });

  const novo = await Servico.create({
    tipo,
    label,
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
});

// ADMIN - editar
router.put("/:id", authMiddleware(), async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ msg: "Sem permissão." });

  const serv = await Servico.findByPk(req.params.id);
  if (!serv) return res.status(404).json({ msg: "Serviço não encontrado." });

  const patch = { ...req.body, atualizadoPor: req.user.id };

  // se mandar valorTotal/repasse como numbers (cents), valida
  if (patch.valorTotalCents !== undefined || patch.repasseAdvogadoCents !== undefined) {
    const vt = patch.valorTotalCents ?? serv.valorTotalCents;
    const ra = patch.repasseAdvogadoCents ?? serv.repasseAdvogadoCents;
    if (vt <= 0) return res.status(400).json({ msg: "Valor total deve ser > 0." });
    if (ra < 0 || ra > vt) return res.status(400).json({ msg: "Repasse inválido." });
  }

  await serv.update(patch);
  res.json(serv);
});

// ADMIN - ativar/inativar
router.post("/:id/toggle", authMiddleware(), async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ msg: "Sem permissão." });

  const serv = await Servico.findByPk(req.params.id);
  if (!serv) return res.status(404).json({ msg: "Serviço não encontrado." });

  serv.ativo = !serv.ativo;
  serv.atualizadoPor = req.user.id;
  await serv.save();

  res.json(serv);
});

export default router;
