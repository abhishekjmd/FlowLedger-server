import { compare, hash } from "bcrypt";
import prisma from "@/lib/database/prisma";
import { mailerService } from "@/lib/mailer/mailer.service";
import { generateVerificationCode } from "@/utils/verification-code";
import { HttpException } from "@/middleware/error.middleware";
import { tokenService } from "./token.service";
import { SignupDto, LoginDto } from "../types";
import randomMC from "random-material-color";

const OTP_EXPIRY_MINUTES = 10;

export class AuthService {
	async signup(data: SignupDto) {
		console.log(`Starting signup for ${data.email}...`);
		const hashedPassword = await hash(data.password, 10);
		const verificationCode = generateVerificationCode();
		const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

		try {
			const user = await prisma.user.create({
				data: {
					name: data.name,
					email: data.email,
					username: data.username,
					password: hashedPassword,
					verification_code: verificationCode,
					verification_expires: expiresAt,
				},
			});

			await prisma.profile.create({
				data: {
					user_id: user.id,
					avatar_color: randomMC.getColor(),
				},
			});

			// Send email in background - don't await it to prevent hanging the request
			this.sendVerificationEmail(user.email, user.name, verificationCode).catch((err) => {
				console.error("Background email sending failed:", err);
			});

			console.log(`Signup successful for ${data.email}`);
			return { message: "User created and verification email will be sent shortly" };
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

	async verify(email: string, code: number) {
		const user = await prisma.user.findUnique({ where: { email } });

		if (!user) throw new HttpException("User not found", 404);

		if (user.verified) throw new HttpException("Account already verified", 400);

		if (user.verification_code !== code) {
			throw new HttpException("Invalid verification code", 401);
		}

		if (user.verification_expires && user.verification_expires < new Date()) {
			throw new HttpException("Verification code expired", 401);
		}

		await prisma.user.update({
			where: { email },
			data: { verified: true, verification_code: 0, verification_expires: null },
		});

		return { message: "Account verified successfully" };
	}

	async sendVerification(email: string) {
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) throw new HttpException("User not found", 404);
		if (user.verified) throw new HttpException("Account already verified", 400);

		const code = generateVerificationCode();
		const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

		await prisma.user.update({
			where: { email },
			data: { verification_code: code, verification_expires: expiresAt },
		});

		await this.sendVerificationEmail(user.email, user.name, code);
		return { message: "Verification email resent" };
	}

	async forgotPassword(email: string) {
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) throw new HttpException("User not found", 404);

		const code = generateVerificationCode();
		const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

		await prisma.user.update({
			where: { email },
			data: { verification_code: code, verification_expires: expiresAt },
		});

		await mailerService.sendEmail(
			email,
			"Reset your password",
			this.getEmailTemplate("Reset your password", user.name, code),
		);

		return { message: "Password reset OTP sent" };
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

	private async sendVerificationEmail(email: string, name: string, code: number) {
		await mailerService.sendEmail(
			email,
			"Verify your email",
			this.getEmailTemplate("Verify your email", name, code),
		);
	}

	private getEmailTemplate(title: string, name: string, code: number) {
		return `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">${title}</h2>
        <p>Hi ${name},</p>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #555; border-radius: 5px;">
          ${code}
        </div>
        <p style="color: #777; font-size: 14px; margin-top: 20px;">
          This code will expire in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, please ignore this email.
        </p>
      </div>
    `;
	}
}

export const authService = new AuthService();
