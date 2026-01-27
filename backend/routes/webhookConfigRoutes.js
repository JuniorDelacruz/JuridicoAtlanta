// backend/routes/webhookConfigRoutes.js
import { Router } from "express";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from "../controllers/webhookConfigController.js";

import auth from "../middleware/auth.js"; // <= ajuste pro seu middleware real
import { requireRoles } from "../middleware/roleGuard.js";

const router = Router();

// Somente admin/juiz (ajuste se quiser)
router.use(auth, requireRoles("admin", "juiz"));

router.get("/", listWebhooks);
router.post("/", createWebhook);
router.put("/:id", updateWebhook);
router.delete("/:id", deleteWebhook);

export default router;