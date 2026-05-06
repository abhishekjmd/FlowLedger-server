import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: System health check
 */
export class HealthController {
	/**
	 * @swagger
	 * /health:
	 *   get:
	 *     summary: Check system health status
	 *     tags: [Health]
	 *     responses:
	 *       200:
	 *         description: System is healthy
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 status: { type: string, example: "healthy" }
	 *                 uptime: { type: number, example: 120.5 }
	 *                 timestamp: { type: string, example: "2024-03-20T10:00:00Z" }
	 */
	check = asyncHandler(async (req: Request, res: Response) => {
		const data = {
			status: "healthy",
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
		};
		res.status(200).json(ApiResponse.success("Server is healthy", data));
	});
}

export const healthController = new HealthController();
