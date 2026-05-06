import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { signupSchema, loginSchema } from "../types";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { z } from "zod";

const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "lax" as const,
	maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and Session Management
 */
export class AuthController {
	/**
	 * @swagger
	 * /auth/signup:
	 *   post:
	 *     summary: Register a new user
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [name, email, username, password]
	 *             properties:
	 *               name: { type: string, example: "John Doe" }
	 *               email: { type: string, example: "john@example.com" }
	 *               username: { type: string, example: "johndoe" }
	 *               password: { type: string, example: "password123" }
	 *     responses:
	 *       201:
	 *         description: User created successfully
	 *         content:
	 *           application/json:
	 *             schema: { $ref: '#/components/schemas/ApiResponse' }
	 */
	signup = asyncHandler(async (req: Request, res: Response) => {
		const data = signupSchema.parse(req.body);
		const result = await authService.signup(data);
		res.status(201).json(ApiResponse.success("User created successfully", result, 201));
	});

	/**
	 * @swagger
	 * /auth/login:
	 *   post:
	 *     summary: Login user and get tokens
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [email_username, password]
	 *             properties:
	 *               email_username: { type: string, example: "johndoe" }
	 *               password: { type: string, example: "password123" }
	 *     responses:
	 *       200:
	 *         description: Login successful
	 *         content:
	 *           application/json:
	 *             schema: { $ref: '#/components/schemas/ApiResponse' }
	 */
	login = asyncHandler(async (req: Request, res: Response) => {
		const data = loginSchema.parse(req.body);
		const { user, accessToken, refreshToken } = await authService.login(data);

		res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

		res.status(200).json(
			ApiResponse.success("Login successful", {
				user: {
					id: user.id,
					email: user.email,
					username: user.username,
					name: user.name,
					verified: user.verified,
				},
				accessToken,
			}),
		);
	});

	/**
	 * @swagger
	 * /auth/refresh:
	 *   post:
	 *     summary: Refresh access token
	 *     tags: [Auth]
	 *     responses:
	 *       200:
	 *         description: Token refreshed
	 *         content:
	 *           application/json:
	 *             schema: { $ref: '#/components/schemas/ApiResponse' }
	 */
	refresh = asyncHandler(async (req: Request, res: Response) => {
		const oldRefreshToken = req.cookies.refreshToken;
		if (!oldRefreshToken) {
			res.status(401).json(ApiResponse.error("No refresh token provided", 401));
			return;
		}

		const { accessToken, refreshToken } = await authService.refresh(oldRefreshToken);

		res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
		res.status(200).json(ApiResponse.success("Token refreshed", { accessToken }));
	});

	/**
	 * @swagger
	 * /auth/logout:
	 *   post:
	 *     summary: Logout user and invalidate session
	 *     tags: [Auth]
	 *     responses:
	 *       200:
	 *         description: Logged out successfully
	 */
	logout = asyncHandler(async (req: Request, res: Response) => {
		const refreshToken = req.cookies.refreshToken;
		if (refreshToken) {
			await authService.logout(refreshToken);
		}
		res.clearCookie("refreshToken");
		res.status(200).json(ApiResponse.success("Logged out successfully"));
	});

	/**
	 * @swagger
	 * /auth/me:
	 *   get:
	 *     summary: Get current authenticated user
	 *     tags: [Auth]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: User profile retrieved
	 */
	me = asyncHandler(async (req: Request, res: Response) => {
		const user = res.locals.user;
		res.status(200).json(ApiResponse.success("User profile retrieved", { user }));
	});

	/**
	 * @swagger
	 * /auth/verify:
	 *   post:
	 *     summary: Verify user account with OTP
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [email, code]
	 *             properties:
	 *               email: { type: string, example: "john@example.com" }
	 *               code: { type: number, example: 123456 }
	 *     responses:
	 *       200:
	 *         description: Account verified successfully
	 */
	verify = asyncHandler(async (req: Request, res: Response) => {
		const { email, code } = z
			.object({
				email: z.string().email(),
				code: z.number(),
			})
			.parse(req.body);

		const result = await authService.verify(email, code);
		res.status(200).json(ApiResponse.success("Account verified successfully", result));
	});
	/**
	 * @swagger
	 * /auth/send-verification:
	 *   post:
	 *     summary: Resend account verification OTP
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [email]
	 *             properties:
	 *               email: { type: string, example: "john@example.com" }
	 *     responses:
	 *       200:
	 *         description: Verification code sent
	 */
	sendVerification = asyncHandler(async (req: Request, res: Response) => {
		const { email } = z.object({ email: z.string().email() }).parse(req.body);
		const result = await authService.sendVerification(email);
		res.status(200).json(ApiResponse.success("Verification code sent", result));
	});

	/**
	 * @swagger
	 * /auth/forgot-password:
	 *   post:
	 *     summary: Request password reset OTP
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [email]
	 *             properties:
	 *               email: { type: string, example: "john@example.com" }
	 *     responses:
	 *       200:
	 *         description: Password reset code sent
	 */
	forgotPassword = asyncHandler(async (req: Request, res: Response) => {
		const { email } = z.object({ email: z.string().email() }).parse(req.body);
		const result = await authService.forgotPassword(email);
		res.status(200).json(ApiResponse.success("Password reset code sent", result));
	});

	/**
	 * @swagger
	 * /auth/reset-password:
	 *   post:
	 *     summary: Reset password with OTP
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [email, code, newPassword]
	 *             properties:
	 *               email: { type: string, example: "john@example.com" }
	 *               code: { type: number, example: 123456 }
	 *               newPassword: { type: string, example: "newpassword123" }
	 *     responses:
	 *       200:
	 *         description: Password reset successful
	 */
	resetPassword = asyncHandler(async (req: Request, res: Response) => {
		const { email, code, newPassword } = z
			.object({
				email: z.string().email(),
				code: z.number(),
				newPassword: z.string().min(6),
			})
			.parse(req.body);

		const result = await authService.resetPassword(email, code, newPassword);
		res.status(200).json(ApiResponse.success("Password reset successful", result));
	});
}

export const authController = new AuthController();
