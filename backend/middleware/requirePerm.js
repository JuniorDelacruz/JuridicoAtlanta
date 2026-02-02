import db from "../models/index.js";
// backend/src/middleware/requirePerm.js
import { resolveUserPermissions } from "../services/permissionService.js";

const { Permission, PermissionGrant } = db;

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim().toLowerCase());

function isSuperAdmin(user) {
  const sub = norm(user?.subRole);
  return sub === "master" || sub === "responsaveljuridico";
}



export function requirePerm(permissionKey) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ msg: "Não autenticado." });

      // cache na req (não recalcula em toda rota)
      if (!req._permSet) {
        req._permSet = await resolveUserPermissions(req.app.locals.db || req.db || req.models || req.__db || req.dbRef, req.user);
        // ↑ ajuste pra sua forma real de acessar "db"
      }

      if (!req._permSet.has(permissionKey)) {
        return res.status(403).json({ msg: "Sem permissão." });
      }

      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ msg: "Erro ao validar permissão." });
    }
  };
}

