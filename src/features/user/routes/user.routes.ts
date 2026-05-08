import { Router } from "express";
import multer from "multer";
import { userController } from "../controllers/user.controller";
import { requireAuth } from "@/middleware/clerk.middleware";

const router = Router();
const upload = multer({
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Only image files are allowed"));
		}
	},
});

// All routes are protected
router.use(requireAuth);

router.get("/me", userController.me);
router.patch("/profile", userController.updateProfile);
router.patch("/avatar", upload.single("avatar"), userController.updateAvatar);

export default router;
