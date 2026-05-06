import { Options } from "swagger-jsdoc";

export const swaggerOptions: Options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "FlowLedger API",
			version: "1.0.0",
			description: "Production-grade expense management API",
			contact: {
				name: "FlowLedger Support",
			},
		},
		servers: [
			{
				url: "http://localhost:8000/v1",
				description: "Local Development Server",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
			schemas: {
				ApiResponse: {
					type: "object",
					properties: {
						status: { type: "string", enum: ["success", "error"] },
						statusCode: { type: "number" },
						message: { type: "string" },
						data: { type: "object" },
					},
				},
			},
		},
		security: [
			{
				bearerAuth: [],
			},
		],
	},
	apis: ["./src/features/**/*.ts", "./src/app/index.ts"], // Path to the API docs
};
