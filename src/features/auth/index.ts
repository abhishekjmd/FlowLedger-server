import { Router } from "express";
import { authController } from "./controllers/auth.controller";
import { authMiddleware } from "./middlewares/auth.middleware";

const router = Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.me);

router.post("/send-verification", authController.sendVerification);
router.post("/verify", authController.verify);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
