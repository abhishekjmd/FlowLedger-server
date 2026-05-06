import { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Financial insights and spending patterns
 */
export class AnalyticsController {
	/**
	 * @swagger
	 * /analytics/monthly:
	 *   get:
	 *     summary: Get summary for current and last month
	 *     tags: [Analytics]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Monthly summary retrieved
	 */
	getMonthly = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const result = await analyticsService.getMonthlySummary(userId);
		res.status(200).json(ApiResponse.success("Monthly summary retrieved", result));
	});

	/**
	 * @swagger
	 * /analytics/categories:
	 *   get:
	 *     summary: Get spending breakdown by category
	 *     tags: [Analytics]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Category breakdown retrieved
	 */
	getCategories = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const result = await analyticsService.getCategoryBreakdown(userId);
		res.status(200).json(ApiResponse.success("Category breakdown retrieved", result));
	});

	/**
	 * @swagger
	 * /analytics/trends:
	 *   get:
	 *     summary: Get spending trends for the last 6 months
	 *     tags: [Analytics]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Spending trends retrieved
	 */
	getTrends = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const result = await analyticsService.getTrends(userId);
		res.status(200).json(ApiResponse.success("Spending trends retrieved", result));
	});

	/**
	 * @swagger
	 * /analytics/insights:
	 *   get:
	 *     summary: Get rule-based financial insights
	 *     tags: [Analytics]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Financial insights retrieved
	 */
	getInsights = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const result = await analyticsService.getInsights(userId);
		res.status(200).json(ApiResponse.success("Financial insights retrieved", result));
	});
}

export const analyticsController = new AnalyticsController();
