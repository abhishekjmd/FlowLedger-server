import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { loggerMiddleware } from "@/middleware/logger.middleware";
import { errorHandler } from "@/middleware/error.middleware";
import { swaggerOptions } from "@/config/swagger";
import authRoutes from "@/features/auth";
import userRoutes from "@/features/user";
import healthRoutes from "@/features/health";
import expenseRoutes from "@/features/expense";
import analyticsRoutes from "@/features/analytics";

export const createApp = (): Express => {
	const app = express();

	// Security & Core Middleware
	app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for Swagger UI to load assets correctly
	app.use(cors({ origin: true, credentials: true }));
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use(cookieParser());
	app.use(loggerMiddleware);

	// Swagger Documentation
	const swaggerSpec = swaggerJsdoc(swaggerOptions);
	app.use("/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

	// Routes
	const apiPrefix = "/v1";
	app.use(`${apiPrefix}/auth`, authRoutes);
	app.use(`${apiPrefix}/user`, userRoutes);
	app.use(`${apiPrefix}/expenses`, expenseRoutes);
	app.use(`${apiPrefix}/analytics`, analyticsRoutes);
	app.use(`${apiPrefix}/health`, healthRoutes);

	// Error handling
	app.use(errorHandler);

	return app;
};
