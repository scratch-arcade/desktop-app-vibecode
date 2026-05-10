import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { gamesRouter } from "./routes/games.js";
import { adminRouter } from "./routes/admin.js";
import { applyGameResponseHeaders } from "./services/gamePageService.js";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", gamesRouter);
app.use("/api", adminRouter);
app.use("/games", applyGameResponseHeaders, express.static(config.gamesDir));

async function setupStaticFrontend() {
  try {
    await fs.access(config.frontendDistDir);
    app.use(express.static(config.frontendDistDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      return res.sendFile(path.join(config.frontendDistDir, "index.html"));
    });
    return true;
  } catch {
    return false;
  }
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    error: "Erreur serveur interne."
  });
});

const frontendReady = await setupStaticFrontend();

app.listen(config.port, () => {
  console.log(`[arcade-backend] running on http://localhost:${config.port}`);
  if (!frontendReady) {
    console.log("[arcade-backend] frontend/dist absent, API only mode active.");
  }
});
