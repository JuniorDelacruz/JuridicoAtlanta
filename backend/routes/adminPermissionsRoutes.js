import express from "express";
import db from "../models/index.js";
import authMiddleware from "../middleware/auth.js";
import { requirePerm } from "../middleware/requirePerm.js";

const router = express.Router();
const { Permission, PermissionGrant } = db;

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

/**
 * IMPORTANTE:
 * - Só quem tiver a permissão admin.perms.manage (ou superadmin) acessa essa área
 */
router.use(authMiddleware());
router.use(requirePerm("admin.perms.manage"));

/**
 * GET /api/admin/perms
 * lista permissões + grants
 */
router.get("/perms", async (req, res) => {
  const perms = await Permission.findAll({
    order: [["group", "ASC"], ["key", "ASC"]],
  });
  const grants = await PermissionGrant.findAll({
    order: [["subjectType", "ASC"], ["subjectValue", "ASC"], ["permissionKey", "ASC"]],
  });
  res.json({ perms, grants });
});

/**
 * POST /api/admin/perms
 * cria uma permissão
 * body: { key, label, description?, group?, active? }
 */
router.post("/perms", async (req, res) => {
  try {
    const { key, label, description, group, active } = req.body;
    if (!key || !label) return res.status(400).json({ msg: "key e label são obrigatórios." });

    const created = await Permission.create({
      key: String(key).trim(),
      label: String(label).trim(),
      description: description || null,
      group: group || null,
      active: active !== undefined ? !!active : true,
    });

    res.json({ msg: "Permissão criada", permission: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao criar permissão." });
  }
});

/**
 * PUT /api/admin/perms/:key
 * edita permissão
 */
router.put("/perms/:key", async (req, res) => {
  try {
    const key = String(req.params.key).trim();
    const perm = await Permission.findOne({ where: { key } });
    if (!perm) return res.status(404).json({ msg: "Permissão não encontrada." });

    const { label, description, group, active } = req.body;
    await perm.update({
      label: label !== undefined ? String(label).trim() : perm.label,
      description: description !== undefined ? (description || null) : perm.description,
      group: group !== undefined ? (group || null) : perm.group,
      active: active !== undefined ? !!active : perm.active,
    });

    res.json({ msg: "Permissão atualizada", permission: perm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao atualizar permissão." });
  }
});

/**
 * POST /api/admin/grants/upsert
 * cria/atualiza grant (toggle allow/deny)
 * body: { subjectType, subjectValue, permissionKey, effect }
 */
router.post("/grants/upsert", async (req, res) => {
  try {
    const { subjectType, subjectValue, permissionKey, effect } = req.body;

    if (!["role", "subRole"].includes(subjectType)) return res.status(400).json({ msg: "subjectType inválido." });
    if (!subjectValue || !permissionKey) return res.status(400).json({ msg: "subjectValue e permissionKey são obrigatórios." });
    if (!["allow", "deny"].includes(effect)) return res.status(400).json({ msg: "effect inválido." });

    // normaliza
    const sv = norm(subjectValue);
    const pk = String(permissionKey).trim();

    const perm = await Permission.findOne({ where: { key: pk } });
    if (!perm) return res.status(404).json({ msg: "Permissão não existe." });

    const [row] = await PermissionGrant.findOrCreate({
      where: { subjectType, subjectValue: sv, permissionKey: pk },
      defaults: { effect },
    });

    if (row.effect !== effect) await row.update({ effect });

    res.json({ msg: "Grant atualizado", grant: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao salvar grant." });
  }
});

/**
 * DELETE /api/admin/grants
 * remove grant (volta a “sem permissão”)
 * body: { subjectType, subjectValue, permissionKey }
 */
router.delete("/grants", async (req, res) => {
  try {
    const { subjectType, subjectValue, permissionKey } = req.body;
    const sv = norm(subjectValue);
    const pk = String(permissionKey).trim();

    await PermissionGrant.destroy({ where: { subjectType, subjectValue: sv, permissionKey: pk } });
    res.json({ msg: "Grant removido" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao remover grant." });
  }
});

export default router;
