import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.API_PORT ?? 3104);
const host = process.env.API_HOST ?? "0.0.0.0";

const { fastify } = await createApp();

await fastify.listen({ port, host });
