import express from "express";
import multer from "multer";
import { config } from "../config.js";
import { scanGames } from "../services/gameService.js";
import { getLatestImportProject, packageScratchProjectToHtml, resolveProjectInput } from "../services/packagerService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 40 * 1024 * 1024
  }
});

export const adminRouter = express.Router();

adminRouter.get("/admin/info", (_req, res) => {
  res.json({
    ok: true,
    packagerRepo: config.packagerRepoUrl,
    mode: "html-only"
  });
});

adminRouter.post("/admin/package", upload.single("projectFile"), async (req, res, next) => {
  try {
    const providedPassword = String(req.headers["x-admin-password"] || "");
    if (providedPassword !== config.adminPassword) {
      return res.status(401).json({ ok: false, error: "Mot de passe admin invalide." });
    }

    const sourceType = String(req.body?.sourceType || "file");
    const projectInput = await resolveProjectInput({
      sourceType,
      file: req.file,
      projectUrl: req.body?.projectUrl
    });

    const packaged = await packageScratchProjectToHtml({
      projectBuffer: projectInput.buffer,
      baseName: projectInput.suggestedName,
      gamesDir: config.gamesDir
    });

    const games = await scanGames(config.gamesDir);
    const game = games.find((item) => item.relativePath === packaged.filename) || null;

    return res.status(201).json({
      ok: true,
      game
    });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post("/admin/package-inbox", async (req, res, next) => {
  try {
    const providedPassword = String(req.headers["x-admin-password"] || "");
    if (providedPassword !== config.adminPassword) {
      return res.status(401).json({ ok: false, error: "Mot de passe admin invalide." });
    }

    const latest = await getLatestImportProject(config.importsDir);
    if (!latest) {
      return res.status(404).json({
        ok: false,
        error: "Aucun fichier .sb2/.sb3 trouve dans /imports."
      });
    }

    const packaged = await packageScratchProjectToHtml({
      projectBuffer: latest.buffer,
      baseName: latest.suggestedName,
      gamesDir: config.gamesDir
    });

    const games = await scanGames(config.gamesDir);
    const game = games.find((item) => item.relativePath === packaged.filename) || null;

    return res.status(201).json({
      ok: true,
      source: latest.filename,
      game
    });
  } catch (error) {
    return next(error);
  }
});
