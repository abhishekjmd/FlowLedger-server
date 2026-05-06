import { Request, Response } from "express";
import { expenseService } from "../services/expense.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { z } from "zod";

const expenseSchema = z.object({
	title: z.string().min(1),
	amount: z.number().positive(),
	date: z.string().optional(),
	category_id: z.number(),
	group_id: z.number().optional(),
	description: z.string().optional(),
	is_recurring: z.boolean().optional(),
	recurrence: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
	splits: z
		.array(
			z.object({
				user_id: z.number(),
				amount: z.number().positive(),
			}),
		)
		.optional(),
});

/**
 * @swagger
 * tags:
 *   - name: Expenses
 *     description: Core expense management
 */
export class ExpenseController {
	create = asyncHandler(async (req: Request, res: Response) => {
		const data = expenseSchema.parse(req.body);
		const userId = res.locals.user.id;
		const expense = await expenseService.createExpense(userId, data);
		res.status(201).json(ApiResponse.success("Expense created successfully", expense, 201));
	});

	list = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const result = await expenseService.getExpenses(userId, req.query);
		res.status(200).json(ApiResponse.success("Expenses retrieved", result));
	});

	update = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const expenseId = Number(req.params.id);
		const expense = await expenseService.updateExpense(userId, expenseId, req.body);
		res.status(200).json(ApiResponse.success("Expense updated successfully", expense));
	});

	delete = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const expenseId = Number(req.params.id);
		await expenseService.deleteExpense(userId, expenseId);
		res.status(200).json(ApiResponse.success("Expense deleted successfully"));
	});

  listCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await expenseService.getCategories();
    res.status(200).json(ApiResponse.success("Categories retrieved", categories));
  });

  listGroups = asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.user.id;
    const groups = await expenseService.getGroups(userId);
    res.status(200).json(ApiResponse.success("Groups retrieved", groups));
  });
}

export const expenseController = new ExpenseController();
