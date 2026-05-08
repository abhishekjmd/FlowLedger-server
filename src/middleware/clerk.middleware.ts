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
	const requestId = Math.random().toString(36).substring(7);
	try {
		const auth = getAuth(req);
		
		if (!auth?.userId) {
			console.warn(`[AUTH ${requestId}] No userId in auth object.`);
			// Log just the existence of headers to avoid leaking secrets in logs unless necessary
			console.warn(`[AUTH ${requestId}] Authorization Header present: ${!!req.headers.authorization}`);
			throw new HttpException("Unauthorized: Missing UserID", 401);
		}

		const clerkUserId = auth.userId;
		
		// Attempt to find user in database
		let user = await prisma.user.findUnique({
			where: { clerk_id: clerkUserId },
			include: { profile: true },
		});

		if (!user) {
			console.log(`[AUTH ${requestId}] User ${clerkUserId} not found in DB. Syncing...`);
			
			// Resolve email and name
			let email =
				(auth.sessionClaims?.email as string | undefined) ??
				(auth.sessionClaims?.["email_address"] as string | undefined);
			let fullName =
				(auth.sessionClaims?.name as string | undefined) ??
				(auth.sessionClaims?.full_name as string | undefined);

			if (!email) {
				console.log(`[AUTH ${requestId}] Email missing from claims, fetching from Clerk API...`);
				try {
					const clerkUser = await clerkClient.users.getUser(clerkUserId);
					email = clerkUser.emailAddresses[0]?.emailAddress;
					fullName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "FlowLedger User";
				} catch (clerkError: any) {
					console.error(`[AUTH ${requestId}] Clerk API Error:`, clerkError.message);
					throw new HttpException("Failed to synchronize user data from Clerk", 401);
				}
			}

			if (!email) {
				console.error(`[AUTH ${requestId}] Could not resolve email for ${clerkUserId}`);
				throw new HttpException("Unable to resolve user email from Clerk", 401);
			}

			// Create user if doesn't exist
			const username = await createUniqueUsername(email.split("@")[0] || "user");
			try {
				user = await prisma.user.create({
					data: {
						clerk_id: clerkUserId,
						email,
						name: fullName || "FlowLedger User",
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
				console.log(`[AUTH ${requestId}] Created new user: ${user.username}`);
			} catch (prismaError: any) {
				// Handle race condition if user was created by another request
				if (prismaError.code === "P2002") {
					user = await prisma.user.findUnique({
						where: { clerk_id: clerkUserId },
						include: { profile: true },
					});
					if (user) return next();
				}
				console.error(`[AUTH ${requestId}] Prisma Error:`, prismaError);
				throw new HttpException("Internal Server Error during user synchronization", 500);
			}
		}

		res.locals.user = user;
		next();
	} catch (error: any) {
		const statusCode = error instanceof HttpException ? error.statusCode : 401;
		const message = error.message || "Unauthorized";
		
		console.error(`[AUTH ${requestId}] Error ${statusCode}: ${message}`);
		if (statusCode === 500) {
			console.error(error);
		}
		
		next(new HttpException(message, statusCode));
	}
};

