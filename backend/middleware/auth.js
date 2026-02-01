// backend/middleware/auth.js
import jwt from "jsonwebtoken";
import db from "../models/index.js";

const { User } = db;

const normalize = (v) => String(v || "").trim().toLowerCase();

const authMiddleware =
  ({ roles = [], subRoles = [] } = {}) =>
  async (req, res, next) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    if (!token) return res.status(401).json({ msg: "Acesso negado: token não fornecido" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userId = decoded?.id;
      if (!userId) return res.status(401).json({ msg: "Token inválido (sem id)." });

      const userDb = await User.findByPk(userId, {
        attributes: ["id", "username", "discordId", "role", "subRole"],
      });

      if (!userDb) return res.status(401).json({ msg: "Usuário não existe mais." });

      req.user = {
        id: userDb.id,
        username: userDb.username,
        discordId: userDb.discordId,
        role: userDb.role,
        subRole: userDb.subRole,
      };

      // ✅ validação
      const role = normalize(req.user.role);
      const subRole = normalize(req.user.subRole);

      const allowedRoles = roles.map(normalize);
      const allowedSubRoles = subRoles.map(normalize);

      // Se não exigiu nada, só autentica e passa
      const hasRoleRule = allowedRoles.length > 0;
      const hasSubRoleRule = allowedSubRoles.length > 0;

      if (hasRoleRule || hasSubRoleRule) {
        const okRole = hasRoleRule ? allowedRoles.includes(role) : false;
        const okSub = hasSubRoleRule ? allowedSubRoles.includes(subRole) : false;

        // ✅ OU: basta um dos dois bater
        if (!okRole && !okSub) {
          return res.status(403).json({ msg: "Acesso negado: permissão insuficiente" });
        }
      }

      return next();
    } catch (err) {
      console.error("Erro ao verificar token:", err.message);
      return res.status(401).json({ msg: "Token inválido ou expirado" });
    }
  };

export default authMiddleware;
