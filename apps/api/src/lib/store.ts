import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseState, defaultDatabaseState } from "./models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../../data");
const dataFilePath = path.join(dataDir, "db.json");

let writeLock = Promise.resolve();

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch {
    await fs.writeFile(dataFilePath, JSON.stringify(defaultDatabaseState, null, 2), "utf8");
  }
}

export async function readDatabase(): Promise<DatabaseState> {
  await ensureDataFile();
  const content = await fs.readFile(dataFilePath, "utf8");

  try {
    const parsed = JSON.parse(content) as DatabaseState;
    return {
      profiles: parsed.profiles ?? [],
      posts: parsed.posts ?? [],
      interactions: parsed.interactions ?? []
    };
  } catch {
    return defaultDatabaseState;
  }
}

export async function writeDatabase(database: DatabaseState): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(dataFilePath, JSON.stringify(database, null, 2), "utf8");
}

export async function mutateDatabase<T>(
  mutator: (database: DatabaseState) => T | Promise<T>
): Promise<T> {
  const currentWrite = writeLock.then(async () => {
    const db = await readDatabase();
    const result = await mutator(db);
    await writeDatabase(db);
    return result;
  });

  writeLock = currentWrite.then(
    () => undefined,
    () => undefined
  );

  return currentWrite;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(): string {
  return randomUUID();
}
