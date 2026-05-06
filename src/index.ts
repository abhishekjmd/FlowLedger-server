import "module-alias/register";
import { createApp } from "@/app";
import { CONFIG } from "@/config";
import { initCronJobs } from "@/lib/cron/cron.service";

const startServer = async () => {
	try {
		const app = createApp();

		// Initialize Background Tasks
		initCronJobs();

		app.listen(CONFIG.port, () => {
			console.log(`
🚀 Server is running!
📡 Port: ${CONFIG.port}
🌍 Mode: ${process.env.NODE_ENV || "development"}
      `);
		});
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
};

startServer();
