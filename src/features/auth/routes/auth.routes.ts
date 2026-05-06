import { Router } from "express";
import { authController } from "../controllers/auth.controller";

const router = Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/verify/:email", authController.verify);
router.get("/forgot-password/:email", authController.forgotPassword);

export default router;
