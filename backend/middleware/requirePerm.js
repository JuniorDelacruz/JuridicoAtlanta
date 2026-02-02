import db from "../models/index.js";

const { Permission, PermissionGrant } = db;

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function isSuperAdmin(user) {
  const sub = norm(user?.subRole);
  return sub === "master" || sub === "responsaveljuridico";
}

export function requirePerm(permissionKey, opts = {}) {
  const { allowSuperAdmin = true } = opts;

  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ msg: "Não autenticado." });

      if (allowSuperAdmin && isSuperAdmin(req.user)) return next();

      const role = norm(req.user.role);
      const subRole = norm(req.user.subRole);

      // Se a perm não existir ainda, você pode:
      // - bloquear (mais seguro) OU
      // - liberar (não recomendo)
      const perm = await Permission.findOne({ where: { key: permissionKey, active: true } });
      if (!perm) return res.status(403).json({ msg: `Permissão não cadastrada: ${permissionKey}` });

      // busca grants do role e do subRole
      const grants = await PermissionGrant.findAll({
        where: {
          permissionKey,
          [db.Sequelize.Op.or]: [
            { subjectType: "role", subjectValue: role },
            { subjectType: "subRole", subjectValue: subRole },
          ],
        },
      });

      // deny vence
      const hasDeny = grants.some((g) => g.effect === "deny");
      if (hasDeny) return res.status(403).json({ msg: "Acesso negado (deny)." });

      const hasAllow = grants.some((g) => g.effect === "allow");
      if (!hasAllow) return res.status(403).json({ msg: "Sem permissão." });

      return next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: "Erro ao validar permissão." });
    }
  };
}
