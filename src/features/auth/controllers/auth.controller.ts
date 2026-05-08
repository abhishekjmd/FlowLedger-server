import { Request, Response } from "express";
import prisma from "@/lib/database/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Clerk authentication sync
 */
export class AuthController {
	/**
	 * @swagger
	 * /auth/sync:
	 *   post:
	 *     summary: Sync Clerk user into local database
	 *     tags: [Auth]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: User synced successfully
	 */
	sync = asyncHandler(async (req: Request, res: Response) => {
		const user = res.locals.user;

		const profile = await prisma.profile.findUnique({
			where: { user_id: user.id },
		});

		if (!profile) {
			await prisma.profile.create({
				data: {
					user_id: user.id,
					avatar_color: "#3B82F6",
				},
			});
		}

		const syncedUser = await prisma.user.findUnique({
			where: { id: user.id },
			include: { profile: true },
		});

		res.status(200).json(ApiResponse.success("User synced successfully", { user: syncedUser }));
	});
}

export const authController = new AuthController();
