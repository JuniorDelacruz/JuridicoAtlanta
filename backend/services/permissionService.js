// backend/src/services/permissionService.js
const norm = (v) => (v ?? "").toString().trim().toLowerCase();

export async function resolveUserPermissions(db, user) {
  const { Permission, PermissionGrant } = db;
  const Op = db.Sequelize.Op;

  // Bypass por subRole (como você já fazia)
  const sub = norm(user?.subRole);
  if (sub === "master" || sub === "responsaveljuridico") {
    const all = await Permission.findAll({
      where: { active: true },
      attributes: ["key"],
    });
    return new Set(all.map((p) => p.key));
  }

  // (Opcional) bypass por flag no token (se você tiver)
  if (user?.superadmin || user?.isSuperadmin) {
    const all = await Permission.findAll({
      where: { active: true },
      attributes: ["key"],
    });
    return new Set(all.map((p) => p.key));
  }

  const role = norm(user?.role);
  const subRole = norm(user?.subRole);

  // Pega grants do role e do subRole
  const grants = await PermissionGrant.findAll({
    where: {
      [Op.or]: [
        { subjectType: "role", subjectValue: role },
        { subjectType: "subRole", subjectValue: subRole },
      ],
    },
    attributes: ["permissionKey", "effect"],
  });

  // DENY > ALLOW
  const denied = new Set(
    grants.filter((g) => g.effect === "deny").map((g) => g.permissionKey)
  );
  const allowed = new Set(
    grants.filter((g) => g.effect === "allow").map((g) => g.permissionKey)
  );

  for (const k of denied) allowed.delete(k);

  // ✅ Bypass por permissão (ROLE/SUBROLE) => libera tudo como master/responsável
  if (allowed.has("admin.perms.all")) {
    const all = await Permission.findAll({
      where: { active: true },
      attributes: ["key"],
    });
    return new Set(all.map((p) => p.key));
  }

  return allowed;
}
