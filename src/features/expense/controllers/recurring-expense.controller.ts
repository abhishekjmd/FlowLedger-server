import { Request, Response } from "express";
import { recurringExpenseService } from "../services/recurring-expense.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { z } from "zod";

const recurringSchema = z.object({
	title: z.string().min(1),
	amount: z.number().positive(),
	category_id: z.number(),
	group_id: z.number().optional(),
	frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
	start_date: z.string().optional(),
	end_date: z.string().optional().nullable(),
});

/**
 * @swagger
 * tags:
 *   name: Recurring Expenses
 *   description: Automated expense scheduling
 */
export class RecurringExpenseController {
	/**
	 * @swagger
	 * /expenses/recurring:
	 *   post:
	 *     summary: Create a new recurring expense schedule
	 *     tags: [Recurring Expenses]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [title, amount, category_id, frequency]
	 *             properties:
	 *               title: { type: string, example: "Netflix Subscription" }
	 *               amount: { type: number, example: 15.99 }
	 *               category_id: { type: number, example: 5 }
	 *               frequency: { type: string, enum: [daily, weekly, monthly, yearly], example: "monthly" }
	 *     responses:
	 *       201:
	 *         description: Schedule created successfully
	 */
	create = asyncHandler(async (req: Request, res: Response) => {
		const data = recurringSchema.parse(req.body);
		const userId = res.locals.user.id;
		const result = await recurringExpenseService.create(userId, data);
		res.status(201).json(
			ApiResponse.success("Recurring expense schedule created", result, 201),
		);
	});

	/**
	 * @swagger
	 * /expenses/recurring:
	 *   get:
	 *     summary: List all recurring expense schedules
	 *     tags: [Recurring Expenses]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: List of schedules retrieved
	 */
	list = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const result = await recurringExpenseService.list(userId);
		res.status(200).json(ApiResponse.success("Recurring schedules retrieved", result));
	});

	/**
	 * @swagger
	 * /expenses/recurring/{id}:
	 *   patch:
	 *     summary: Update or pause/resume a recurring schedule
	 *     tags: [Recurring Expenses]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         required: true
	 *         schema: { type: number }
	 *     requestBody:
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               active: { type: boolean }
	 *               amount: { type: number }
	 *     responses:
	 *       200:
	 *         description: Schedule updated successfully
	 */
	update = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = Number(req.params.id);
		const result = await recurringExpenseService.update(userId, id, req.body);
		res.status(200).json(ApiResponse.success("Schedule updated successfully", result));
	});

	/**
	 * @swagger
	 * /expenses/recurring/{id}:
	 *   delete:
	 *     summary: Delete a recurring schedule
	 *     tags: [Recurring Expenses]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         required: true
	 *         schema: { type: number }
	 *     responses:
	 *       200:
	 *         description: Schedule deleted successfully
	 */
	delete = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = Number(req.params.id);
		await recurringExpenseService.delete(userId, id);
		res.status(200).json(ApiResponse.success("Schedule deleted successfully"));
	});
}

export const recurringExpenseController = new RecurringExpenseController();
