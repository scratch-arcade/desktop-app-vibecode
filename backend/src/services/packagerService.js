import fs from "node:fs/promises";
import path from "node:path";
import PackagerModule from "@turbowarp/packager";

const Packager = PackagerModule?.default ?? PackagerModule;

function sanitizeBaseName(name) {
  return String(name || "jeu")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48) || "jeu";
}

function inferNameFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    const fromPath = path.basename(url.pathname);
    return sanitizeBaseName(fromPath || "jeu-url");
  } catch {
    return "jeu-url";
  }
}

export async function resolveProjectInput({ sourceType, file, projectUrl }) {
  if (sourceType === "file") {
    if (!file?.buffer) {
      throw new Error("Fichier .sb2/.sb3 requis.");
    }
    return {
      buffer: file.buffer,
      suggestedName: sanitizeBaseName(file.originalname)
    };
  }

  if (sourceType === "url") {
    if (!projectUrl) {
      throw new Error("URL de projet requise.");
    }
    const url = new URL(projectUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("URL invalide.");
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Telechargement impossible (${response.status}).`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      suggestedName: inferNameFromUrl(projectUrl)
    };
  }

  throw new Error("sourceType invalide.");
}

export async function packageScratchProjectToHtml({ projectBuffer, baseName, gamesDir }) {
  await fs.mkdir(gamesDir, { recursive: true });

  const loadedProject = await Packager.loadProject(projectBuffer);
  const packager = new Packager.Packager();
  packager.project = loadedProject;
  packager.options.turbo = true;
  packager.options.framerate = 60;

  const result = await packager.package();
  if (result.type !== "text/html") {
    throw new Error("Le packager n'a pas produit un export HTML.");
  }

  const safeName = sanitizeBaseName(baseName);
  const filename = `${safeName}-${Date.now()}.html`;
  const outputPath = path.join(gamesDir, filename);
  await fs.writeFile(outputPath, Buffer.from(result.data));
  return { filename, outputPath };
}

export async function getLatestImportProject(importsDir) {
  await fs.mkdir(importsDir, { recursive: true });
  const entries = await fs.readdir(importsDir, { withFileTypes: true });
  const projectFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const ext = path.extname(entry.name).toLowerCase();
      return { name: entry.name, ext };
    })
    .filter((item) => item.ext === ".sb3" || item.ext === ".sb2");

  if (!projectFiles.length) return null;

  const withStats = await Promise.all(
    projectFiles.map(async (file) => {
      const fullPath = path.join(importsDir, file.name);
      const stat = await fs.stat(fullPath);
      return { ...file, fullPath, mtimeMs: stat.mtimeMs };
    })
  );

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latest = withStats[0];
  const buffer = await fs.readFile(latest.fullPath);

  return {
    buffer,
    filename: latest.name,
    suggestedName: sanitizeBaseName(latest.name)
  };
}
