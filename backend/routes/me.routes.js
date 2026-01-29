// backend/routes/me.routes.js
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { getMeuCidadao } from "../controllers/me.controller.js";

const r = Router();
r.get("/cidadao", requireAuth, getMeuCidadao);

export default r;