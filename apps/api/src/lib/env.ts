import { z } from "zod";

const Env = z.object({
	PORT: z
		.string()
		.regex(/^\d+$/, "Port must be a numeric string")
		.default("3000")
		.transform(Number),
	DATABASE_URL: z.string().default("file:db.sqlite"),
	SLACK_BOT_TOKEN: z.string().min(1, "SLACK_BOT_TOKEN is required"),
	SLACK_SIGNING_SECRET: z.string().min(1, "SLACK_SIGNING_SECRET is required"),
	SLACK_APP_TOKEN: z.string().min(1, "SLACK_APP_TOKEN is required"),
	OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
	OPENAI_ASSISTANT_ID: z.string().min(1, "OPENAI_ASSISTANT_ID is required"),
});

export const env = Env.parse(process.env);

