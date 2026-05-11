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
	const username = sanitizeUsername(base);
	let suffix = 0;
	for (;;) {
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
			console.warn(
				`[AUTH ${requestId}] Authorization Header present: ${!!req.headers.authorization}`,
			);
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
			const emailClaim =
				(auth.sessionClaims?.email as string | undefined) ??
				(auth.sessionClaims?.["email_address"] as string | undefined) ??
				(auth.sessionClaims?.primaryEmail as string | undefined);
			const email = emailClaim?.toLowerCase().trim();
			let fullName =
				(auth.sessionClaims?.name as string | undefined) ??
				(auth.sessionClaims?.full_name as string | undefined) ??
				(auth.sessionClaims?.fullName as string | undefined);

			if (!email) {
				console.error(`[AUTH ${requestId}] Could not resolve email for ${clerkUserId}`);
				throw new HttpException("Unable to resolve user email from Clerk token", 401);
			}

			// Create or link user if it doesn't exist. Upsert is atomic on email, so
			// simultaneous first requests for the same Clerk user do not race here.
			const username = await createUniqueUsername(email.split("@")[0] || "user");
			try {
				const wasCreated = !(await prisma.user.findUnique({ where: { email } }));
				user = await prisma.user.upsert({
					where: { email },
					update: {
						clerk_id: clerkUserId,
						name: fullName || "FlowLedger User",
						verified: true,
						profile: {
							upsert: {
								create: { avatar_color: "#3B82F6" },
								update: {},
							},
						},
					},
					create: {
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
				if (wasCreated) {
					console.log(`[AUTH ${requestId}] Created new user: ${user.username}`);
				}

				// Auto-join groups from pending invites
				try {
					const pendingInvites = await prisma.groupInvite.findMany({
						where: { email, status: "PENDING" },
					});

					if (pendingInvites.length > 0) {
						console.log(
							`[AUTH ${requestId}] Found ${pendingInvites.length} pending invites for ${email}. Auto-joining...`,
						);
						await prisma.groupMember.createMany({
							data: pendingInvites.map((invite) => ({
								group_id: invite.group_id,
								user_id: user!.id,
							})),
							skipDuplicates: true,
						});

						await prisma.groupInvite.updateMany({
							where: { id: { in: pendingInvites.map((i) => i.id) } },
							data: { status: "ACCEPTED" },
						});
					}
				} catch (inviteError) {
					console.error(
						`[AUTH ${requestId}] Error processing pending invites:`,
						inviteError,
					);
					// Don't fail the login if invite processing fails
				}
			} catch (prismaError: any) {
				// Handle race condition if user was created by another request
				if (prismaError.code === "P2002") {
					user = await prisma.user.findUnique({
						where: { email },
						include: { profile: true },
					});
					if (user) {
						res.locals.user = user;
						return next();
					}
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
