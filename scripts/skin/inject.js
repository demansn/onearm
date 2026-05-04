import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPLASH_MARKER = "<!-- boot-splash:injected -->";

/**
 * Inject boot splash HTML into dist/index.html.
 *
 * Precedence:
 *   1. <gameRoot>/static/boot-splash.html  (game-level override)
 *   2. <engineRoot>/static/boot-splash.html (engine default)
 */
export function injectSplash(gameRoot) {
    const indexPath = path.join(gameRoot, "dist", "index.html");
    if (!fs.existsSync(indexPath)) return;

    let html = fs.readFileSync(indexPath, "utf8");
    if (html.includes(SPLASH_MARKER)) return;

    const engineSplash = path.join(__dirname, "../../static/boot-splash.html");
    const gameSplash = path.join(gameRoot, "static/boot-splash.html");
    const splashPath = fs.existsSync(gameSplash) ? gameSplash : engineSplash;

    if (!fs.existsSync(splashPath)) return;

    const splash = fs.readFileSync(splashPath, "utf8").trim();
    const block = `${SPLASH_MARKER}\n${splash}\n${SPLASH_MARKER}\n`;

    html = html.includes("</body>")
        ? html.replace("</body>", `${block}</body>`)
        : html + "\n" + block;

    fs.writeFileSync(indexPath, html);
    console.log("[skin] Injected boot splash into dist/index.html");
}

/**
 * Inject <script>window.__SKINS__=[...]</script> into dist/index.html
 * so the runtime knows the available skin list without an extra fetch.
 */
export function injectSkinList(gameRoot, skins) {
    const indexPath = path.join(gameRoot, "dist", "index.html");
    if (!fs.existsSync(indexPath)) return;

    let html = fs.readFileSync(indexPath, "utf8");
    // Remove any previously injected skin list
    html = html.replace(/\s*<script data-onearm-skins>[^<]*<\/script>/g, "");

    const tag = `<script data-onearm-skins>window.__SKINS__=${JSON.stringify(skins)}</script>`;

    html = html.includes("</head>")
        ? html.replace("</head>", `${tag}\n</head>`)
        : html.includes("</body>")
        ? html.replace("</body>", `${tag}\n</body>`)
        : html + "\n" + tag;

    fs.writeFileSync(indexPath, html);
    console.log(`[skin] Injected skin list: ${skins.join(", ")}`);
}
