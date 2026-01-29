// backend/routes/me.routes.js
import { Router } from "express";
import authMiddleware from '../middleware/auth.js';
import { getMeuCidadao } from "../controllers/me.controller.js";

const r = Router();
r.get("/cidadao", authMiddleware(), getMeuCidadao);

export default r;