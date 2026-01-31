// backend/middleware/auth.js
import jwt from "jsonwebtoken";
import db from "../models/index.js";

const { User } = db;

const authMiddleware = (allowedRoles = []) => async (req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);

   const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  if (!token) return res.status(401).json({ msg: "Acesso negado: token não fornecido" });

  if (!token) {
    return res.status(401).json({ msg: "Acesso negado: token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded?.id;
    if (!userId) {
      return res.status(401).json({ msg: "Token inválido (sem id)." });
    }

    // ✅ pega role real do banco
    const userDb = await User.findByPk(userId, {
      attributes: ["id", "username", "discordId", "role", "subRole"],
    });

    if (!userDb) {
      return res.status(401).json({ msg: "Usuário não existe mais." });
    }

    // ✅ req.user confiável (role do DB)
    req.user = {
      id: userDb.id,
      username: userDb.username,
      discordId: userDb.discordId,
      role: userDb.role,
      subRole: userDb.subRole,
    };

    // ✅ checagem de role (se a rota exigir)
    const role = String(req.user.role || "").trim().toLowerCase();
    const allowed = allowedRoles.map((r) => String(r).trim().toLowerCase());

    if (allowed.length && !allowed.includes(role)) {
      return res.status(403).json({ msg: "Acesso negado: cargo insuficiente" });
    }

    return next();
  } catch (err) {
    console.error("Erro ao verificar token:", err.message);
    return res.status(401).json({ msg: "Token inválido ou expirado" });
  }
};

export default authMiddleware;
