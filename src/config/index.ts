import { z } from "zod";
import { config } from "dotenv";

config();

const envSchema = z.object({
	PORT: z.string().default("8000"),
	DATABASE_URL: z.string(),
	JWT_ACCESS_SECRET: z.string(),
	JWT_REFRESH_SECRET: z.string(),
	RESEND_API_KEY: z.string(),
	SUPABASE_URL: z.string(),
	SUPABASE_ANON_KEY: z.string(),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const env = envSchema.parse(process.env);

export const CONFIG = {
	port: parseInt(env.PORT, 10),
	database: {
		url: env.DATABASE_URL,
	},
	jwt: {
		accessSecret: env.JWT_ACCESS_SECRET,
		refreshSecret: env.JWT_REFRESH_SECRET,
		accessExpiresIn: "15m",
		refreshExpiresIn: "7d",
	},
	mail: {
		resendApiKey: env.RESEND_API_KEY,
	},
	supabase: {
		url: env.SUPABASE_URL,
		anonKey: env.SUPABASE_ANON_KEY,
	},
	isDev: env.NODE_ENV === "development",
	isProd: env.NODE_ENV === "production",
	isTest: env.NODE_ENV === "test",
};
