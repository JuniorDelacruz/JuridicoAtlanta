// backend/src/services/permissionService.js
const norm = (v) => (v ?? "").toString().trim().toLowerCase();

export async function resolveUserPermissions(db, user) {
  const { Permission, PermissionGrant } = db;

  // super bypass (se quiser)
  const sub = norm(user?.subRole);
  if (sub === "master" || sub === "responsaveljuridico") {
    // opcional: devolver tudo ativo
    const all = await Permission.findAll({ where: { active: true }, attributes: ["key"] });
    return new Set(all.map((p) => p.key));
  }

  const role = norm(user?.role);
  const subRole = norm(user?.subRole);

  const grants = await PermissionGrant.findAll({
    where: {
      [db.Sequelize.Op.or]: [
        { subjectType: "role", subjectValue: role },
        { subjectType: "subRole", subjectValue: subRole },
      ],
    },
    attributes: ["permissionKey", "effect"],
  });

  // DENY > ALLOW
  const denied = new Set(grants.filter(g => g.effect === "deny").map(g => g.permissionKey));
  const allowed = new Set(grants.filter(g => g.effect === "allow").map(g => g.permissionKey));

  for (const k of denied) allowed.delete(k);

  return allowed;
}
