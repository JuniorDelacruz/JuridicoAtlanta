// backend/routes/arquivos.routes.js
import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { getCidadao, getVinculosCidadao } from "../controllers/arquivos.controller.js";

const router = Router();

// ✅ protegido por token (se quiser, depois você adiciona RBAC aqui também)
router.get("/cidadao", authMiddleware(), getCidadao);
router.get("/cidadao/vinculos", authMiddleware(), getVinculosCidadao);

export default router;