import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const logPath = path.join(root, "logs", "prisma-migration.log");

export function migrationLog(message, level = "INFO") {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${line}\n`, "utf8");
  console.log(line);
}

export function migrationLogPath() {
  return logPath;
}
