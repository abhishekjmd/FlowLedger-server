import { Resend } from "resend";
import { CONFIG } from "@/config";

const resend = new Resend(CONFIG.mail.resendApiKey);

export class MailerService {
	async sendEmail(
		to: string,
		subject: string,
		body: string,
		attachments?: Array<{
			filename?: string;
			content?: string | Buffer;
			path?: string;
			contentType?: string;
		}>,
	) {
		console.log(`Sending email to ${to}...`);
		const info = await resend.emails.send({
			from: "onboarding@resend.dev",
			to,
			subject,
			html: body,
			attachments,
		});

		console.log(`Email sent to ${to}: ${info.data?.id ?? "unknown-id"}`);

		return info;
	}
}

export const mailerService = new MailerService();
