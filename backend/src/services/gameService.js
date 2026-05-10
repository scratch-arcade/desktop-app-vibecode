import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ALLOWED_GAME_EXTENSIONS = new Set([".html", ".htm"]);

function gameIdFromPath(filePath) {
  return crypto.createHash("sha1").update(filePath).digest("hex").slice(0, 12);
}

async function listExeFilesRecursive(baseDir, currentDir = baseDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const found = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listExeFilesRecursive(baseDir, fullPath);
      found.push(...nested);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (entry.isFile() && ALLOWED_GAME_EXTENSIONS.has(extension)) {
      const relativePath = path.relative(baseDir, fullPath);
      found.push({
        id: gameIdFromPath(relativePath),
        title: path.basename(entry.name, extension),
        filePath: fullPath,
        relativePath
      });
    }
  }

  return found;
}

export async function scanGames(gamesDir) {
  try {
    await fs.access(gamesDir);
  } catch {
    await fs.mkdir(gamesDir, { recursive: true });
  }

  const games = await listExeFilesRecursive(gamesDir);
  return games.sort((a, b) => a.title.localeCompare(b.title, "fr"));
}

export async function findGameById(gamesDir, id) {
  const games = await scanGames(gamesDir);
  return games.find((game) => game.id === id) || null;
}
