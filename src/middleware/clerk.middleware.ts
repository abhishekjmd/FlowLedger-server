import { getAuth, clerkClient } from "@clerk/express";
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
		if (!auth?.userId) {
			console.warn("[AUTH WARNING] No userId in auth object. Session claims:", auth?.sessionClaims);
			throw new HttpException("Unauthorized: Missing UserID", 401);
		}

		const clerkUserId = auth.userId;
		let email =
			(auth.sessionClaims?.email as string | undefined) ??
			(auth.sessionClaims?.["email_address"] as string | undefined);
		let fullName =
			(auth.sessionClaims?.name as string | undefined) ??
			(auth.sessionClaims?.full_name as string | undefined);

		let user = await prisma.user.findUnique({
			where: { clerk_id: clerkUserId },
			include: { profile: true },
		});

		if (!user) {
			// If missing from claims, fetch from Clerk API
			if (!email) {
				const clerkUser = await clerkClient.users.getUser(clerkUserId);
				email = clerkUser.emailAddresses[0]?.emailAddress;
				fullName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "FlowLedger User";
			}

			if (!email) throw new HttpException("Unable to resolve user email from Clerk", 401);
			if (!fullName) fullName = "FlowLedger User";

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
					profile: {
						create: { avatar_color: "#3B82F6" },
					},
				},
				include: { profile: true },
			});
		} else if (!user.profile) {
			// Back-fill missing profile for existing users
			await prisma.profile.create({
				data: { user_id: user.id, avatar_color: "#3B82F6" },
			});
			user = await prisma.user.findUnique({
				where: { id: user.id },
				include: { profile: true },
			});
		}

		res.locals.user = user;
		next();
	} catch (error: any) {
		const message = error instanceof HttpException ? error.message : (error.message || "Unauthorized");
		console.error("[AUTH ERROR]", error);
		next(new HttpException(message, 401));
	}
};

