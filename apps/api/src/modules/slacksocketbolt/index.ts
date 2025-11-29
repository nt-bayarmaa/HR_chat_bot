// import app from "./app";

// (async () => {
// 	try {
// 		if (!process.env.SLACK_BOT_TOKEN) {
// 			process.exit(1);
// 		}
// 		if (!process.env.SLACK_APP_TOKEN) {
// 			process.exit(1);
// 		}

// 		await app.start();
// 	} catch {
// 		process.exit(1);
// 	}
// })();

// process.on("SIGTERM", async () => {
// 	await app.stop();
// 	process.exit(0);
// });

// process.on("SIGINT", async () => {
// 	await app.stop();
// 	process.exit(0);
// });

