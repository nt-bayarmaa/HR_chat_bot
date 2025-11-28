import { OpenApiTags } from "@api/constants";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { verifySlackSignature, sendSlackMessage, updateSlackMessage } from "../lib/slack";
import {
	processMessageWithAssistant,
	processMessageWithAssistantNoContext,
} from "../lib/openai";

const openAPIDefinition = createRoute({
	path: "/events/assistant",
	method: "post",
	summary: "Slack webhook endpoint for Assistants API",
	description: "Handles Slack events and processes them using OpenAI Assistants API",
	request: {
		body: {
			content: {
				"application/json": {
					schema: z.object({
						type: z.string(),
						token: z.string().optional(),
						challenge: z.string().optional(),
						event: z
							.object({
								type: z.string(),
								user: z.string().optional(),
								text: z.string().optional(),
								channel: z.string().optional(),
								ts: z.string().optional(),
								bot_id: z.string().optional(),
							})
							.optional(),
					}),
				},
			},
		},
		headers: z.object({
			"x-slack-signature": z.string().optional(),
			"x-slack-request-timestamp": z.string().optional(),
		}),
	},
	responses: {
		200: {
			description: "Success response",
			content: {
				"application/json": {
					schema: z.object({
						challenge: z.string().optional(),
						message: z.string().optional(),
					}),
				},
			},
		},
		401: {
			description: "Unauthorized - Invalid signature or missing credentials",
			content: {
				"application/json": {
					schema: z.object({
						error: z.string(),
					}),
				},
			},
		},
	},
	tags: [OpenApiTags.SLACK],
});

const route = new OpenAPIHono().openapi(openAPIDefinition, async (c) => {
	const rawBody = await c.req.text();
	const body = JSON.parse(rawBody) as {
		type: string;
		challenge?: string;
		event?: {
			type: string;
			user?: string;
			text?: string;
			channel?: string;
			bot_id?: string;
		};
	};
	if (body.type === "url_verification" && body.challenge) {
		return c.json({ challenge: body.challenge }, 200);
	}

	const signature = c.req.header("x-slack-signature");
	const timestamp = c.req.header("x-slack-request-timestamp");

	if (!signature || !timestamp) {
		return c.json({ error: "Missing signature or timestamp" }, 401);
	}

	const currentTime = Math.floor(Date.now() / 1000);
	
	if (Math.abs(currentTime - Number.parseInt(timestamp, 10)) > 300) {
		return c.json({ error: "Request timestamp too old" }, 401);
	}

	if (!verifySlackSignature(timestamp, rawBody, signature)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	if (body.type === "event_callback" && body.event) {
		const event = body.event;

		if (event.bot_id) {
			return c.json({ message: "Ignored bot message" }, 200);
		}

		if (event.type === "message" || event.type === "app_mention") {
			const channel = event.channel;
			const user = event.user;
			const text = event.text?.trim();

			if (!channel || !user || !text) {
				return c.json({ message: "Missing required event data" }, 200);
			}

			const cleanText = text.replace(/<@[A-Z0-9]+>/g, "").trim();

			if (!cleanText) {
				return c.json({ message: "Empty message after cleanup" }, 200);
			}

			(async () => {
				let thinkingMessageTs: string | undefined;
				let responseSent = false;

				try {
					thinkingMessageTs = await sendSlackMessage(channel, "Бодож байна...");

					const isDM = channel.startsWith("D");

					let response: string;
					if (isDM) {
						response = await processMessageWithAssistant(user, cleanText);
					} else {
						response = await processMessageWithAssistantNoContext(
							cleanText,
						);
					}

					if (thinkingMessageTs) {
						await updateSlackMessage(channel, thinkingMessageTs, response);
						responseSent = true;
					} else {
						await sendSlackMessage(channel, response);
						responseSent = true;
					}
				} catch (error) {
					console.error("Error processing message:", error);
					const errorMessage = "Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.";
					
					if (!responseSent) {
						if (thinkingMessageTs) {
							try {
								await updateSlackMessage(channel, thinkingMessageTs, errorMessage);
							} catch (updateError) {
								console.error("Error updating message:", updateError);
								await sendSlackMessage(channel, errorMessage);
							}
						} else {
							await sendSlackMessage(channel, errorMessage);
						}
					}
				}
			})().catch((error) => {
				console.error("Unhandled error in async processing:", error);
			});

			return c.json({ message: "Event received" }, 200);
		}
	}

	return c.json({ message: "Event type not handled" }, 200);
});

export default route;
