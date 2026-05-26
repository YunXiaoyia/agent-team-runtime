import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app.js";

const execFileAsync = promisify(execFile);

describe("api callbacks", () => {
  const apps: Array<Awaited<ReturnType<typeof createApp>>> = [];
  const previousDatabaseUrl = process.env.DATABASE_URL;

  afterEach(async () => {
    await Promise.all(apps.map(async ({ fastify, io, prisma }) => {
      await fastify.close();
      io.close();
      await prisma.$disconnect();
    }));
    apps.length = 0;

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it("validates callback token and persists thread context plus callback messages", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-team-runtime-api-"));
    const databaseUrl = `file:${join(dir, "runtime.db")}`;
    process.env.DATABASE_URL = databaseUrl;

    await execFileAsync(
      "pnpm",
      ["--filter", "@agent-team-runtime/api", "exec", "prisma", "db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"],
      { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl } }
    );

    const app = await createApp({ callbackToken: "secret", gitCwd: dir });
    apps.push(app);

    await app.fastify.inject({
      method: "POST",
      url: "/agents",
      payload: { id: "mock", name: "Mock", provider: "mock", mention: "@mock", capabilities: ["test"] }
    });

    const threadResponse = await app.fastify.inject({
      method: "POST",
      url: "/threads",
      payload: { title: "api callback" }
    });
    const thread = threadResponse.json() as { id: string };

    const unauthorized = await app.fastify.inject({
      method: "GET",
      url: `/callbacks/thread-context?threadId=${thread.id}`,
      headers: { "x-callback-token": "bad" }
    });
    expect(unauthorized.statusCode).toBe(401);

    const posted = await app.fastify.inject({
      method: "POST",
      url: "/callbacks/post-message",
      headers: { "x-callback-token": "secret" },
      payload: { threadId: thread.id, sender: "codex", content: "callback done" }
    });
    expect(posted.statusCode).toBe(201);

    const context = await app.fastify.inject({
      method: "GET",
      url: `/callbacks/thread-context?threadId=${thread.id}`,
      headers: { "x-callback-token": "secret" }
    });

    expect(context.statusCode).toBe(200);
    expect(context.json().messages).toEqual([
      expect.objectContaining({ agentId: "codex", content: "callback done" })
    ]);
  });
});
