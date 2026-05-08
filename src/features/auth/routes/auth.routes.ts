import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "@/middleware/clerk.middleware";

const router = Router();

router.post("/sync", requireAuth, authController.sync);

export default router;
