/**
 * Start Next met cwd = bergasports en .env.local die shell-variabelen overschrijft
 * (voorkomt per ongeluk Hotelink DATABASE_URL op localhost:3000).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv, projectRoot } from "./load-project-env.mjs";

const cmd = process.argv[2];

if (cmd !== "dev" && cmd !== "build") {
  console.error("Usage: node scripts/run-next.mjs <dev|build> [...extra next args]");
  process.exit(1);
}

const extra = process.argv.slice(3);
const isWin = process.platform === "win32";
const projectEnv = loadProjectEnv(projectRoot);
const childEnv = {
  ...process.env,
  ...projectEnv,
  NEXT_PRIVATE_DEV_DIR: projectRoot,
};

if (projectEnv.DATABASE_URL) {
  const host = projectEnv.DATABASE_URL.includes("1f6a332bda947ec2") ? "Bergasports" : "custom";
  if (host !== "Bergasports") {
    console.warn(
      "[run-next] Waarschuwing: DATABASE_URL lijkt niet het Bergasports Prisma-project — controleer .env.local",
    );
  }
}

if (cmd === "dev") {
  const child = spawn("npx", ["next", "dev", "--webpack", ...extra], {
    stdio: "inherit",
    cwd: projectRoot,
    shell: isWin,
    env: childEnv,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  const child = spawn("npx", ["next", "build", projectRoot, "--webpack", ...extra], {
    stdio: "inherit",
    cwd: projectRoot,
    shell: isWin,
    env: childEnv,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}
