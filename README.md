# Arcade PC Launcher (Node + React + TurboWarp)

Projet de borne arcade moderne pour Windows, sans Electron, avec:
- launcher fullscreen React
- backend Node.js pour scanner/lancer les jeux `.html`
- auto-start Windows
- exemple Arduino HID (`Keyboard.h`)
test
## Arborescence

```text
desktop-app-vibecode/
├─ backend/
│  ├─ package.json
│  └─ src/
│     ├─ config.js
│     ├─ index.js
│     ├─ routes/
│     │  └─ games.js
│     └─ services/
│        ├─ gameService.js
│        └─ launcherService.js
├─ frontend/
│  ├─ package.json
│  ├─ vite.config.js
│  ├─ index.html
│  └─ src/
│     ├─ App.jsx
│     ├─ main.jsx
│     └─ styles.css
├─ arduino/
│  └─ ArcadeController/
│     └─ ArcadeController.ino
├─ games/
├─ imports/
├─ scripts/
│  ├─ build-all.bat
│  ├─ dev-start.bat
│  ├─ install-startup-folder.bat
│  ├─ install-task-scheduler.bat
│  └─ start-arcade.bat
└─ README.md
```

## Fonctionnement

1. Le backend scanne le dossier `games/` et détecte tous les `.html/.htm`.
2. Le frontend affiche la liste des jeux.
3. `POST /api/launch` renvoie une URL locale sécurisée vers le jeu (`/games/...`).
4. Le frontend redirige vers la page du jeu, sans `child_process`.

## API REST

- `GET /api/health`
- `GET /api/games`
- `POST /api/launch` avec body JSON:

```json
{
  "id": "id-du-jeu",
  "reopenLauncher": true
}
```

### Admin packager (HTML only)

- `GET /api/admin/info`
- `POST /api/admin/package` (multipart):
  - header: `x-admin-password`
  - champs:
    - `sourceType`: `file` ou `url`
    - `projectFile`: `.sb2/.sb3` (si `file`)
    - `projectUrl`: URL du projet (si `url`)

Le backend utilise `@turbowarp/packager` et force un export `text/html`.

### Admin borne sans souris (recommande)

1. Depuis le launcher, appuyer sur `Alt+Shift`
2. Entrer le mot de passe admin
3. Choisir un fichier `.sb3/.sb2` ou une URL
4. Lancer `Packager et ajouter`

La souris est reactvee seulement pendant le menu admin, puis re-desactivee a la fermeture.

## Installation

### Prérequis
- Windows 10/11
- Node.js LTS
- Microsoft Edge installé
- Optionnel: variable `ADMIN_PASSWORD` (sinon `arcade-admin`)

### 1) Développement

```bat
scripts\dev-start.bat
```

- Backend API: `http://localhost:3030`
- Frontend Vite: `http://localhost:5173`

### 2) Build production locale

```bat
scripts\build-all.bat
```

Puis lancement:

```bat
scripts\start-arcade.bat
```

Le script:
- démarre le backend en fond
- ouvre Edge en mode kiosk fullscreen sur `http://localhost:3030`
- applique des flags kiosk supplémentaires (timeout infini, gestures réduites)

## Packager TurboWarp repo/fork

- Repo officiel: [https://github.com/TurboWarp/packager](https://github.com/TurboWarp/packager)
- Préparer un fork local:

```bat
scripts\setup-packager-fork.bat
```

## Auto-start Windows

### Option A - Startup Folder

```bat
scripts\install-startup-folder.bat
```

### Option B - Task Scheduler

```bat
scripts\install-task-scheduler.bat
```

## Arduino HID (Leonardo/Micro)

Fichier: `arduino/ArcadeController/ArcadeController.ino`

Mapping:
- Gauche -> `LEFT_ARROW`
- Droite -> `RIGHT_ARROW`
- Haut -> `UP_ARROW`
- Bas -> `DOWN_ARROW`
- Bouton A -> `SPACE`
- Bouton B -> `ENTER`

Le code inclut:
- `Keyboard.h`
- deadzone joystick
- anti-spam par maintien/release propre
- boucle stable avec `delay(6)`

## Contraintes respectees

- Pas d'Electron
- Pas de mBlock
- Jeux TurboWarp `.html` servis en local
- Fonctionnement hors ligne (localhost + fichiers locaux)
- Code modulaire et evolutif

## Commandes kiosk

### Dans le launcher
- `UP/DOWN`: naviguer
- `ENTER` ou `SPACE`: lancer
- `F`: favori
- `R` ou `F5`: actualiser la liste

### Dans un jeu HTML
- `F5`: recharger le jeu
- `F10`: quitter le jeu et revenir au launcher
- `F9`: masquer/afficher le panneau d'aide

Le curseur est masque et un panneau des touches est affiche a droite.

## Important: verrouillage total de la fenetre

Depuis une page web seule, on ne peut pas bloquer de facon fiable tous les raccourcis systeme Windows (`Alt+F4`, `Ctrl+Alt+Del`, etc.).

Pour un vrai verrouillage borne "impossible a quitter", il faut configurer Windows en mode kiosk systeme (Assigned Access / Shell Launcher) en plus de ce projet.

## Bonus inclus

- Theme arcade sombre moderne
- Navigation clavier type borne
- Favoris (localStorage)
- Son de menu simple
- Ecran de chargement
