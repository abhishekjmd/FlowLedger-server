import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { authMiddleware } from "@/features/auth/middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/monthly", analyticsController.getMonthly);
router.get("/categories", analyticsController.getCategories);
router.get("/trends", analyticsController.getTrends);
router.get("/insights", analyticsController.getInsights);

export default router;
