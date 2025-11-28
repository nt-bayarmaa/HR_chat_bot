# hr_chatbot

Backend API built with Hono, Bun, Prisma, and TypeScript.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Generate Prisma client:
```bash
cd packages/db
bun run generate
cd ../..
```

3. Build RPC types:
```bash
cd apps/api
bun run build:rpc
cd ../..
```

4. Run development server:
```bash
bun run dev
```

The API will be available at `http://localhost:3000`
Swagger documentation will be available at `http://localhost:3000/api/docs`

## Project Structure

- `apps/api` - Main API application
- `packages/db` - Database package with Prisma
- `packages/constants` - Shared constants
- `packages/utils` - Utility functions

## Scripts

- `bun run dev` - Start development server with RPC watch mode
- `bun run build:rpc` - Build RPC types
- `bun run typecheck` - Type check all packages
- `bun run lint` - Lint code with Biome

