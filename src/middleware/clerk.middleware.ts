import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import prisma from "@/lib/database/prisma";
import { HttpException } from "@/middleware/error.middleware";

const sanitizeUsername = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 20) || "user";

const createUniqueUsername = async (base: string): Promise<string> => {
	let username = sanitizeUsername(base);
	let suffix = 0;
	while (true) {
		const candidate = suffix === 0 ? username : `${username}_${suffix}`;
		const exists = await prisma.user.findUnique({ where: { username: candidate } });
		if (!exists) return candidate;
		suffix += 1;
	}
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const auth = getAuth(req);
		if (!auth?.userId) throw new HttpException("Unauthorized", 401);

		const clerkUserId = auth.userId;
		const email =
			(auth.sessionClaims?.email as string | undefined) ??
			(auth.sessionClaims?.["email_address"] as string | undefined);
		const fullName =
			(auth.sessionClaims?.name as string | undefined) ??
			(auth.sessionClaims?.full_name as string | undefined) ??
			"FlowLedger User";

		let user = await prisma.user.findUnique({
			where: { clerk_id: clerkUserId },
			include: { profile: true },
		});

		if (!user) {
			if (!email) throw new HttpException("Unable to resolve user email from token", 401);

			const username = await createUniqueUsername(email.split("@")[0] || "user");
			user = await prisma.user.create({
				data: {
					clerk_id: clerkUserId,
					email,
					name: fullName,
					username,
					password: "CLERK_MANAGED",
					verification_code: 0,
					verified: true,
				},
				include: { profile: true },
			});
		}

		res.locals.user = user;
		next();
	} catch (error) {
		next(error instanceof HttpException ? error : new HttpException("Unauthorized", 401));
	}
};

