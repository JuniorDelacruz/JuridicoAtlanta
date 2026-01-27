// backend/middleware/auth.js
import jwt from 'jsonwebtoken';

const authMiddleware = (allowedRoles = []) => (req, res, next) => {
  // Pega o token do header Authorization: Bearer <token>
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: 'Acesso negado: token não fornecido' });
  }

  try {
    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Coloca o usuário decodificado no req.user
    req.user = decoded;

    // Se houver roles permitidos, verifica se o usuário tem um deles
    if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ msg: 'Acesso negado: cargo insuficiente' });
    }

    next(); // Prossegue para a rota
  } catch (err) {
    console.error('Erro ao verificar token:', err.message);
    res.status(401).json({ msg: 'Token inválido ou expirado' });
  }
};

export default authMiddleware;