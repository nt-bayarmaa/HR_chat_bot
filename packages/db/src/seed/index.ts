import { prisma } from "../index";

async function main() {
	// Add your seed data here
	console.log("Seeding database...");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

