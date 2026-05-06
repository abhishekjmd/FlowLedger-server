import prisma from "@/lib/database/prisma";
import { RuleBasedProvider } from "@/lib/ai/ai.provider";

export class AnalyticsService {
	private insightProvider = new RuleBasedProvider();

	async getMonthlySummary(userId: number) {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

		const [currentTotal, lastTotal] = await Promise.all([
			prisma.expense.aggregate({
				_sum: { amount: true },
				where: { user_id: userId, date: { gte: startOfMonth } },
			}),
			prisma.expense.aggregate({
				_sum: { amount: true },
				where: { user_id: userId, date: { gte: startOfLastMonth, lte: endOfLastMonth } },
			}),
		]);

		return {
			currentMonth: Number(currentTotal._sum.amount || 0),
			lastMonth: Number(lastTotal._sum.amount || 0),
			difference: Number(currentTotal._sum.amount || 0) - Number(lastTotal._sum.amount || 0),
		};
	}

	async getCategoryBreakdown(userId: number) {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const categories = await prisma.category.findMany({
			include: {
				expenses: {
					where: { user_id: userId, date: { gte: startOfMonth } },
				},
			},
		});

		return categories
			.map((cat) => ({
				id: cat.id,
				name: cat.name,
				amount: cat.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
				count: cat.expenses.length,
			}))
			.filter((c) => c.count > 0)
			.sort((a, b) => b.amount - a.amount);
	}

	async getTrends(userId: number) {
		// Get last 6 months
		const trends = [];
		for (let i = 5; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			const start = new Date(date.getFullYear(), date.getMonth(), 1);
			const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

			const total = await prisma.expense.aggregate({
				_sum: { amount: true },
				where: { user_id: userId, date: { gte: start, lte: end } },
			});

			trends.push({
				month: date.toLocaleString("default", { month: "short" }),
				year: date.getFullYear(),
				amount: Number(total._sum.amount || 0),
			});
		}
		return trends;
	}

	async getInsights(userId: number) {
		const summary = await this.getMonthlySummary(userId);
		const categories = await this.getCategoryBreakdown(userId);

		// Simple weekend vs weekday calculation for insights
		const expenses = await prisma.expense.findMany({
			where: {
				user_id: userId,
				date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
			},
		});

		let weekendSpending = 0;
		let weekdaySpending = 0;

		expenses.forEach((exp) => {
			const day = new Date(exp.date).getDay();
			if (day === 0 || day === 6) weekendSpending += Number(exp.amount);
			else weekdaySpending += Number(exp.amount);
		});

		const insights = await this.insightProvider.generateInsights({
			...summary,
			categories,
			weekendSpending,
			weekdaySpending,
		});

		return insights;
	}
}

export const analyticsService = new AnalyticsService();
