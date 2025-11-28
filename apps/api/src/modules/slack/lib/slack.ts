import { WebClient } from "@slack/web-api";
import crypto from "crypto";

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN || "");

export function verifySlackSignature(
	timestamp: string,
	body: string,
	signature: string,
): boolean {
	try {
		const signingSecret = process.env.SLACK_SIGNING_SECRET;
		if (!signingSecret) {
			console.error("SLACK_SIGNING_SECRET is not set dddd");
			return false;
		}
		const hmac = crypto.createHmac("sha256", signingSecret);
		const sigBaseString = `v0:${timestamp}:${body}`;
		hmac.update(sigBaseString);
		const digest = hmac.digest("hex");
		const computedSignature = `v0=${digest}`;

		if (signature.length !== computedSignature.length) {
			return false;
		}
		return crypto.timingSafeEqual(
			Buffer.from(signature),
			Buffer.from(computedSignature),
		);
	} catch (error) {
		console.error("Error verifying Slack signature:", error);
		return false;
	}
}
export async function sendSlackMessage(
	channel: string,
	text: string,
): Promise<string | undefined> {
	const response = await slackClient.chat.postMessage({
		channel,
		text,
	});
	return response.ts;
}

export async function updateSlackMessage(
	channel: string,
	ts: string,
	text: string,
): Promise<void> {
	await slackClient.chat.update({
		channel,
		ts,
		text,
	});
}

export async function sendTypingIndicator(channel: string): Promise<void> {
	await slackClient.conversations.mark({
		channel,
		ts: Date.now().toString(),
	});
}

export async function getUserInfo(userId: string) {
	const response = await slackClient.users.info({ user: userId });
	return response.user;
}

