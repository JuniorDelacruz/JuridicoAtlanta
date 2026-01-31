import jwt from "jsonwebtoken";
import db from "../models/index.js";

const { User } = db;

const authMiddleware = (allowedRoles = []) => async (req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  if (!token) return res.status(401).json({ msg: "Acesso negado: token não fornecido" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ pega o usuário REAL do banco (não confia no cargo do token)
    // ajuste aqui conforme seu token tem os campos:
    // ex: decoded.id = userId
    const userId = decoded.id; 
    if (!userId) return res.status(401).json({ msg: "Token inválido (sem id)." });

    const userDb = await User.findByPk(userId, {
      attributes: ["id", "username", "discordId", "role", "subRole", "active", "tokenVersion"],
    });

    if (!userDb) return res.status(401).json({ msg: "Usuário não existe mais." });

    // opcional: se você tiver um campo pra banir/desativar
    if (userDb.active === false) {
      return res.status(401).json({ msg: "Usuário desativado." });
    }

    // ✅ tokenVersion (se quiser revogar tokens antigos)
    // se você colocar tokenVersion no token quando gera:
    // if ((decoded.tokenVersion ?? 0) !== (userDb.tokenVersion ?? 0)) ...
    if ((decoded.tokenVersion ?? 0) !== (userDb.tokenVersion ?? 0)) {
      return res.status(401).json({ msg: "Sessão expirada. Faça login novamente." });
    }

    // ✅ monta req.user confiável (com role do banco)
    req.user = {
      id: userDb.id,
      username: userDb.username,
      discordId: userDb.discordId,
      role: userDb.role,
      subRole: userDb.subRole,
    };

    const role = String(req.user.role || "").trim().toLowerCase();
    const allowed = allowedRoles.map(r => String(r).trim().toLowerCase());

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
