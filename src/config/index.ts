import { z } from "zod";
import { config } from "dotenv";

config();

const envSchema = z.object({
	PORT: z.string().default("8000"),
	DATABASE_URL: z.string(),
	SUPABASE_URL: z.string(),
	SUPABASE_ANON_KEY: z.string(),
	CLERK_SECRET_KEY: z.string(),
	CLERK_PUBLISHABLE_KEY: z.string(),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const env = envSchema.parse(process.env);

export const CONFIG = {
	port: parseInt(env.PORT, 10),
	database: {
		url: env.DATABASE_URL,
	},
	clerk: {
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.CLERK_PUBLISHABLE_KEY,
	},
	supabase: {
		url: env.SUPABASE_URL,
		anonKey: env.SUPABASE_ANON_KEY,
	},
	isDev: env.NODE_ENV === "development",
	isProd: env.NODE_ENV === "production",
	isTest: env.NODE_ENV === "test",
};
