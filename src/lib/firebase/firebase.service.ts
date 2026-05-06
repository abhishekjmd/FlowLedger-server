import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { initializeApp } from "firebase/app";
import { CONFIG } from "@/config";

interface UploadFileBufferOptions {
	contentType: string;
}

export class FirebaseService {
	private readonly firebaseApp = initializeApp(CONFIG.firebase);
	private readonly storage = getStorage(this.firebaseApp, CONFIG.firebase.storageBucket);

	public async uploadImageBuffer(
		buffer: Buffer,
		filename: string,
		options: UploadFileBufferOptions,
	) {
		const storageRef = ref(this.storage, `images/${filename}`);
		const metaData = {
			contentType: options.contentType,
		};

		return await uploadBytes(storageRef, buffer, metaData);
	}

	public async getFileUrl(filepath: string) {
		const storageRef = ref(this.storage, `${filepath}`);
		return await getDownloadURL(storageRef);
	}

	public async deleteImage(filename: string) {
		const storageRef = ref(this.storage, `images/${filename}`);
		return await deleteObject(storageRef);
	}
}

export const firebaseService = new FirebaseService();
