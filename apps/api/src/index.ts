import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createApp } from "./app.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(currentDir, "../../../.env") });

const port = Number(process.env.API_PORT ?? 3104);
const host = process.env.API_HOST ?? "0.0.0.0";

const { fastify } = await createApp();

await fastify.listen({ port, host });
