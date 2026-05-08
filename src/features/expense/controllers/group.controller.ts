import { Request, Response } from "express";
import { groupService } from "../services/group.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";

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

	settle = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const groupId = Number(req.params.id);
		const settlement = await groupService.settleGroup(userId, groupId, req.body);
		res.status(201).json(ApiResponse.success("Settlement recorded", settlement, 201));
	});
}

export const groupController = new GroupController();
