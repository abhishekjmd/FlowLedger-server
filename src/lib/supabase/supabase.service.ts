import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@/config";

export class SupabaseService {
	private readonly supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

	public async uploadImage(
		buffer: Buffer,
		filename: string,
		mimetype: string,
	): Promise<string> {
		const path = `avatars/${filename}`;

		const { error: uploadError } = await this.supabase.storage
			.from("avatars")
			.upload(path, buffer, {
				contentType: mimetype,
				upsert: false,
			});

		if (uploadError) {
			throw new Error(`Failed to upload image: ${uploadError.message}`);
		}

		// Get public URL
		const { data } = this.supabase.storage.from("avatars").getPublicUrl(path);

		return data.publicUrl;
	}

	public async deleteImage(filename: string): Promise<void> {
		const path = `avatars/${filename}`;

		const { error: deleteError } = await this.supabase.storage
			.from("avatars")
			.remove([path]);

		if (deleteError) {
			throw new Error(`Failed to delete image: ${deleteError.message}`);
		}
	}
}

export const supabaseService = new SupabaseService();
