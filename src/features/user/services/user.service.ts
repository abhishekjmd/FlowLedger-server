import { firebaseService } from "@/lib/firebase/firebase.service";
import prisma from "@/lib/database/prisma";
import { HttpException } from "@/middleware/error.middleware";

export class UserService {
	async getUser(userId: number) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { profile: true },
		});
		if (!user) throw new HttpException("User not found", 404);

		// Remove sensitive info
		const { password: _, verification_code: __, verification_expires: ___, ...safeUser } = user;
		return safeUser;
	}

	async updateProfile(userId: number, data: { name?: string; username?: string }) {
		try {
			return await prisma.user.update({
				where: { id: userId },
				data,
				include: { profile: true },
			});
		} catch (err: any) {
			if (err.code === "P2002") {
				throw new HttpException("Username already exists", 409);
			}
			throw err;
		}
	}

	async updateAvatar(userId: number, avatar: Express.Multer.File) {
		// Validate file type
		if (!avatar.mimetype.startsWith("image/")) {
			throw new HttpException("Only image files are allowed", 400);
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { profile: true },
		});

		if (!user || !user.profile) throw new HttpException("User or profile not found", 404);

		// Clean up old avatar if exists
		if (user.profile.avatar_filename) {
			try {
				await firebaseService.deleteImage(user.profile.avatar_filename);
			} catch (e) {
				console.error("Failed to delete old avatar", e);
			}
		}

		const fileName = `avatars/${user.username}-${user.id}-${Date.now()}`;

		const uploaded = await firebaseService.uploadImageBuffer(avatar.buffer, fileName, {
			contentType: avatar.mimetype,
		});

		const url = await firebaseService.getFileUrl(uploaded.ref.fullPath);

		return await prisma.profile.update({
			where: { user_id: userId },
			data: {
				avatar_url: url,
				avatar_filename: fileName,
			},
		});
	}
}

export const userService = new UserService();
