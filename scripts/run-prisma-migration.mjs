#!/usr/bin/env node
/**
 * Voert Prisma schema push + generate uit met logging.
 * tail -f logs/prisma-migration.log
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { migrationLog } from "./migration-log.mjs";

const root = path.resolve(import.meta.dirname, "..");

function run(cmd, args) {
  migrationLog(`RUN: ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: process.env });
  if (r.status !== 0) {
    migrationLog(`FAILED: exit ${r.status}`, "ERROR");
    process.exit(r.status ?? 1);
  }
  migrationLog(`OK: ${cmd} ${args.join(" ")}`);
}

migrationLog("=== Prisma migration run start ===");
run("npx", ["prisma", "db", "push"]);
run("npx", ["prisma", "generate"]);
migrationLog("=== Prisma migration run complete ===");
