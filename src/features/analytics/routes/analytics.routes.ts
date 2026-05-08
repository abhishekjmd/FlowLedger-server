import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { requireAuth } from "@/middleware/clerk.middleware";

const router = Router();

router.use(requireAuth);

router.get("/monthly", analyticsController.getMonthly);
router.get("/categories", analyticsController.getCategories);
router.get("/trends", analyticsController.getTrends);
router.get("/insights", analyticsController.getInsights);

export default router;
