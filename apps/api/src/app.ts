import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import routes from "./routes";

const app = new OpenAPIHono();

app.use("*", logger());

app.get("/", (c) => {
	return c.json({
		message: "hr_chatbot backend starting...",
		version: "1.0.0",
		docs: "/api/docs",
		openapi: "/api/openapi.json",
	});
});

app.route("/", routes);

app.onError((err, c) => {
	return c.json(
		{
			message: err.message,
			stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
		},
		500,
	);
});

app.notFound((c) => {
	return c.json(
		{
			message: "Not Found",
			path: c.req.path,
		},
		404,
	);
});

if (process.env.NODE_ENV === "development") {
	app
		.doc("/api/openapi.json", {
			openapi: "3.0.0",
			info: {
				version: "1.0.0",
				title: "hr_chatbot",
			},
		})
		.get(
			"/api/docs",
			swaggerUI({
				url: "/api/openapi.json",
			}),
		);
}

export default app;

