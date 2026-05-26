import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FastifyInstance } from "fastify";

const execFileAsync = promisify(execFile);

export async function registerGitRoutes(app: FastifyInstance, cwd: string): Promise<void> {
  app.get("/git/status", async () => {
    return runGit(["status", "--short"], cwd);
  });

  app.get("/git/diff", async () => {
    return runGit(["diff", "--"], cwd);
  });

  app.get("/git/log", async () => {
    return runGit(["log", "--oneline", "--max-count=50"], cwd);
  });
}

async function runGit(args: string[], cwd: string): Promise<{ command: string; stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync("git", args, { cwd });
  return {
    command: `git ${args.join(" ")}`,
    stdout,
    stderr
  };
}
