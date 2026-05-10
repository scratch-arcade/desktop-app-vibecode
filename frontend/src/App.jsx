import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "/api";
const FAVORITES_KEY = "arcade:favorites";
const BOOT_DURATION_MS = 2800;
const APP_VERSION = "v0.4.0";
const GAME_LOAD_TIMEOUT_MS = 15000;
const PACKAGER_REPO_URL = "https://github.com/TurboWarp/packager";
const ADMIN_UNLOCK_SEQUENCE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "Enter"];
const ADMIN_KIOSK_PASSWORD = "arcade-admin";

function playMenuTick() {
  playTone(680, 0.04, 0.03, "square");
}

function playTone(freq, duration = 0.08, gain = 0.045, type = "sine") {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = freq;
  gainNode.gain.value = gain;
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

export default function App() {
  const gameFrameRef = useRef(null);
  const gameLoadTimerRef = useRef(null);
  const gameFrameKeyHandlerRef = useRef(null);

  const [games, setGames] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);
  const [booting, setBooting] = useState(true);
  const [activeGame, setActiveGame] = useState(null);
  const [showGameHelp, setShowGameHelp] = useState(true);
  const [loadingGame, setLoadingGame] = useState(false);
  const [transitionText, setTransitionText] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminSourceMode, setAdminSourceMode] = useState("file");
  const [adminProjectUrl, setAdminProjectUrl] = useState("");
  const [adminProjectFile, setAdminProjectFile] = useState(null);
  const [adminPackaging, setAdminPackaging] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminSeqIndex, setAdminSeqIndex] = useState(0);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [error, setError] = useState("");

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), BOOT_DURATION_MS);
    playTone(280, 0.12, 0.03);
    window.setTimeout(() => playTone(480, 0.08, 0.03), 140);
    window.setTimeout(() => playTone(760, 0.11, 0.04), 280);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  function handleInGameHotkey(event) {
    const key = event.key.toLowerCase();
    if (event.key === "F10" || key === "q") {
      event.preventDefault();
      event.stopPropagation();
      playTone(380, 0.08, 0.03);
      setActiveGame(null);
      return true;
    }
    if (event.key === "F5" || key === "r") {
      event.preventDefault();
      event.stopPropagation();
      reloadGameFrame();
      return true;
    }
    if (event.key === "F9" || key === "h") {
      event.preventDefault();
      event.stopPropagation();
      setShowGameHelp((value) => !value);
      return true;
    }
    if (event.key === "F12") {
      event.preventDefault();
      event.stopPropagation();
      setError("Sortie de secours: retour launcher.");
      setActiveGame(null);
      return true;
    }
    if (event.key === "Escape" || event.key === "F11") {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    return false;
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (activeGame) {
        handleInGameHotkey(event);
        return;
      }

      if (loading || !games.length) return;
      if (!adminUnlocked) {
        const expectedKey = ADMIN_UNLOCK_SEQUENCE[adminSeqIndex];
        if (event.key === expectedKey) {
          const next = adminSeqIndex + 1;
          setAdminSeqIndex(next);
          if (next === ADMIN_UNLOCK_SEQUENCE.length) {
            setAdminUnlocked(true);
            setAdminSeqIndex(0);
            setAdminMessage("Mode admin debloque.");
            playTone(820, 0.08, 0.05);
          }
        } else if (event.key !== "Shift" && event.key !== "Control" && event.key !== "Alt") {
          setAdminSeqIndex(0);
        }
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        playMenuTick();
        setSelectedIndex((value) => (value + 1) % games.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        playMenuTick();
        setSelectedIndex((value) => (value - 1 + games.length) % games.length);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        launchGame(games[selectedIndex]);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFavorite(games[selectedIndex].id);
      } else if (event.key.toLowerCase() === "r" || event.key === "F5") {
        event.preventDefault();
        fetchGames();
      } else if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        setShowAdminModal(true);
      } else if (adminUnlocked && event.key.toLowerCase() === "p") {
        event.preventDefault();
        quickPackageFromInbox();
      } else if (adminUnlocked && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setAdminUnlocked(false);
        setAdminMessage("Mode admin verrouille.");
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [activeGame, games, loading, selectedIndex]);

  function bindIframeHotkeys(iframe) {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) return;
    if (gameFrameKeyHandlerRef.current) {
      frameWindow.removeEventListener("keydown", gameFrameKeyHandlerRef.current, true);
    }
    const handler = (event) => {
      handleInGameHotkey(event);
    };
    frameWindow.addEventListener("keydown", handler, true);
    gameFrameKeyHandlerRef.current = handler;
  }

  async function fetchGames() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/games`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Erreur de chargement des jeux.");
      }
      setGames(data.games || []);
      setSelectedIndex((current) => Math.min(current, Math.max((data.games || []).length - 1, 0)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reloadGameFrame() {
    const frame = gameFrameRef.current;
    if (!frame) return;
    try {
      frame.contentWindow?.location.reload();
    } catch {
      frame.src = frame.src;
    }
  }

  function tryAutoStartScratch(iframe) {
    bindIframeHotkeys(iframe);
    try {
      const frameWindow = iframe.contentWindow;
      const frameDocument = frameWindow?.document;
      const canvas = frameDocument?.querySelector("canvas");
      if (!canvas) return;
      const clickEvent = new frameWindow.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 24
      });
      canvas.dispatchEvent(clickEvent);
      window.focus();
    } catch {
      // Keep silent if the packager output isolates internals.
    }
  }

  async function launchGame(game) {
    if (!game || launchingId) return;
    setLaunchingId(game.id);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: game.id, reopenLauncher: true })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Echec du lancement du jeu.");
      }
      if (data?.launched?.launchUrl) {
        playTone(560, 0.07, 0.04);
        window.setTimeout(() => playTone(760, 0.08, 0.04), 90);
        setTransitionText(`Chargement de ${game.title}...`);
        setLoadingGame(true);
        setActiveGame({ title: game.title, launchUrl: data.launched.launchUrl });
        if (gameLoadTimerRef.current) window.clearTimeout(gameLoadTimerRef.current);
        gameLoadTimerRef.current = window.setTimeout(() => {
          setLoadingGame(false);
          setActiveGame(null);
          setError("Le jeu met trop longtemps a charger. Retour launcher (watchdog).");
        }, GAME_LOAD_TIMEOUT_MS);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      window.setTimeout(() => setLaunchingId(null), 350);
    }
  }

  async function handleAdminPackage() {
    if (adminPackaging) return;
    setAdminPackaging(true);
    setAdminMessage("");
    try {
      const body = new FormData();
      body.append("sourceType", adminSourceMode);
      if (adminSourceMode === "file") {
        if (!adminProjectFile) throw new Error("Selectionne un fichier .sb2 ou .sb3.");
        body.append("projectFile", adminProjectFile);
      } else {
        if (!adminProjectUrl.trim()) throw new Error("Renseigne l'URL du projet.");
        body.append("projectUrl", adminProjectUrl.trim());
      }

      const response = await fetch(`${API_BASE}/admin/package`, {
        method: "POST",
        headers: {
          "x-admin-password": adminPassword
        },
        body
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Packaging impossible.");
      }
      setAdminMessage(`Jeu ajoute: ${data.game.title}`);
      setAdminProjectFile(null);
      setAdminProjectUrl("");
      await fetchGames();
    } catch (err) {
      setAdminMessage(err.message);
    } finally {
      setAdminPackaging(false);
    }
  }

  async function quickPackageFromInbox() {
    if (adminPackaging) return;
    setAdminPackaging(true);
    setAdminMessage("Packaging inbox en cours...");
    try {
      const response = await fetch(`${API_BASE}/admin/package-inbox`, {
        method: "POST",
        headers: {
          "x-admin-password": ADMIN_KIOSK_PASSWORD
        }
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Packaging inbox impossible.");
      }
      setAdminMessage(`Import OK: ${data?.game?.title || data?.source || "jeu ajoute"}`);
      await fetchGames();
    } catch (err) {
      setAdminMessage(err.message);
    } finally {
      setAdminPackaging(false);
    }
  }

  function toggleFavorite(gameId) {
    setFavorites((current) => (current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId]));
  }

  const selectedGame = games[selectedIndex];
  const orderedGames = [...games].sort((a, b) => {
    const favA = favoriteSet.has(a.id) ? 1 : 0;
    const favB = favoriteSet.has(b.id) ? 1 : 0;
    if (favA !== favB) return favB - favA;
    return a.title.localeCompare(b.title, "fr");
  });

  if (booting) {
    return (
      <main className="boot-root">
        <div className="boot-glow" />
        <div className="boot-content">
          <h1 className="boot-title">Scratch Arcade</h1>
          <p className="boot-subtitle">Initialisation de la borne...</p>
          <img className="boot-logo" src="/arcade-logo.png" alt="Scratch Arcade" />
          <p className="boot-version">Version experimentale {APP_VERSION} | Prototype fait via IA</p>
        </div>
      </main>
    );
  }

  return (
    <main className="arcade-root">
      <section className="scanline-overlay" aria-hidden />
      <section className="content">
        {loadingGame && (
          <section className="transition-layer">
            <div className="transition-spinner" />
            <p>{transitionText || "Chargement..."}</p>
          </section>
        )}

        {activeGame ? (
          <section className="game-shell">
            <div className="game-header">
              <h2>{activeGame.title}</h2>
              <p>Mode jeu actif</p>
            </div>
            <div className="game-body">
              <iframe
                ref={gameFrameRef}
                tabIndex={-1}
                title={activeGame.title}
                className="game-frame"
                src={activeGame.launchUrl}
                onLoad={(event) => {
                  tryAutoStartScratch(event.currentTarget);
                  setLoadingGame(false);
                  if (gameLoadTimerRef.current) window.clearTimeout(gameLoadTimerRef.current);
                  gameLoadTimerRef.current = null;
                }}
              />
              <div className="game-mouse-lock" />
              {showGameHelp && (
                <aside className="game-help">
                  <h3>Touches en jeu</h3>
                  <p><span className="kbd">F5 / R</span>Recharger le jeu</p>
                  <p><span className="kbd">F10 / Q</span>Quitter au launcher</p>
                  <p><span className="kbd">F9 / H</span>Afficher/Masquer aide</p>
                  <p><span className="kbd">F12</span>Sortie de secours</p>
                  <p><span className="kbd">Souris</span>Bloquee</p>
                </aside>
              )}
            </div>
          </section>
        ) : (
          <>
            <header className="title-row">
              <h1>Arcade Launcher</h1>
              <p>↑/↓ naviguer • Enter jouer • F favori • R/F5 actualiser • A admin</p>
            </header>

            {loading && <div className="loading-card">Chargement de la borne...</div>}
            {!loading && !!error && <div className="error-card">{error}</div>}

            {!loading && !error && (
              <div className="grid">
                <aside className="games-list">
                  {orderedGames.length === 0 && <p className="empty">Aucun .html detecte dans /games.</p>}
                  {orderedGames.map((game) => {
                    const selected = selectedGame?.id === game.id;
                    const favorite = favoriteSet.has(game.id);
                    return (
                      <button
                        type="button"
                        key={game.id}
                        className={`game-tile ${selected ? "selected" : ""}`}
                        onClick={() => setSelectedIndex(games.findIndex((item) => item.id === game.id))}
                      >
                        <span className="game-title">{game.title}</span>
                        {favorite && <span className="favorite-badge">★</span>}
                      </button>
                    );
                  })}
                </aside>

                <article className="detail-card">
                  <h2>{selectedGame?.title || "Selectionnez un jeu"}</h2>
                  <p className="subtitle">{selectedGame?.relativePath || "Placez les jeux TurboWarp .html dans /games"}</p>
                  <div className="actions">
                    <button
                      className="primary"
                      disabled={!selectedGame || launchingId === selectedGame.id}
                      onClick={() => launchGame(selectedGame)}
                    >
                      {launchingId === selectedGame?.id ? "Lancement..." : "Jouer"}
                    </button>
                    <button
                      className="secondary"
                      disabled={!selectedGame}
                      onClick={() => selectedGame && toggleFavorite(selectedGame.id)}
                    >
                      {selectedGame && favoriteSet.has(selectedGame.id) ? "Retirer favori" : "Ajouter favori"}
                    </button>
                  </div>
                </article>

                <aside className="help-card">
                  <h3>Touches launcher</h3>
                  <p><span className="kbd">↑/↓</span>Navigation jeux</p>
                  <p><span className="kbd">Enter</span>Lancer jeu</p>
                  <p><span className="kbd">F</span>Favori</p>
                  <p><span className="kbd">R/F5</span>Actualiser liste</p>
                  <p><span className="kbd">A</span>Ouvrir admin packager</p>
                  <h3>Admin borne sans souris</h3>
                  <p><span className="kbd">↑↑↓↓←→←→+Enter</span>Debloquer admin</p>
                  <p><span className="kbd">P</span>Packager dernier /imports</p>
                  <p><span className="kbd">L</span>Reverrouiller admin</p>
                  {adminUnlocked && <p><span className="kbd">Etat</span>Admin actif</p>}
                  {!!adminMessage && <p><span className="kbd">Info</span>{adminMessage}</p>}
                </aside>
              </div>
            )}

            <button className="admin-fab" type="button" onClick={() => setShowAdminModal(true)}>
              Ajouter un jeu (admin)
            </button>
          </>
        )}
      </section>

      {showAdminModal && (
        <section className="modal-backdrop">
          <div className="admin-modal">
            <h3>Ajouter un jeu (admin)</h3>
            <p className="subtitle">TurboWarp Packager simplifie: export force en HTML.</p>
            <label>Mot de passe admin</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            <div className="source-switch">
              <button type="button" className={adminSourceMode === "file" ? "primary" : "secondary"} onClick={() => setAdminSourceMode("file")}>
                Fichier .sb2/.sb3
              </button>
              <button type="button" className={adminSourceMode === "url" ? "primary" : "secondary"} onClick={() => setAdminSourceMode("url")}>
                URL projet
              </button>
            </div>
            {adminSourceMode === "file" ? (
              <input type="file" accept=".sb2,.sb3" onChange={(e) => setAdminProjectFile(e.target.files?.[0] || null)} />
            ) : (
              <input
                type="url"
                placeholder="https://..."
                value={adminProjectUrl}
                onChange={(e) => setAdminProjectUrl(e.target.value)}
              />
            )}
            <p className="subtitle">
              Repo packager:{" "}
              <a href={PACKAGER_REPO_URL} target="_blank" rel="noreferrer">
                {PACKAGER_REPO_URL}
              </a>
            </p>
            {!!adminMessage && <div className="loading-card">{adminMessage}</div>}
            <div className="actions">
              <button className="primary" type="button" disabled={adminPackaging} onClick={handleAdminPackage}>
                {adminPackaging ? "Packaging..." : "Packager et ajouter"}
              </button>
              <button className="secondary" type="button" onClick={() => setShowAdminModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
