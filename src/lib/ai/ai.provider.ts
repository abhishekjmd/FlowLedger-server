export interface InsightProvider {
	generateInsights(data: any): Promise<string[]>;
}

export class RuleBasedProvider implements InsightProvider {
	async generateInsights(data: any): Promise<string[]> {
		const insights: string[] = [];
		const { currentMonth, lastMonth, categories } = data;

		// Spending Growth
		if (lastMonth > 0) {
			const growth = ((currentMonth - lastMonth) / lastMonth) * 100;
			if (growth > 10) {
				insights.push(
					`Your spending increased by ${growth.toFixed(1)}% compared to last month. Consider reviewing your variable expenses.`,
				);
			} else if (growth < -10) {
				insights.push(
					`Great job! You spent ${Math.abs(growth).toFixed(1)}% less than last month.`,
				);
			}
		}

		// Top Category
		if (categories && categories.length > 0) {
			const top = categories.sort((a: any, b: any) => b.amount - a.amount)[0];
			insights.push(
				`Your highest spending category this month is ${top.name} ($${top.amount}).`,
			);
		}

		// Weekend pattern (simplified)
		if (data.weekendSpending > data.weekdaySpending) {
			insights.push(
				"You tend to spend more on weekends. Planning your leisure activities might help save more.",
			);
		}

		return insights;
	}
}
