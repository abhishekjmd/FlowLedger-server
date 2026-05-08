import prisma from "@/lib/database/prisma";
import { HttpException } from "@/middleware/error.middleware";

export class GroupService {
	async createGroup(
		userId: number,
		data: { name: string; description?: string; member_ids: number[] },
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
