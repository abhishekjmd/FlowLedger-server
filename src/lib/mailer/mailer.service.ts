import nodemailer from "nodemailer";
import { CONFIG } from "@/config";

export class MailerService {
	private transporter: nodemailer.Transporter | null = null;

	private async getTransporter() {
		if (this.transporter) return this.transporter;

		if (CONFIG.isDev || CONFIG.isTest) {
			console.log("Creating test account for email...");
			const testAccount = await nodemailer.createTestAccount();
			console.log("Test account created: ", testAccount.user);
			this.transporter = nodemailer.createTransport({
				host: "smtp.ethereal.email",
				port: 587,
				secure: false,
				auth: {
					user: testAccount.user,
					pass: testAccount.pass,
				},
			});
		} else {
			this.transporter = nodemailer.createTransport({
				host: CONFIG.mail.host,
      port: 465,
      secure: true,
				auth: {
					user: CONFIG.mail.user,
					pass: CONFIG.mail.pass,
				},
			});
		}

		return this.transporter;
	}

	async sendEmail(
		to: string,
		subject: string,
		body: string,
		attachments?: nodemailer.SendMailOptions["attachments"],
	): Promise<nodemailer.SentMessageInfo> {
		console.log(`Sending email to ${to}...`);
		const transporter = await this.getTransporter();

		const info = await transporter.sendMail({
			from: `"FlowLedger" <${CONFIG.mail.user}>`,
			to,
			subject,
			html: body,
			attachments,
		});

		console.log(`Email sent to ${to}: ${info.messageId}`);
		if (CONFIG.isDev) {
			console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
		}

		return info;
	}
}

export const mailerService = new MailerService();
