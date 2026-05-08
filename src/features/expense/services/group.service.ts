import prisma from "@/lib/database/prisma";
import { HttpException } from "@/middleware/error.middleware";

export class GroupService {
	async createGroup(
		userId: number,
		data: { name: string; description?: string; member_ids?: number[] },
	) {
		return prisma.group.create({
			data: {
				name: data.name,
				description: data.description,
				owner_id: userId,
				members: {
					create: [
						{ user_id: userId }, // Owner is always a member
						...(data.member_ids ?? [])
							.filter((id) => id !== userId)
							.map((id) => ({ user_id: id })),
					],
				},
			},
			include: {
				members: { include: { user: { select: { id: true, name: true, email: true } } } },
			},
		});
	}

	async getGroups(userId: number) {
		return prisma.group.findMany({
			where: { members: { some: { user_id: userId } } },
			include: {
				members: { include: { user: { select: { id: true, name: true, email: true } } } },
				_count: { select: { expenses: true } },
			},
		});
	}

	async getGroupDetails(userId: number, groupId: number) {
		const group: any = await prisma.group.findUnique({
			where: { id: groupId },
			include: {
				members: { include: { user: { select: { id: true, name: true, email: true } } } },
				expenses: {
					include: { category: true, splits: true, user: { select: { name: true } } },
					orderBy: { date: "desc" },
					take: 20,
				},
				settlements: {
					include: {
						payer: { select: { name: true } },
						receiver: { select: { name: true } },
					},
					orderBy: { date: "desc" }, // Fixed: Settlement uses 'date', not 'created_at'
					take: 10,
				},
			},
		});

		if (!group) throw new HttpException("Group not found", 404);

		const isMember = group.members.some((m: any) => m.user_id === userId);
		if (!isMember) throw new HttpException("Access denied", 403);

		const balances = group.members.map((member: any) => {
			const paid = group.expenses
				.filter((e: any) => e.user_id === member.user_id)
				.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

			const owed = group.expenses.reduce((sum: number, e: any) => {
				const split = e.splits.find((s: any) => s.user_id === member.user_id);
				return sum + (split ? Number(split.amount) : 0);
			}, 0);

			const settledPaid = group.settlements
				.filter((s: any) => s.payer_id === member.user_id)
				.reduce((sum: number, s: any) => sum + Number(s.amount), 0);

			const settledReceived = group.settlements
				.filter((s: any) => s.receiver_id === member.user_id)
				.reduce((sum: number, s: any) => sum + Number(s.amount), 0);

			return {
				userId: member.user_id,
				name: member.user.name,
				netBalance: paid + settledPaid - (owed + settledReceived),
			};
		});

		return { ...group, balances };
	}

	async inviteMember(userId: number, groupId: number, email: string) {
		const group = await prisma.group.findUnique({
			where: { id: groupId },
			include: { members: true },
		});

		if (!group) throw new HttpException("Group not found", 404);
		// Check if user is member (only members can invite)
		const isUserMember = group.members.some((m) => m.user_id === userId);
		if (!isUserMember) throw new HttpException("Only group members can invite others", 403);

		const invitee = await prisma.user.findUnique({
			where: { email: email.toLowerCase().trim() },
			select: { id: true, name: true, email: true },
		});

		if (invitee) {
			// User exists, add them directly
			const alreadyMember = group.members.some((member) => member.user_id === invitee.id);
			if (alreadyMember) throw new HttpException("This user is already in the group", 409);

			return prisma.groupMember.create({
				data: {
					group_id: groupId,
					user_id: invitee.id,
				},
				include: { user: { select: { id: true, name: true, email: true } } },
			});
		} else {
			// User doesn't exist, create a GroupInvite
			const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

			const invite = await prisma.groupInvite.create({
				data: {
					group_id: groupId,
					inviter_id: userId,
					email: email.toLowerCase().trim(),
					token: token,
					expires_at: expiresAt,
				},
				include: { group: { select: { name: true } } },
			});

			return {
				isNewUser: true,
				inviteToken: token,
				groupName: invite.group.name,
				email: email,
			};
		}
	}

	async getInviteByToken(token: string) {
		const invite = await prisma.groupInvite.findUnique({
			where: { token },
			include: {
				group: { select: { id: true, name: true, description: true } },
				inviter: { select: { name: true } },
			},
		});

		if (!invite) throw new HttpException("Invalid or expired invitation link", 404);
		if (invite.status !== "PENDING") throw new HttpException("This invitation has already been used", 400);
		if (invite.expires_at < new Date()) {
			await prisma.groupInvite.update({
				where: { id: invite.id },
				data: { status: "EXPIRED" },
			});
			throw new HttpException("This invitation has expired", 400);
		}

		return invite;
	}

	async acceptInvite(userId: number, token: string) {
		const invite = await this.getInviteByToken(token);

		// Check if user is already a member
		const existingMember = await prisma.groupMember.findUnique({
			where: {
				group_id_user_id: {
					group_id: invite.group_id,
					user_id: userId,
				},
			},
		});

		if (existingMember) {
			await prisma.groupInvite.update({
				where: { id: invite.id },
				data: { status: "ACCEPTED" },
			});
			return existingMember;
		}

		// Add user to group and mark invite as accepted
		const [member] = await prisma.$transaction([
			prisma.groupMember.create({
				data: {
					group_id: invite.group_id,
					user_id: userId,
				},
			}),
			prisma.groupInvite.update({
				where: { id: invite.id },
				data: { status: "ACCEPTED" },
			}),
		]);

		return member;
	}

	async settleGroup(
		userId: number,
		groupId: number,
		data: { payer_id: number; receiver_id: number; amount: number },
	) {
		const group = await prisma.group.findUnique({
			where: { id: groupId },
			include: { members: true },
		});

		if (!group) throw new HttpException("Group not found", 404);

		const isMember = group.members.some((m: any) => m.user_id === userId);
		if (!isMember) throw new HttpException("Unauthorized", 403);

		return prisma.settlement.create({
			data: {
				group_id: groupId,
				payer_id: data.payer_id,
				receiver_id: data.receiver_id,
				amount: data.amount,
			},
		});
	}
}

export const groupService = new GroupService();
