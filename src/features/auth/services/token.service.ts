import * as jwt from "jsonwebtoken";
import { CONFIG } from "@/config";

export class TokenService {
	async signAccessToken(userId: number): Promise<string> {
		return jwt.sign({ user_id: userId }, CONFIG.jwt.accessSecret, {
			expiresIn: CONFIG.jwt.accessExpiresIn as any,
		});
	}

	async signRefreshToken(sessionId: number): Promise<string> {
		return jwt.sign({ session_id: sessionId }, CONFIG.jwt.refreshSecret, {
			expiresIn: CONFIG.jwt.refreshExpiresIn as any,
		});
	}

	async verifyAccessToken(token: string): Promise<{ user_id: number }> {
		return jwt.verify(token, CONFIG.jwt.accessSecret) as { user_id: number };
	}

	async verifyRefreshToken(token: string): Promise<{ session_id: number }> {
		return jwt.verify(token, CONFIG.jwt.refreshSecret) as { session_id: number };
	}
}

export const tokenService = new TokenService();
