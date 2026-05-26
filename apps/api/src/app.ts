import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import { Server as SocketIOServer } from "socket.io";
import {
  callbackA2AHandoffSchema,
  callbackPostMessageSchema,
  callbackThreadContextSchema,
  createAgentSchema,
  createThreadSchema,
  postThreadMessageSchema
} from "@agent-team-runtime/shared";
import { CallbackAuthError, CallbackBridge } from "@agent-team-runtime/mcp-server";
import { AgentService } from "@agent-team-runtime/runtime";
import { PrismaRuntimeStore } from "./prismaStore.js";
import { registerGitRoutes } from "./gitRoutes.js";

export interface CreateAppOptions {
  prisma?: PrismaClient;
  callbackToken?: string;
  gitCwd?: string;
}

export async function createApp(options: CreateAppOptions = {}) {
  const prisma = options.prisma ?? new PrismaClient();
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: true });

  const io = new SocketIOServer(fastify.server, { cors: { origin: "*" } });
  const emit = (event: string, payload: unknown) => io.emit(event, payload);
  const service = new AgentService(new PrismaRuntimeStore(prisma), undefined, emit);
  const callbacks = new CallbackBridge(service, {
    token: options.callbackToken ?? process.env.CALLBACK_TOKEN,
    emit
  });

  fastify.get("/health", async () => ({ ok: true }));

  fastify.get("/agents", async () => service.listAgents());

  fastify.post("/agents", async (request, reply) => {
    const body = createAgentSchema.parse(request.body);
    const agent = await service.registerAgent(body);
    return reply.code(201).send(agent);
  });

  fastify.post("/threads", async (request, reply) => {
    const body = createThreadSchema.parse(request.body ?? {});
    const thread = await service.createThread(body);
    return reply.code(201).send(thread);
  });

  fastify.get("/threads/:threadId", async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const thread = await service.getThread(threadId);
    if (!thread) return reply.code(404).send({ error: "thread not found" });
    return thread;
  });

  fastify.post("/threads/:threadId/messages", async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const body = postThreadMessageSchema.parse(request.body);
    const result = await service.postMessage({ threadId, content: body.content, mode: body.mode });
    return reply.code(201).send(result);
  });

  fastify.post("/invocations/:id/cancel", async (request, reply) => {
    const { id } = request.params as { id: string };
    const invocation = await service.cancelInvocation(id);
    if (!invocation) return reply.code(404).send({ error: "invocation not found" });
    return invocation;
  });

  fastify.get("/invocations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const invocation = await service.getInvocation(id);
    if (!invocation) return reply.code(404).send({ error: "invocation not found" });
    return invocation;
  });

  fastify.get("/callbacks/thread-context", async (request, reply) => {
    try {
      callbacks.verifyToken(request.headers["x-callback-token"] as string | undefined);
      const query = callbackThreadContextSchema.parse(request.query);
      return callbacks.getThreadContext(query);
    } catch (error) {
      return handleCallbackError(reply, error);
    }
  });

  fastify.post("/callbacks/post-message", async (request, reply) => {
    try {
      callbacks.verifyToken(request.headers["x-callback-token"] as string | undefined);
      const body = callbackPostMessageSchema.parse(request.body);
      const message = await callbacks.postMessage(body);
      return reply.code(201).send(message);
    } catch (error) {
      return handleCallbackError(reply, error);
    }
  });

  fastify.post("/callbacks/a2a-handoff", async (request, reply) => {
    try {
      callbacks.verifyToken(request.headers["x-callback-token"] as string | undefined);
      const body = callbackA2AHandoffSchema.parse(request.body);
      const result = await callbacks.handoff(body);
      return reply.code(201).send(result);
    } catch (error) {
      return handleCallbackError(reply, error);
    }
  });

  await registerGitRoutes(fastify, options.gitCwd ?? process.cwd());

  return { fastify, io, prisma, service };
}

function handleCallbackError(reply: { code: (status: number) => { send: (body: unknown) => unknown } }, error: unknown) {
  if (error instanceof CallbackAuthError) {
    return reply.code(401).send({ error: error.message });
  }

  const message = error instanceof Error ? error.message : String(error);
  return reply.code(400).send({ error: message });
}
