import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import Fastify from "fastify";
import { registerGitRoutes } from "../apps/api/src/gitRoutes.js";

const execFileAsync = promisify(execFile);

describe("git readonly routes", () => {
  const apps: Array<ReturnType<typeof Fastify>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it("serves status, diff, and log without write operations", async () => {
    const repo = await mkdtemp(join(tmpdir(), "agent-team-runtime-git-"));
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await writeFile(join(repo, "README.md"), "hello\n", "utf8");
    await execFileAsync("git", ["add", "README.md"], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });
    await writeFile(join(repo, "README.md"), "hello\nchanged\n", "utf8");

    const app = Fastify();
    apps.push(app);
    await registerGitRoutes(app, repo);

    const status = await app.inject({ method: "GET", url: "/git/status" });
    const diff = await app.inject({ method: "GET", url: "/git/diff" });
    const log = await app.inject({ method: "GET", url: "/git/log" });

    expect(status.json().stdout).toContain("M README.md");
    expect(diff.json().stdout).toContain("+changed");
    expect(log.json().stdout).toContain("init");
  });
});
