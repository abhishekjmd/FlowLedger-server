import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { HttpException } from "@/middleware/error.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { z } from "zod";

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and account management
 */
export class UserController {
	/**
	 * @swagger
	 * /user/me:
	 *   get:
	 *     summary: Get currently logged-in user profile
	 *     tags: [Users]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: User profile retrieved successfully
	 */
	me = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const user = await userService.getUser(userId);
		res.status(200).json(ApiResponse.success("User profile retrieved", { user }));
	});

	/**
	 * @swagger
	 * /user/profile:
	 *   patch:
	 *     summary: Update user profile details
	 *     tags: [Users]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               name: { type: string, example: "John Smith" }
	 *               username: { type: string, example: "johnsmith" }
	 *     responses:
	 *       200:
	 *         description: Profile updated successfully
	 */
	updateProfile = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const data = z
			.object({
				name: z.string().min(2).optional(),
				username: z.string().min(3).optional(),
			})
			.parse(req.body);

		if (Object.keys(data).length === 0) {
			throw new HttpException("No update data provided", 400);
		}

		const user = await userService.updateProfile(userId, data);
		res.status(200).json(ApiResponse.success("Profile updated successfully", { user }));
	});

	/**
	 * @swagger
	 * /user/avatar:
	 *   patch:
	 *     summary: Update user avatar image
	 *     tags: [Users]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         multipart/form-data:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               avatar:
	 *                 type: string
	 *                 format: binary
	 *     responses:
	 *       200:
	 *         description: Avatar updated successfully
	 */
	updateAvatar = asyncHandler(async (req: Request, res: Response) => {
		if (!req.file) throw new HttpException("No file uploaded", 400);

		const userId = res.locals.user.id;
		const profile = await userService.updateAvatar(userId, req.file);

		res.status(200).json(ApiResponse.success("Avatar updated successfully", { profile }));
	});
}

export const userController = new UserController();
