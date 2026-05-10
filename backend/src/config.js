import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

export const config = {
  port: Number(process.env.PORT || 3030),
  gamesDir: path.resolve(rootDir, "games"),
  frontendDistDir: path.resolve(rootDir, "frontend", "dist"),
  dataDir: path.resolve(rootDir, "backend", "data"),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3030",
  autoRelaunchLauncher: process.env.AUTO_RELAUNCH_LAUNCHER === "true",
  adminPassword: process.env.ADMIN_PASSWORD || "arcade-admin",
  packagerRepoUrl: "https://github.com/TurboWarp/packager"
};
