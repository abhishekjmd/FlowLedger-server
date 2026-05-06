import cron from "node-cron";
import { recurringExpenseService } from "@/features/expense/services/recurring-expense.service";

export const initCronJobs = () => {
	// Run every hour to check for pending recurring expenses
	// This allows for granularity without over-processing
	cron.schedule("0 * * * *", async () => {
		console.log("⏰ Running recurring expense generation job...");
		try {
			await recurringExpenseService.processRecurringExpenses();
			console.log("✅ Recurring expense generation completed.");
		} catch (error) {
			console.error("❌ Recurring expense generation failed:", error);
		}
	});

	console.log("🚀 Cron jobs initialized.");
};
