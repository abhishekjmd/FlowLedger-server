import { compare, hash } from "bcrypt";
import prisma from "@/lib/database/prisma";
import { HttpException } from "@/middleware/error.middleware";
import { tokenService } from "./token.service";
import { SignupDto, LoginDto } from "../types";
import randomMC from "random-material-color";

export class AuthService {
	async signup(data: SignupDto) {
		console.log(`Starting signup for ${data.email}...`);
		const hashedPassword = await hash(data.password, 10);

		try {
			const user = await prisma.user.create({
				data: {
					name: data.name,
					email: data.email,
					username: data.username,
					password: hashedPassword,
					verified: true,
					verification_code: 0,
					verification_expires: null,
				},
			});

			await prisma.profile.create({
				data: {
					user_id: user.id,
					avatar_color: randomMC.getColor(),
				},
			});

			const session = await prisma.session.create({ data: { user_id: user.id } });
			const accessToken = await tokenService.signAccessToken(user.id);
			const refreshToken = await tokenService.signRefreshToken(session.id);

			console.log(`Signup successful for ${data.email}`);
			return {
				user,
				accessToken,
				refreshToken,
			};
		} catch (err: any) {
			console.error("Signup error:", err);
			if (err.code === "P2002") {
				throw new HttpException("Email or username already exists", 409);
			}
			throw err;
		}
	}

	async login(data: LoginDto) {
		const user = await prisma.user.findFirst({
			where: {
				OR: [{ email: data.email_username }, { username: data.email_username }],
			},
		});

		if (!user || !(await compare(data.password, user.password))) {
			throw new HttpException("Invalid credentials", 401);
		}

		if (!user.verified) {
			throw new HttpException("Account not verified", 403);
		}

		const session = await prisma.session.create({ data: { user_id: user.id } });
		const accessToken = await tokenService.signAccessToken(user.id);
		const refreshToken = await tokenService.signRefreshToken(session.id);

		return { user, accessToken, refreshToken };
	}
	async refresh(oldRefreshToken: string) {
		try {
			const decoded = await tokenService.verifyRefreshToken(oldRefreshToken);
			const session = await prisma.session.findUnique({ where: { id: decoded.session_id } });

			if (!session || !session.valid) throw new HttpException("Invalid session", 401);

			await prisma.session.update({ where: { id: session.id }, data: { valid: false } });
			const newSession = await prisma.session.create({ data: { user_id: session.user_id } });

			const accessToken = await tokenService.signAccessToken(session.user_id);
			const refreshToken = await tokenService.signRefreshToken(newSession.id);

			return { accessToken, refreshToken };
		} catch (err) {
			throw new HttpException("Invalid refresh token", 401);
		}
	}

	async logout(refreshToken: string) {
		try {
			const decoded = await tokenService.verifyRefreshToken(refreshToken);
			await prisma.session.update({
				where: { id: decoded.session_id },
				data: { valid: false },
			});
		} catch (err) {
			// Token might be already invalid
		}
	}

	async resetPassword(email: string, code: number, newPassword: string) {
		const user = await prisma.user.findUnique({ where: { email } });

		if (!user || user.verification_code !== code) {
			throw new HttpException("Invalid or expired reset code", 401);
		}

		if (user.verification_expires && user.verification_expires < new Date()) {
			throw new HttpException("Reset code expired", 401);
		}

		const hashedPassword = await hash(newPassword, 10);

		await prisma.user.update({
			where: { email },
			data: {
				password: hashedPassword,
				verification_code: 0,
				verification_expires: null,
			},
		});

		return { message: "Password reset successful" };
	}
}

export const authService = new AuthService();
