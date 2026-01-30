// backend/middleware/auth.js
import jwt from "jsonwebtoken";

const authMiddleware = (allowedRoles = []) => (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  console.log("AUTH HEADER RAW:", req.headers.authorization);
  const authHeader = req.headers.authorization || req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.status(401).json({ msg: "Acesso negado: token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const role = String(decoded.role || "").trim().toLowerCase();
    const allowed = allowedRoles.map(r => String(r).trim().toLowerCase());

    if (allowed.length > 0 && !allowed.includes(role)) {
      return res.status(403).json({ msg: "Acesso negado: cargo insuficiente" });
    }

    return next();
  } catch (err) {
    console.error("Erro ao verificar token:", err.message);
    return res.status(401).json({ msg: "Token inválido ou expirado" });
  }
};

export default authMiddleware;