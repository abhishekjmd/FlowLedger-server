import prisma from "@/lib/database/prisma";
import { HttpException } from "@/middleware/error.middleware";

export class RecurringExpenseService {
	async create(userId: number, data: any) {
		const nextRun = this.calculateNextRun(new Date(), data.frequency);

		return prisma.recurringExpense.create({
			data: {
				title: data.title,
				amount: data.amount,
				user_id: userId,
				category_id: data.category_id,
				group_id: data.group_id,
				frequency: data.frequency,
				start_date: new Date(data.start_date || Date.now()),
				end_date: data.end_date ? new Date(data.end_date) : null,
				next_run: nextRun,
			},
		});
	}

	async list(userId: number) {
		return prisma.recurringExpense.findMany({
			where: { user_id: userId },
			include: { generated_expenses: { take: 5, orderBy: { date: "desc" } } },
		});
	}

	async update(userId: number, id: number, data: any) {
		const recurring = await prisma.recurringExpense.findUnique({ where: { id } });
		if (!recurring || recurring.user_id !== userId) {
			throw new HttpException("Recurring expense not found", 404);
		}

		return prisma.recurringExpense.update({
			where: { id },
			data: {
				title: data.title,
				amount: data.amount,
				active: data.active,
				frequency: data.frequency,
			},
		});
	}

	async delete(userId: number, id: number) {
		const recurring = await prisma.recurringExpense.findUnique({ where: { id } });
		if (!recurring || recurring.user_id !== userId) {
			throw new HttpException("Recurring expense not found", 404);
		}

		return prisma.recurringExpense.delete({ where: { id } });
	}

	async processRecurringExpenses() {
		const now = new Date();
		const toProcess = await prisma.recurringExpense.findMany({
			where: {
				active: true,
				next_run: { lte: now },
				OR: [{ end_date: null }, { end_date: { gte: now } }],
			},
		});

		for (const item of toProcess) {
			await prisma.$transaction(async (tx) => {
				// Generate expense
				await tx.expense.create({
					data: {
						title: item.title,
						amount: item.amount,
						user_id: item.user_id,
						category_id: item.category_id,
						group_id: item.group_id,
						recurring_id: item.id,
						date: now,
					},
				});

				// Update schedule
				const nextRun = this.calculateNextRun(now, item.frequency);
				await tx.recurringExpense.update({
					where: { id: item.id },
					data: {
						last_run: now,
						next_run: nextRun,
					},
				});
			});
		}
	}

	private calculateNextRun(current: Date, frequency: string): Date {
		const next = new Date(current);
		switch (frequency) {
			case "daily":
				next.setDate(next.getDate() + 1);
				break;
			case "weekly":
				next.setDate(next.getDate() + 7);
				break;
			case "monthly":
				next.setMonth(next.getMonth() + 1);
				break;
			case "yearly":
				next.setFullYear(next.getFullYear() + 1);
				break;
		}
		return next;
	}
}

export const recurringExpenseService = new RecurringExpenseService();
