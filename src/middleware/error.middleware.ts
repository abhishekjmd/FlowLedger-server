import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/ApiResponse";

export class HttpException extends Error {
	constructor(
		public message: string,
		public statusCode: number = 500,
	) {
		super(message);
		this.name = "HttpException";
	}
}

export const errorHandler = (
	err: Error | HttpException,
	req: Request,
	res: Response,
	_next: NextFunction,
) => {
	const statusCode = err instanceof HttpException ? err.statusCode : 500;
	const message = err.message || "Internal Server Error";

	console.error(`[Error] ${req.method} ${req.url} - ${statusCode}: ${message}`);

	if (statusCode === 500) {
		console.error(err.stack);
	}

	res.status(statusCode).json(new ApiResponse(statusCode, message));
};
