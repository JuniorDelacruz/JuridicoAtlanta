// backend/routes/me.routes.js
import { Router } from "express";
import authMiddleware from '../middleware/auth.js';
import { getMeuCidadao } from "../controllers/me.controller.js";
import { resolveUserPermissions } from "../services/permissionService.js";
import db from "../models/index.js";

const r = Router();
r.get("/cidadao", authMiddleware(['admin']), getMeuCidadao);


r.get("/me", authMiddleware(), async (req, res) => {
  const permSet = await resolveUserPermissions(db, req.user);
  res.json({
    user: req.user,
    permissions: [...permSet], // array de keys
  });
});

export default r;