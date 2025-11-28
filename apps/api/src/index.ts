import app from "./app";

const port = Number.parseInt(process.env.PORT || "3000", 10);

const server = Bun.serve({
	port,
	hostname: "0.0.0.0",
	fetch: app.fetch,
});

console.log("server running on port:", server.port);

