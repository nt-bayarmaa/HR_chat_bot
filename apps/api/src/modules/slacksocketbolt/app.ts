import { App, LogLevel } from "@slack/bolt";
import {
	processMessageWithAssistant,
	processMessageWithAssistantNoContext,
} from "../slack/lib/openai";

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	socketMode: true,
	appToken: process.env.SLACK_APP_TOKEN,
	logLevel: process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
});

const SLACK_MESSAGE_MAX_BYTES = 4000;
const SLACK_MESSAGE_MAX_CHARS = 3000;

function getByteLength(str: string): number {
	return new TextEncoder().encode(str).length;
}

async function sendLongMessage(
	channel: string,
	text: string,
	threadTs?: string,
	firstMessageTs?: string,
) {
	const charLength = text.length;
	const byteLength = getByteLength(text);

	if (byteLength <= SLACK_MESSAGE_MAX_BYTES && charLength <= SLACK_MESSAGE_MAX_CHARS) {
		if (firstMessageTs) {
			await app.client.chat.update({
				channel,
				ts: firstMessageTs,
				text,
			});
		} else {
			await app.client.chat.postMessage({
				channel,
				text,
				thread_ts: threadTs,
			});
		}
		return;
	}

	const chunks: string[] = [];
	let currentIndex = 0;

	while (currentIndex < text.length) {
		let chunkEnd = currentIndex;
		let chunkBytes = 0;

		while (chunkEnd < text.length) {
			const nextChar = text[chunkEnd];
			if (!nextChar) break;

			const nextCharBytes = getByteLength(nextChar);
			if (chunkBytes + nextCharBytes > SLACK_MESSAGE_MAX_BYTES) {
				break;
			}

			chunkBytes += nextCharBytes;
			chunkEnd++;
		}

		if (chunkEnd < text.length) {
			const lastNewline = text.lastIndexOf("\n", chunkEnd);
			if (lastNewline > currentIndex) {
				chunkEnd = lastNewline + 1;
			}
		}

		const chunk = text.substring(currentIndex, chunkEnd);
		if (chunk.length > 0) {
			chunks.push(chunk);
		}
		currentIndex = chunkEnd;
	}

	const safeChunks: string[] = [];
	for (const chunk of chunks) {
		const chunkBytes = getByteLength(chunk);
		if (chunkBytes <= SLACK_MESSAGE_MAX_BYTES) {
			safeChunks.push(chunk);
		} else {
			let subIndex = 0;
			while (subIndex < chunk.length) {
				let subChunkEnd = subIndex;
				let subChunkBytes = 0;

				while (subChunkEnd < chunk.length) {
					const nextChar = chunk[subChunkEnd];
					if (!nextChar) break;

					const nextCharBytes = getByteLength(nextChar);
					if (subChunkBytes + nextCharBytes > SLACK_MESSAGE_MAX_BYTES) {
						break;
					}

					subChunkBytes += nextCharBytes;
					subChunkEnd++;
				}

				const subChunk = chunk.substring(subIndex, subChunkEnd);
				if (subChunk.length > 0) {
					safeChunks.push(subChunk);
				}
				subIndex = subChunkEnd;
			}
		}
	}

	if (safeChunks.length === 0) {
		return;
	}

	if (firstMessageTs) {
		await app.client.chat.update({
			channel,
			ts: firstMessageTs,
			text: safeChunks[0] as string,
		});

		for (let i = 1; i < safeChunks.length; i++) {
			await app.client.chat.postMessage({
				channel,
				text: safeChunks[i] as string,
				thread_ts: firstMessageTs,
			});
		}
	} else {
		const firstMsg = await app.client.chat.postMessage({
			channel,
			text: safeChunks[0] as string,
			thread_ts: threadTs,
		});

		const threadTsForChunks = firstMsg.ts || threadTs;
		for (let i = 1; i < safeChunks.length; i++) {
			await app.client.chat.postMessage({
				channel,
				text: safeChunks[i] as string,
				thread_ts: threadTsForChunks,
			});
		}
	}
}

app.message(async ({ message, say }) => {
	if ("bot_id" in message && message.bot_id) {
		return;
	}

	if ("subtype" in message && message.subtype) {
		return;
	}

	if ("app_id" in message && message.app_id) {
		return;
	}

	const text = "text" in message ? message.text : "";
	const channel = "channel" in message ? message.channel : "";
	const user = "user" in message ? message.user : "";

	if (!text || !channel || !user) {
		return;
	}

	const cleanText = text.replace(/<@[A-Z0-9]+>/g, "").trim();

	if (!cleanText) {
		return;
	}

	try {
		const thinkingMessage = await say({
			text: "Бодож байна...",
			thread_ts: "thread_ts" in message ? message.thread_ts : undefined,
		});

		const isDM = channel.startsWith("D");

		let response: string;
		if (isDM) {
			response = await processMessageWithAssistant(user, cleanText);
		} else {
			response = await processMessageWithAssistantNoContext(cleanText);
		}

		const threadTs = "thread_ts" in message ? message.thread_ts : undefined;
		await sendLongMessage(
			channel,
			response,
			threadTs,
			thinkingMessage.ts,
		);
	} catch {
		await say({
			text: "Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.",
			thread_ts: "thread_ts" in message ? message.thread_ts : undefined,
		});
	}
});

app.event("app_mention", async ({ event, say }) => {
	const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
	const channel = event.channel;
	const user = event.user;

	if (!text || !user) {
		return;
	}

	try {
		const thinkingMessage = await say("Бодож байна...");

		const isDM = channel.startsWith("D");
		let response: string;

		if (isDM) {
			response = await processMessageWithAssistant(user, text);
		} else {
			response = await processMessageWithAssistantNoContext(text);
		}

		if (thinkingMessage.ts) {
			await sendLongMessage(channel, response, undefined, thinkingMessage.ts);
		} else {
			await sendLongMessage(channel, response);
		}
	} catch {
		await say("Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.");
	}
});

app.error(async () => {
});

export default app;

