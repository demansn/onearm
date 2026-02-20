import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.resolve(__dirname, "..");
const templateDir = path.join(engineDir, "games", "template");
const targetDir = process.cwd();

// --- Safety checks ---

if (!fs.existsSync(path.join(targetDir, "package.json"))) {
    console.error("No package.json found. Run `npm init -y` first.");
    process.exit(1);
}

if (path.resolve(targetDir) === path.resolve(engineDir)) {
    console.error("Cannot init inside the onearm engine directory.");
    process.exit(1);
}

if (fs.existsSync(path.join(targetDir, "src"))) {
    console.error("src/ directory already exists. Aborting to avoid overwriting.");
    process.exit(1);
}

// --- Copy template files ---

function copyRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy src/
copyRecursive(path.join(templateDir, "src"), path.join(targetDir, "src"));

// Copy assets/
copyRecursive(path.join(templateDir, "assets"), path.join(targetDir, "assets"));

// Copy .env.example
const envExample = path.join(templateDir, ".env.example");
if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, path.join(targetDir, ".env.example"));
}

// Copy .gitignore
const gitignoreSrc = path.join(templateDir, ".gitignore");
if (fs.existsSync(gitignoreSrc)) {
    fs.copyFileSync(gitignoreSrc, path.join(targetDir, ".gitignore"));
}

// --- Create .figma-tokens.json ---

fs.writeFileSync(path.join(targetDir, ".figma-tokens.json"), "{}\n");

// --- Update package.json ---

const pkgPath = path.join(targetDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const templateScripts = {
    "build": "npm run build --prefix node_modules/onearm",
    "build:prod": "npm run build:prod --prefix node_modules/onearm",
    "start": "npm run serve --prefix node_modules/onearm",
    "dev": "npm run start",
    "fonts": "npx onearm-fonts",
    "export": "npx onearm-export",
    "oauth": "npx onearm-oauth",
};

if (!pkg.scripts) {
    pkg.scripts = {};
}

for (const [key, value] of Object.entries(templateScripts)) {
    if (!pkg.scripts[key]) {
        pkg.scripts[key] = value;
    }
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// --- Replace {{GAME_NAME}} ---

const pkgName = pkg.name || "game";
const gameName = pkgName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const configPath = path.join(targetDir, "assets", "config.json");
if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, "utf8");
    configContent = configContent.replace("{{GAME_NAME}}", gameName);
    fs.writeFileSync(configPath, configContent);
}

// --- Copy CLAUDE.md (replace {{GAME_NAME}} placeholder) ---

const claudeMdSrc = path.join(templateDir, "CLAUDE.md");
if (fs.existsSync(claudeMdSrc)) {
    let claudeContent = fs.readFileSync(claudeMdSrc, "utf8");
    claudeContent = claudeContent.replace(/\{\{GAME_NAME\}\}/g, gameName);
    fs.writeFileSync(path.join(targetDir, "CLAUDE.md"), claudeContent);
}

// --- Copy .claude/skills ---

const skillsDir = path.join(engineDir, ".claude", "skills");
if (fs.existsSync(skillsDir)) {
    copyRecursive(skillsDir, path.join(targetDir, ".claude", "skills"));
}

// --- Done ---

console.log("Initialized successfully!");
console.log("");
console.log("Next steps:");
console.log("  npm run dev");
