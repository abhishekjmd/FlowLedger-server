export class ApiResponse<T> {
	public status: "success" | "error";
	public statusCode: number;
	public message: string;
	public data?: T;

	constructor(statusCode: number, message: string, data?: T) {
		this.statusCode = statusCode;
		this.status = statusCode < 400 ? "success" : "error";
		this.message = message;
		this.data = data;
	}

	static success<T>(message: string, data?: T, statusCode = 200) {
		return new ApiResponse(statusCode, message, data);
	}

	static error(message: string, statusCode = 500) {
		return new ApiResponse(statusCode, message);
	}
}
