import { Request, Response } from "express";
import { groupService } from "../services/group.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { z } from "zod";

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Collaborative expense groups
 */
export class GroupController {
	create = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const group = await groupService.createGroup(userId, req.body);
		res.status(201).json(ApiResponse.success("Group created successfully", group, 201));
	});

	list = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const groups = await groupService.getGroups(userId);
		res.status(200).json(ApiResponse.success("Groups retrieved", groups));
	});

	getDetails = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const groupId = Number(req.params.id);
		const details = await groupService.getGroupDetails(userId, groupId);
		res.status(200).json(ApiResponse.success("Group details retrieved", details));
	});

	invite = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const groupId = Number(req.params.id);
		const data = z.object({ email: z.string().email() }).parse(req.body);
		const result = await groupService.inviteMember(userId, groupId, data.email);
		
		const message = (result as any).isNewUser 
			? "Invitation link generated" 
			: "Member added to group";
			
		res.status(201).json(ApiResponse.success(message, result, 201));
	});

	getInviteInfo = asyncHandler(async (req: Request, res: Response) => {
		const { token } = req.params;
		const invite = await groupService.getInviteByToken(token);
		res.status(200).json(ApiResponse.success("Invitation details retrieved", invite));
	});

	acceptInvite = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const { token } = req.body;
		const member = await groupService.acceptInvite(userId, token);
		res.status(201).json(ApiResponse.success("Joined group successfully", member, 201));
	});

	settle = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const groupId = Number(req.params.id);
		const settlement = await groupService.settleGroup(userId, groupId, req.body);
		res.status(201).json(ApiResponse.success("Settlement recorded", settlement, 201));
	});
}

export const groupController = new GroupController();
