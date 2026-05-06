import { z } from "zod";
import { config } from "dotenv";

config();

const envSchema = z.object({
	PORT: z.string().default("8000"),
	DATABASE_URL: z.string(),
	JWT_ACCESS_SECRET: z.string(),
	JWT_REFRESH_SECRET: z.string(),
	MAIL_HOST: z.string(),
	MAIL_PORT: z.string(),
	MAIL_USER: z.string(),
	MAIL_PASS: z.string(),
	FIREBASE_API_KEY: z.string(),
	FIREBASE_AUTH_DOMAIN: z.string(),
	FIREBASE_PROJECT_ID: z.string(),
	FIREBASE_STORAGE_BUCKET: z.string(),
	FIREBASE_MESSAGING_SENDER_ID: z.string(),
	FIREBASE_APP_ID: z.string(),
	FIREBASE_MEASUREMENT_ID: z.string().optional(),
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
		host: env.MAIL_HOST,
		port: parseInt(env.MAIL_PORT, 10),
		user: env.MAIL_USER,
		pass: env.MAIL_PASS,
	},
	firebase: {
		apiKey: env.FIREBASE_API_KEY,
		authDomain: env.FIREBASE_AUTH_DOMAIN,
		projectId: env.FIREBASE_PROJECT_ID,
		storageBucket: env.FIREBASE_STORAGE_BUCKET,
		messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
		appId: env.FIREBASE_APP_ID,
		measurementId: env.FIREBASE_MEASUREMENT_ID,
	},
	isDev: env.NODE_ENV === "development",
	isProd: env.NODE_ENV === "production",
	isTest: env.NODE_ENV === "test",
};
