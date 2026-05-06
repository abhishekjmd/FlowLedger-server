import { NextFunction, Request, Response } from "express";
import prisma from "@/lib/database/prisma";
import { tokenService } from "../services/token.service";
import { HttpException } from "@/middleware/error.middleware";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			throw new HttpException("Unauthorized", 401);
		}

		const token = authHeader.split(" ")[1];
		const decoded = await tokenService.verifyAccessToken(token);

		const user = await prisma.user.findUnique({
			where: { id: decoded.user_id },
			include: { profile: true },
		});

		if (!user) {
			throw new HttpException("Unauthorized", 401);
		}

		res.locals.user = user;
		next();
	} catch (err) {
		next(new HttpException("Unauthorized", 401));
	}
};
