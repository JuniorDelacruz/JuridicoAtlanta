// backend/middleware/auth.js
import jwt from "jsonwebtoken";

const authMiddleware = (allowedRoles = []) => (req, res, next) => {
  // ✅ libera preflight do CORS
  if (req.method === "OPTIONS") return res.sendStatus(204);

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.status(401).json({ msg: "Acesso negado: token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const role = String(decoded.role || "").trim().toLowerCase();
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