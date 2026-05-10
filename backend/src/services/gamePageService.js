export function applyGameResponseHeaders(_req, res, next) {
  // TurboWarp Packager may rely on cross-origin isolation features.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}
