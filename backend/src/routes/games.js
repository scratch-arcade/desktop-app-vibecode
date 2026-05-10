import express from "express";
import { config } from "../config.js";
import { findGameById, scanGames } from "../services/gameService.js";

export const gamesRouter = express.Router();

gamesRouter.get("/games", async (_req, res, next) => {
  try {
    const games = await scanGames(config.gamesDir);
    res.json({
      ok: true,
      games
    });
  } catch (error) {
    next(error);
  }
});

gamesRouter.post("/launch", async (req, res, next) => {
  try {
    const { id, reopenLauncher } = req.body || {};
    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "Le champ id est requis." });
    }

    const game = await findGameById(config.gamesDir, id);
    if (!game) {
      return res.status(404).json({ ok: false, error: "Jeu introuvable." });
    }

    const launchUrl = `/games/${game.relativePath
      .replace(/\\/g, "/")
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;

    return res.status(202).json({
      ok: true,
      launched: {
        id: game.id,
        title: game.title,
        launchUrl,
        reopenLauncher: Boolean(reopenLauncher ?? config.autoRelaunchLauncher)
      }
    });
  } catch (error) {
    return next(error);
  }
});
