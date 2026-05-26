import { spawn } from "node:child_process";
import type { SpawnFn, SpawnResult } from "./types.js";

export const nodeSpawnFn: SpawnFn = (command, args, options = {}) => {
  return new Promise<SpawnResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
};
