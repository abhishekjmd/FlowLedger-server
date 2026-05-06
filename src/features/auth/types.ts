import { z } from "zod";

export const signupSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	username: z.string().min(3),
	password: z.string().min(6),
});

export const loginSchema = z.object({
	email_username: z.string(),
	password: z.string(),
});

export type SignupDto = z.infer<typeof signupSchema>;
export type LoginDto = z.infer<typeof loginSchema>;

export interface AuthResponse {
	statusCode: number;
	message: string;
	access_token?: string;
	refresh_token?: string;
}
