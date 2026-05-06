import prisma from "@/lib/database/prisma";
import { HttpException } from "@/middleware/error.middleware";
import { Prisma } from "@prisma/client";

export class ExpenseService {
	async createExpense(userId: number, data: any) {
		return prisma.$transaction(async (tx) => {
			// 1. Create the expense
			const expense = await tx.expense.create({
				data: {
					title: data.title,
					amount: data.amount,
					date: new Date(data.date || Date.now()),
					user_id: userId,
					category_id: data.category_id,
					group_id: data.group_id,
					description: data.description,
					is_recurring: data.is_recurring,
					recurrence: data.recurrence,
				},
			});

			// 2. Handle splitting if provided
			if (data.splits && data.splits.length > 0) {
				await tx.expenseSplit.createMany({
					data: data.splits.map((split: any) => ({
						expense_id: expense.id,
						user_id: split.user_id,
						amount: split.amount,
					})),
				});
			}

			return tx.expense.findUnique({
				where: { id: expense.id },
				include: { category: true, splits: true },
			});
		});
	}

	async getExpenses(userId: number, filters: any) {
		const { group_id, category_id, startDate, endDate, page = 1, limit = 10 } = filters;
		const skip = (page - 1) * limit;

		const where: Prisma.ExpenseWhereInput = {
			OR: [
				{ user_id: userId },
				{ splits: { some: { user_id: userId } } },
				{ group: { members: { some: { user_id: userId } } } },
			],
		};

		if (group_id) where.group_id = Number(group_id);
		if (category_id) where.category_id = Number(category_id);
		if (startDate || endDate) {
			where.date = {};
			if (startDate) where.date.gte = new Date(startDate);
			if (endDate) where.date.lte = new Date(endDate);
		}

		const [expenses, total] = await Promise.all([
			prisma.expense.findMany({
				where,
				include: {
					category: true,
					splits: true,
					user: { select: { name: true, email: true } },
				},
				orderBy: { date: "desc" },
				skip,
				take: Number(limit),
			}),
			prisma.expense.count({ where }),
		]);

		return { 
      expenses, 
      pagination: {
        total, 
        page: Number(page), 
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };
	}

	async updateExpense(userId: number, expenseId: number, data: any) {
		const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
		if (!expense || expense.user_id !== userId) {
			throw new HttpException("Expense not found or unauthorized", 404);
		}

		return prisma.expense.update({
			where: { id: expenseId },
			data: {
				title: data.title,
				amount: data.amount,
				category_id: data.category_id,
				description: data.description,
			},
			include: { category: true },
		});
	}

	async deleteExpense(userId: number, expenseId: number) {
		const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
		if (!expense || expense.user_id !== userId) {
			throw new HttpException("Expense not found or unauthorized", 404);
		}

		await prisma.expenseSplit.deleteMany({ where: { expense_id: expenseId } });
		return prisma.expense.delete({ where: { id: expenseId } });
	}

	async getMonthlyAnalytics(userId: number) {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const categories = await prisma.category.findMany({
			include: {
				expenses: {
					where: {
						user_id: userId,
						date: { gte: startOfMonth },
					},
				},
			},
		});

		return categories
			.map((cat) => ({
				category: cat.name,
				total: cat.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
				count: cat.expenses.length,
			}))
			.filter((c) => c.count > 0);
	}

  async getCategories() {
    return prisma.category.findMany();
  }

  async getGroups(userId: number) {
    return prisma.group.findMany({
      where: {
        members: { some: { user_id: userId } }
      }
    });
  }
}

export const expenseService = new ExpenseService();
