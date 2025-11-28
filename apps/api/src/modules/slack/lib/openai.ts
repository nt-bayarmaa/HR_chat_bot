import OpenAI from "openai";
import { prisma } from "@api/lib/prisma";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY || "",
});
let assistantId: string | null = process.env.OPENAI_ASSISTANT_ID || null;

async function getOrCreateAssistant(): Promise<string> {
	if (assistantId) {
		return assistantId;
	}
	console.log("creating assistant");
	const assistant = await openai.beta.assistants.create({
		name: "HR Assistant",
		instructions:
			"You are a helpful HR assistant. Answer questions about salary, policies, leave, and other HR-related topics based on the provided documentation. Be concise, accurate, and professional.",
		model: "gpt-4o-mini",
		tools: [{ type: "file_search" }],
	});
	
	assistantId = assistant.id;
	return assistant.id;
}


function removeFileCitations(text: string): string {
	// - 【8†file.pdf】
	// - 【8:0†file.pdf】
	// - 【20:0-3†People & Talent_v099.pdf】
	return text.replace(/【\d+(?::\d+(?:-\d+)?)?†[^】]+】/g, "").trim();
}

async function getOrCreateThread(slackUserId: string): Promise<string> {
	const botUser = await prisma.botUser.findUnique({
		where: { slackUserId },
	});

	if (botUser?.threadId) {
		return botUser.threadId;
	}

	const thread = await openai.beta.threads.create();
	console.log("thread",thread);

	await prisma.botUser.upsert({
		where: { slackUserId },	
		create: {
			slackUserId,
			threadId: thread.id,
		},
		update: {
			threadId: thread.id,
		},
	});

	return thread.id;
}


export async function processMessageWithAssistant(
	slackUserId: string,
	message: string,
): Promise<string> {
	const assistantId = await getOrCreateAssistant();	
	console.log("assistantId",assistantId);

	const threadId = await getOrCreateThread(slackUserId);
	console.log("threadId",threadId);

	await openai.beta.threads.messages.create(threadId, {
		role: "user",
		content: message,
	});

	const run = await openai.beta.threads.runs.create(threadId, {
		assistant_id: assistantId,
	});
	console.log("run",run.id);

	let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
	console.log("runStatus1",runStatus);

	while (runStatus.status === "queued" || runStatus.status === "in_progress") {
		await new Promise((resolve) => setTimeout(resolve, 500)); 
		runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
	}

	if (runStatus.status === "completed") {
		const messages = await openai.beta.threads.messages.list(threadId, {
			limit: 1,
		});
		console.log("messages",messages);

		const latestMessage = messages.data[0];
		console.log("latestMessage",latestMessage);

		if (
			latestMessage?.content[0] &&
			"text" in latestMessage.content[0]
		) {
			const responseText = latestMessage.content[0].text.value;
			return removeFileCitations(responseText);
		}
	}

	if (runStatus.status === "failed") {
		throw new Error(
			`OpenAI run failed: ${runStatus.last_error?.message || "Unknown error"}`,
		);
	}

	throw new Error(`Unexpected run status: ${runStatus.status}`);
}

export async function processMessageWithAssistantNoContext(
	message: string,
): Promise<string> {
	const assistantId = await getOrCreateAssistant();

	const thread = await openai.beta.threads.create();
	const threadId = thread.id;

	await openai.beta.threads.messages.create(threadId, {
		role: "user",
		content: message,
	});

	const run = await openai.beta.threads.runs.create(threadId, {
		assistant_id: assistantId,
	});

	let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

	while (runStatus.status === "queued" || runStatus.status === "in_progress") {
		await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
		runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
	}

	if (runStatus.status === "completed") {
		const messages = await openai.beta.threads.messages.list(threadId, {
			limit: 1,
		});

		const latestMessage = messages.data[0];
		if (
			latestMessage?.content[0] &&
			"text" in latestMessage.content[0]
		) {
			const responseText = latestMessage.content[0].text.value;
			return removeFileCitations(responseText);
		}
	}

	if (runStatus.status === "failed") {
		throw new Error(
			`OpenAI run failed: ${runStatus.last_error?.message || "Unknown error"}`,
		);
	}

	throw new Error(`Unexpected run status: ${runStatus.status}`);
}


export async function processMessageWithChat(
	message: string,
): Promise<string> {
	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [
			{
				role: "system",
				content:
					"You are a helpful HR assistant. Answer questions about salary, policies, leave, and other HR-related topics. Be concise, accurate, and professional.",
			},
			{
				role: "user",
				content: message,
			},
		],
		temperature: 0.7,
	});

	const response = completion.choices[0]?.message?.content;
	if (!response) {
		throw new Error("No response from OpenAI");
	}

	return response;
}

