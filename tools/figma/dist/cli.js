#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// tools/figma/src/utils/find-game-root.ts
import path from "path";
import fs from "fs";
function parseGameArg(argv = process.argv) {
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const match = arg.match(/^--?game(?:=|:)(.+)$/);
    if (match && match[1]) {
      return match[1];
    }
    if (arg === "--game" || arg === "-game") {
      return args[i + 1] || null;
    }
  }
  return null;
}
function findOnearmRoot(startDir = process.cwd()) {
  let current = startDir;
  if (current.includes("/node_modules/onearm")) {
    const parts = current.split("/node_modules/onearm");
    return path.join(parts[0], "node_modules", "onearm");
  }
  while (current !== "/") {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "onearm") {
          return current;
        }
      } catch {
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}
function findNearestGameRoot(startDir = process.cwd()) {
  let current = startDir;
  while (current !== "/") {
    const entryPoint = path.join(current, "src", "Main.js");
    if (fs.existsSync(entryPoint)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}
function resolveDefaultSandboxRoot() {
  const onearmRoot = findOnearmRoot();
  if (!onearmRoot) return null;
  const sandboxRoot = path.join(onearmRoot, "games", "sandbox");
  const entryPoint = path.join(sandboxRoot, "src", "Main.js");
  if (fs.existsSync(entryPoint)) {
    return sandboxRoot;
  }
  return null;
}
function resolveGameRootFromArgs() {
  const gameArg = parseGameArg() || process.env.npm_config_game || process.env.GAME;
  if (!gameArg) return null;
  const candidates = [];
  if (path.isAbsolute(gameArg)) {
    candidates.push(gameArg);
  }
  if (gameArg.startsWith(".") || gameArg.includes(path.sep)) {
    candidates.push(path.resolve(process.cwd(), gameArg));
  }
  const onearmRoot = findOnearmRoot();
  if (onearmRoot) {
    candidates.push(path.join(onearmRoot, "games", gameArg));
  }
  for (const candidate of candidates) {
    const entryPoint = path.join(candidate, "src", "Main.js");
    if (fs.existsSync(entryPoint)) {
      return candidate;
    }
  }
  console.warn(`Game "${gameArg}" not found or missing src/Main.js. Falling back to auto-detect.`);
  return null;
}
function findGameRoot() {
  if (process.env.GAME_ROOT) {
    return process.env.GAME_ROOT;
  }
  const gameRootFromArgs = resolveGameRootFromArgs();
  if (gameRootFromArgs) return gameRootFromArgs;
  const nearestGameRoot = findNearestGameRoot();
  if (nearestGameRoot) return nearestGameRoot;
  const defaultSandboxRoot = resolveDefaultSandboxRoot();
  if (defaultSandboxRoot) return defaultSandboxRoot;
  let current = process.cwd();
  const isOnearmPackage = () => {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        return pkg.name === "onearm";
      } catch {
        return false;
      }
    }
    return false;
  };
  if (current.includes("/node_modules/onearm")) {
    const parts = current.split("/node_modules/onearm");
    return parts[0];
  }
  if (isOnearmPackage()) {
    const parentDir = path.dirname(current);
    try {
      const siblings = fs.readdirSync(parentDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory()).map((dirent) => path.join(parentDir, dirent.name));
      for (const sibling of siblings) {
        const nodeModulesOnearm = path.join(sibling, "node_modules", "onearm");
        if (fs.existsSync(nodeModulesOnearm)) {
          try {
            const realPath = fs.realpathSync(nodeModulesOnearm);
            if (realPath === current) {
              const siblingPkg = path.join(sibling, "package.json");
              if (fs.existsSync(siblingPkg)) {
                const pkg = JSON.parse(fs.readFileSync(siblingPkg, "utf8"));
                if (pkg.dependencies?.onearm || pkg.devDependencies?.onearm) {
                  return sibling;
                }
              }
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }
  while (current !== "/") {
    if (fs.existsSync(path.join(current, "node_modules", "onearm"))) {
      return current;
    }
    if (fs.existsSync(path.join(current, "package.json"))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(current, "package.json"), "utf8"));
      if (pkg.dependencies?.onearm || pkg.devDependencies?.onearm) {
        return current;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}
var init_find_game_root = __esm({
  "tools/figma/src/utils/find-game-root.ts"() {
    "use strict";
  }
});

// tools/figma/src/auth/FigmaAuth.ts
import fs2 from "fs";
import path2 from "path";
var FigmaAuth;
var init_FigmaAuth = __esm({
  "tools/figma/src/auth/FigmaAuth.ts"() {
    "use strict";
    init_find_game_root();
    FigmaAuth = class {
      tokenFile;
      clientId;
      clientSecret;
      constructor() {
        const gameRoot2 = findGameRoot();
        this.tokenFile = path2.join(gameRoot2, ".figma-tokens.json");
        this.clientId = process.env.FIGMA_CLIENT_ID || "";
        this.clientSecret = process.env.FIGMA_CLIENT_SECRET || "";
        if (!this.clientId || !this.clientSecret) {
          throw new Error("OAuth credentials required: FIGMA_CLIENT_ID and FIGMA_CLIENT_SECRET must be set in .env file");
        }
      }
      async getValidToken() {
        return await this.getOAuthToken();
      }
      async getOAuthToken() {
        const storedTokens = this.loadStoredTokens();
        if (!storedTokens || !storedTokens.refresh_token) {
          throw new Error(
            "OAuth tokens not found. Run: npx onearm-figma oauth-setup"
          );
        }
        if (this.isTokenValid(storedTokens)) {
          return storedTokens.access_token;
        }
        console.log("Updating access token via refresh token...");
        try {
          const newTokens = await this.refreshAccessToken(storedTokens.refresh_token);
          this.saveTokens(newTokens);
          console.log("Token updated successfully");
          return newTokens.access_token;
        } catch (error) {
          if (error.message.includes("invalid_grant")) {
            throw new Error(
              "Refresh token expired. Re-authorize: npx onearm-figma oauth-setup"
            );
          }
          throw error;
        }
      }
      isTokenValid(tokens) {
        if (!tokens || !tokens.access_token || !tokens.expires_at) {
          return false;
        }
        const bufferTime = 5 * 60 * 1e3;
        return Date.now() < tokens.expires_at - bufferTime;
      }
      async refreshAccessToken(refreshToken) {
        const response = await fetch("https://api.figma.com/v1/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token"
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Token refresh error: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(`OAuth error: ${data.error_description || data.error}`);
        }
        const expiresAt = Date.now() + data.expires_in * 1e3;
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token || refreshToken,
          expires_in: data.expires_in,
          expires_at: expiresAt,
          token_type: data.token_type || "Bearer"
        };
      }
      loadStoredTokens() {
        try {
          if (!fs2.existsSync(this.tokenFile)) {
            return null;
          }
          const data = fs2.readFileSync(this.tokenFile, "utf8");
          return JSON.parse(data);
        } catch {
          return null;
        }
      }
      saveTokens(tokens) {
        const dir = path2.dirname(this.tokenFile);
        if (!fs2.existsSync(dir)) {
          fs2.mkdirSync(dir, { recursive: true });
        }
        fs2.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2));
      }
      async makeAuthenticatedRequest(url, options = {}) {
        const token = await this.getValidToken();
        const headers = {
          ...options.headers,
          "Authorization": `Bearer ${token}`
        };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
          console.log("Got 401, refreshing token...");
          const storedTokens = this.loadStoredTokens();
          if (storedTokens?.refresh_token) {
            const newTokens = await this.refreshAccessToken(storedTokens.refresh_token);
            this.saveTokens(newTokens);
            headers["Authorization"] = `Bearer ${newTokens.access_token}`;
            return await fetch(url, { ...options, headers });
          }
          throw new Error("Refresh token not found. Run: npx onearm-figma oauth-setup");
        }
        return response;
      }
      getAuthorizationUrl(redirectUri = "http://localhost:3000/callback") {
        const params = new URLSearchParams({
          client_id: this.clientId,
          redirect_uri: redirectUri,
          scope: "file_read",
          response_type: "code",
          state: Math.random().toString(36).substring(7)
        });
        return `https://www.figma.com/oauth?${params.toString()}`;
      }
      async exchangeCodeForTokens(code, redirectUri) {
        const response = await fetch("https://api.figma.com/v1/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: redirectUri,
            code,
            grant_type: "authorization_code"
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Code exchange error: ${response.status} ${response.statusText}
${errorText}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(`OAuth error: ${data.error_description || data.error}`);
        }
        const expiresAt = Date.now() + data.expires_in * 1e3;
        const tokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          expires_at: expiresAt,
          token_type: data.token_type
        };
        this.saveTokens(tokens);
        return tokens;
      }
    };
  }
});

// tools/figma/src/api/FigmaClient.ts
var FigmaClient;
var init_FigmaClient = __esm({
  "tools/figma/src/api/FigmaClient.ts"() {
    "use strict";
    FigmaClient = class {
      auth;
      constructor(auth) {
        this.auth = auth;
      }
      async getFile(fileKey) {
        const url = `https://api.figma.com/v1/files/${fileKey}`;
        const response = await this.auth.makeAuthenticatedRequest(url);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get file: ${response.status} ${response.statusText}
${errorText}`);
        }
        return await response.json();
      }
      async getImages(fileKey, nodeIds, format = "png") {
        const ids = nodeIds.join(",");
        const url = `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=${format}`;
        const response = await this.auth.makeAuthenticatedRequest(url);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get images: ${response.status} ${response.statusText}
${errorText}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(`Figma API error: ${data.error}`);
        }
        return data.images;
      }
      async downloadImage(url, outputPath) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download image from ${url}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const { writeFile } = await import("fs/promises");
        await writeFile(outputPath, Buffer.from(arrayBuffer));
      }
    };
  }
});

// tools/figma/src/commands/export-images.ts
var export_images_exports = {};
__export(export_images_exports, {
  run: () => run
});
import fs3 from "fs";
import path3 from "path";
function collectFolderNode(node, currentExportPath = "") {
  let collected = [];
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.name.startsWith("path/")) {
        const newPath = child.name.substring("path/".length).trim();
        collected = collected.concat(collectFolderNode(child, path3.join(currentExportPath, newPath)));
      } else {
        collected = collected.concat(collectElementsNode(child, currentExportPath));
      }
    }
  }
  return collected;
}
function collectElementsNode(node, exportPath) {
  let collected = [];
  for (const config of EXPORTS_CONFIG) {
    if (node.name.endsWith(config.suffix)) {
      const name = node.name.replace(config.suffix, "");
      collected = collected.concat(collectAllSubNodes(node, config, name, path3.join(exportPath, name)));
      break;
    }
  }
  if (collected.length === 0) {
    if (node.type === "COMPONENT_SET") {
      collected = collected.concat(collectComponentVariants(node, node.name, path3.join(exportPath, node.name)));
    } else {
      collected.push({ node, exportPath, name: node.name, nodeName: node.name });
    }
  }
  return collected;
}
function collectAllSubNodes(node, config, parentName, currentExportPath = "") {
  const collected = [];
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const name = config.nameTemplate.replace("[parent]", parentName).replace("[node]", child.name);
      collected.push({ node: child, exportPath: currentExportPath, name, config, nodeName: child.name });
    }
  }
  return collected;
}
function collectComponentVariants(node, parentName, currentExportPath = "") {
  const collected = [];
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const nodeName = child.name.replace("type=", "");
      const name = `${parentName}_${nodeName}`;
      collected.push({ node: child, exportPath: currentExportPath, name, nodeName });
    }
  }
  return collected;
}
async function processNode(collected, client, fileKey, outputDir, exportFormats) {
  const { node, exportPath, name, nodeName } = collected;
  const output = path3.join(outputDir, exportPath);
  if (!fs3.existsSync(output) && exportPath !== "") {
    await fs3.promises.mkdir(output, { recursive: true });
  }
  const exportedFiles = [];
  for (const format of exportFormats) {
    const fileName = `${nodeName}.${format}`;
    const outputPath = path3.join(output, fileName);
    if (!fs3.existsSync(outputPath)) {
      console.log(`   Exporting ${format.toUpperCase()}: ${fileName}`);
      const imageUrls = await client.getImages(fileKey, [node.id], format);
      const imageUrl = imageUrls[node.id];
      if (imageUrl) {
        await client.downloadImage(imageUrl, outputPath);
        exportedFiles.push(format);
      } else {
        console.log(`   Warning: no URL for format ${format}`);
      }
    } else {
      console.log(`   ${fileName} already exists, skipping`);
      exportedFiles.push(format);
    }
  }
  let srcPath;
  const basePath = `${BASE_ASSET_URL}/${exportPath}/${nodeName}`.replace("//", "/");
  if (exportedFiles.length === 1) {
    srcPath = `${basePath}.${exportedFiles[0]}`;
  } else if (exportedFiles.length === 2 && exportedFiles.includes("png") && exportedFiles.includes("webp")) {
    srcPath = `${basePath}.{png,webp}`;
  } else {
    srcPath = `${basePath}.{${exportedFiles.join(",")}}`;
  }
  return { alias: name, src: srcPath };
}
async function run(args) {
  const formatArg = args.find((arg) => arg.startsWith("--formats="));
  const helpArg = args.includes("--help") || args.includes("-h");
  if (helpArg) {
    console.log("onearm-figma export-images\n");
    console.log("Usage:");
    console.log("  onearm-figma export-images                    # Export as PNG (default)");
    console.log("  onearm-figma export-images --formats=webp     # Export as WEBP");
    console.log("  onearm-figma export-images --formats=png      # Export as PNG");
    console.log("  onearm-figma export-images --formats=both     # Export as WEBP and PNG");
    return;
  }
  let exportFormats = ["png"];
  let exportMode = "png";
  if (formatArg) {
    const formatValue = formatArg.split("=")[1];
    switch (formatValue) {
      case "webp":
        exportFormats = ["webp"];
        exportMode = "webp";
        break;
      case "png":
        exportFormats = ["png"];
        exportMode = "png";
        break;
      case "both":
        exportFormats = ["webp", "png"];
        exportMode = "both";
        break;
      default:
        console.error("Invalid format. Use: webp, png, or both");
        process.exit(1);
    }
  }
  const gameRoot2 = findGameRoot();
  const fileKey = process.env.FILE_KEY;
  if (!fileKey) {
    console.error("FILE_KEY is not set in .env");
    process.exit(1);
  }
  const auth = new FigmaAuth();
  const client = new FigmaClient(auth);
  const outputDir = path3.join(gameRoot2, "assets/img");
  console.log("Checking OAuth authorization...");
  await auth.getValidToken();
  console.log("OAuth authorization OK\n");
  console.log("Fetching Figma file...");
  const figmaData = await client.getFile(fileKey);
  const document = figmaData.document;
  const imagesPage = document.children?.find((page) => page.name === "images");
  if (!imagesPage) {
    throw new Error('Page "images" not found in Figma file');
  }
  console.log(`Export mode: ${exportMode.toUpperCase()}`);
  console.log(`Formats: ${exportFormats.map((f) => f.toUpperCase()).join(", ")}
`);
  const collectedNodes = collectFolderNode(imagesPage, "");
  const metaEntries = [];
  for (let i = 0; i < collectedNodes.length; i++) {
    const progress = `[${i + 1}/${collectedNodes.length}]`;
    console.log(`${progress} Processing: ${collectedNodes[i].name}`);
    try {
      const meta = await processNode(collectedNodes[i], client, fileKey, outputDir, exportFormats);
      metaEntries.push(meta);
    } catch (error) {
      console.error(`Error processing ${collectedNodes[i].name}: ${error.message}`);
    }
  }
  const formattedJSON = JSON.stringify(metaEntries, null, 0).replace(/\},\{/g, "},\n    {").replace(/\[\{/g, "[\n    {").replace(/\}\]/g, "}\n]");
  const metaFilePath = path3.join(outputDir, "meta.json");
  await fs3.promises.writeFile(metaFilePath, formattedJSON);
  console.log(`
Meta file saved: ${metaFilePath}`);
  console.log(`Export complete! Processed: ${metaEntries.length} elements`);
}
var EXPORTS_CONFIG, BASE_ASSET_URL;
var init_export_images = __esm({
  "tools/figma/src/commands/export-images.ts"() {
    "use strict";
    init_FigmaAuth();
    init_FigmaClient();
    init_find_game_root();
    EXPORTS_CONFIG = [
      { name: "buttons", suffix: "_btn", nameTemplate: "[parent]_btn_[node]" },
      { name: "checkboxes", suffix: "_checkbox", nameTemplate: "[parent]_checkbox_[node]" },
      { name: "progress", suffix: "_progress", nameTemplate: "[parent]_progress_[node]" }
    ];
    BASE_ASSET_URL = "./assets/img";
  }
});

// tools/figma/src/commands/export-fonts.ts
var export_fonts_exports = {};
__export(export_fonts_exports, {
  run: () => run2
});
import fs4 from "fs";
import path4 from "path";
function collectTextNodes(node, acc = []) {
  if (node.type === "TEXT") acc.push(node);
  if (node.children) node.children.forEach((c) => collectTextNodes(c, acc));
  return acc;
}
function extractShadow(effects = []) {
  const drop = effects.find((e) => e.type === "DROP_SHADOW" && e.visible);
  if (!drop) return {};
  const { color, radius, offset } = drop;
  return {
    dropShadow: true,
    dropShadowColor: rgbHex(color),
    dropShadowBlur: radius,
    dropShadowAngle: Math.atan2(offset.y, offset.x),
    dropShadowDistance: Math.hypot(offset.x, offset.y)
  };
}
function paintToFillProps(paint) {
  if (!paint) return { fill: "#000000" };
  if (paint.type === "SOLID") {
    return { fill: rgbHex(paint.color) };
  }
  if (paint.type && paint.type.startsWith("GRADIENT")) {
    const colors = paint.gradientStops.map((s) => rgbHex(s.color));
    const stops = paint.gradientStops.map((s) => s.position);
    const type = paint.type === "GRADIENT_RADIAL" ? 1 : 0;
    return {
      fill: colors,
      fillGradientStops: stops,
      fillGradientType: type
    };
  }
  return { fill: "#000000" };
}
function textNode2Pixi(node) {
  const { name, style, fills, effects, absoluteBoundingBox } = node;
  const paint = fills?.[0];
  const fillProps = paintToFillProps(paint);
  const res = {
    fontFamily: style?.fontFamily,
    fontSize: style?.fontSize,
    align: ALIGN[style?.textAlignHorizontal] ?? "left",
    letterSpacing: style?.letterSpacing,
    lineHeight: style?.lineHeightPx,
    fontWeight: style?.fontWeight,
    ...fillProps,
    ...extractShadow(effects)
  };
  if (absoluteBoundingBox?.width) {
    res.wordWrap = true;
    res.wordWrapWidth = absoluteBoundingBox.width;
  }
  if (style?.paragraphSpacing) {
    res.paragraphSpacing = style.paragraphSpacing;
  }
  if (style?.paragraphIndent) {
    res.paragraphIndent = style.paragraphIndent;
  }
  Object.keys(res).forEach((k) => res[k] == null && delete res[k]);
  return [name || `Style_${node.id}`, res];
}
async function run2(_args) {
  const gameRoot2 = findGameRoot();
  const fileKey = process.env.FILE_KEY;
  if (!fileKey) {
    console.error("FILE_KEY is not set in .env");
    process.exit(1);
  }
  const auth = new FigmaAuth();
  const client = new FigmaClient(auth);
  const outputDir = path4.join(gameRoot2, "assets/font");
  fs4.mkdirSync(outputDir, { recursive: true });
  console.log("Checking OAuth authorization...");
  await auth.getValidToken();
  console.log("OAuth authorization OK\n");
  console.log("Fetching Figma file...");
  const figmaData = await client.getFile(fileKey);
  const document = figmaData.document;
  const fontsPage = document.children?.find((page) => page.name === "fonts");
  if (!fontsPage) {
    throw new Error('Page "fonts" not found in Figma file');
  }
  const textNodes = collectTextNodes(fontsPage);
  const entries = textNodes.map(textNode2Pixi);
  const stylesMap = Object.fromEntries(entries);
  const fontSet = new Set(entries.map(([, s]) => s.fontFamily).filter(Boolean));
  const fontMap = Object.fromEntries([...fontSet].map((f) => [f, f]));
  const fileContent = `// AUTO-GENERATED. Do NOT edit manually.
import * as PIXI from 'pixi.js';

/** Font families used across fonts page of Figma */
export const FontFamilies = ${JSON.stringify(fontMap, null, 2)};

/** PIXI.TextStyle map keyed by layer name */
export const FontsStyle = {
${Object.entries(stylesMap).map(([k, v]) => `  "${k}": new PIXI.TextStyle(${JSON.stringify(v, null, 2)})`).join(",\n")}
};
`;
  fs4.writeFileSync(path4.join(outputDir, "FontsStyle.js"), fileContent);
  console.log(`Extracted ${textNodes.length} styles (${fontSet.size} fonts) -> ${path4.relative(process.cwd(), outputDir)}/FontsStyle.js`);
}
var toHex, rgbHex, ALIGN;
var init_export_fonts = __esm({
  "tools/figma/src/commands/export-fonts.ts"() {
    "use strict";
    init_FigmaAuth();
    init_FigmaClient();
    init_find_game_root();
    toHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
    rgbHex = ({ r, g, b }) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    ALIGN = { LEFT: "left", RIGHT: "right", CENTER: "center", JUSTIFIED: "justify" };
  }
});

// tools/figma/src/commands/export-components.ts
var export_components_exports = {};
__export(export_components_exports, {
  run: () => run3
});
import fs5 from "fs";
import path5 from "path";
function extractAutoLayoutProps(node) {
  if (node.type !== "FRAME" || !node.layoutMode) return {};
  const props = {
    flow: node.layoutMode.toLowerCase()
  };
  if (node.itemSpacing !== void 0) {
    props.gap = node.itemSpacing;
  }
  props.contentAlign = { x: "left", y: "top" };
  if (node.primaryAxisAlignItems) {
    props.contentAlign.x = node.primaryAxisAlignItems.toLowerCase();
  }
  if (node.counterAxisAlignItems) {
    props.contentAlign.y = node.counterAxisAlignItems.toLowerCase();
  }
  return props;
}
function extractFillProps(node) {
  if (!node.fills || node.fills.length === 0) return {};
  const fills = node.fills.filter(({ visible }) => visible !== false);
  const fill = fills[fills.length - 1];
  if (!fill) return {};
  if (fill.type === "SOLID" && fill.color) {
    const colorProperty = node.type === "RECTANGLE" ? "color" : "fill";
    const props = { [colorProperty]: colorToHex(fill.color) };
    if (fill.opacity !== void 0 && fill.opacity !== 1) {
      props.alpha = fill.opacity;
    } else if (fill.color.a !== void 0 && fill.color.a !== 1) {
      props.alpha = fill.color.a;
    }
    return props;
  }
  if ((fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR") && fill.gradientStops && fill.gradientStops.length > 0) {
    if (node.type === "TEXT") {
      const colors = fill.gradientStops.map((stop) => colorToHex(stop.color));
      const stops = fill.gradientStops.map((stop) => stop.position);
      const props = { fill: colors, fillGradientStops: stops };
      if (fill.opacity !== void 0 && fill.opacity !== 1) {
        props.alpha = fill.opacity;
      }
      return props;
    } else {
      const firstStop = fill.gradientStops[0];
      if (firstStop.color) {
        const props = { color: colorToHex(firstStop.color) };
        if (fill.opacity !== void 0 && fill.opacity !== 1) {
          props.alpha = fill.opacity;
        } else if (firstStop.color.a !== void 0 && firstStop.color.a !== 1) {
          props.alpha = firstStop.color.a;
        }
        return props;
      }
    }
  }
  return {};
}
function extractStrokeProps(node) {
  const props = {};
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes.find((s) => s.visible !== false);
    if (stroke) {
      if (stroke.type === "SOLID" && stroke.color) {
        props.stroke = colorToHex(stroke.color);
      } else if (node.type === "TEXT" && (stroke.type === "GRADIENT_LINEAR" || stroke.type === "GRADIENT_RADIAL" || stroke.type === "GRADIENT_ANGULAR") && stroke.gradientStops && stroke.gradientStops.length > 0) {
        const colors = stroke.gradientStops.map((stop) => colorToHex(stop.color));
        props.stroke = colors;
        if (stroke.gradientStops.length > 1) {
          props.strokeGradientStops = stroke.gradientStops.map((stop) => stop.position);
        }
      }
    }
  }
  if (node.strokeWeight !== void 0) {
    props.strokeWidth = node.strokeWeight;
  }
  return props;
}
function extractCornerProps(node) {
  const props = {};
  if (node.cornerRadius !== void 0) {
    props.cornerRadius = node.cornerRadius;
  }
  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    props.cornerRadius = { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl };
  }
  return props;
}
function extractTextProps(node) {
  if (node.type !== "TEXT") return {};
  const props = {
    text: node.characters || ""
  };
  const style = {};
  if (node.style) {
    if (node.style.fontFamily) style.fontFamily = node.style.fontFamily;
    if (node.style.fontSize) style.fontSize = node.style.fontSize;
    if (node.style.fontWeight) style.fontWeight = node.style.fontWeight;
    if (node.style.letterSpacing) style.letterSpacing = node.style.letterSpacing;
    if (node.style.textAlignHorizontal) {
      const alignMap = {
        "LEFT": "left",
        "CENTER": "center",
        "RIGHT": "right",
        "JUSTIFIED": "justify"
      };
      style.align = alignMap[node.style.textAlignHorizontal] || "left";
    }
  }
  Object.assign(style, extractFillProps(node));
  Object.assign(style, extractStrokeProps(node));
  props.style = style;
  return props;
}
function calculateTextPositioning(node, parentBounds) {
  if (node.type !== "TEXT" || !node.constraints || !node.absoluteBoundingBox) return {};
  const result = {};
  const textBounds = node.absoluteBoundingBox;
  if (node.constraints.horizontal) {
    switch (node.constraints.horizontal) {
      case "LEFT":
        result.anchorX = 0;
        break;
      case "CENTER":
        result.anchorX = 0.5;
        break;
      case "RIGHT":
        result.anchorX = 1;
        break;
      case "LEFT_RIGHT":
        result.anchorX = 0;
        break;
      case "SCALE":
        result.anchorX = 0.5;
        break;
      default:
        result.anchorX = 0;
    }
  }
  if (node.constraints.vertical) {
    switch (node.constraints.vertical) {
      case "TOP":
        result.anchorY = 0;
        break;
      case "CENTER":
        result.anchorY = 0.5;
        break;
      case "BOTTOM":
        result.anchorY = 1;
        break;
      case "TOP_BOTTOM":
        result.anchorY = 0;
        break;
      case "SCALE":
        result.anchorY = 0.5;
        break;
      default:
        result.anchorY = 0;
    }
  }
  if (parentBounds && (result.anchorX !== void 0 || result.anchorY !== void 0)) {
    const relativeX = textBounds.x - parentBounds.x;
    const relativeY = textBounds.y - parentBounds.y;
    if (result.anchorX !== void 0) {
      if (result.anchorX === 0.5) {
        result.adjustedX = Math.round(relativeX + textBounds.width / 2);
      } else if (result.anchorX === 1) {
        result.adjustedX = Math.round(relativeX + textBounds.width);
      } else {
        result.adjustedX = Math.round(relativeX);
      }
    }
    if (result.anchorY !== void 0) {
      if (result.anchorY === 0.5) {
        result.adjustedY = Math.round(relativeY + textBounds.height / 2);
      } else if (result.anchorY === 1) {
        result.adjustedY = Math.round(relativeY + textBounds.height);
      } else {
        result.adjustedY = Math.round(relativeY);
      }
    }
  }
  return result;
}
function extractCommonProps(node, isRootLevel = false) {
  let componentType;
  if (node.name && node.name.endsWith("Button")) {
    componentType = "AnimationButton";
  } else if (isRootLevel) {
    componentType = "ComponentContainer";
  } else if (node.type === "COMPONENT" || node.type === "COMPONENT_SET" || node.type === "INSTANCE") {
    componentType = "Component";
  } else {
    componentType = NODE_TYPE_MAPPING[node.type] || node.type;
  }
  const props = {
    name: node.name,
    type: componentType
  };
  if (node.absoluteBoundingBox) {
    if (!isRootLevel) {
      props.x = Math.round(node.absoluteBoundingBox.x);
      props.y = Math.round(node.absoluteBoundingBox.y);
    }
    const shouldHaveSize = ["COMPONENT", "INSTANCE", "RECTANGLE", "ELLIPSE"].includes(node.type);
    const shouldSkipSize = isRootLevel || componentType === "SuperContainer" || componentType === "Text";
    if (node.type === "FRAME") {
      props.size = {};
      if (node.layoutSizingHorizontal !== "HUG") {
        props.size.width = Math.round(node.absoluteBoundingBox.width);
      }
      if (node.layoutSizingVertical !== "HUG") {
        props.size.height = Math.round(node.absoluteBoundingBox.height);
      }
    } else if (shouldHaveSize && !shouldSkipSize) {
      props.width = Math.round(node.absoluteBoundingBox.width);
      props.height = Math.round(node.absoluteBoundingBox.height);
    }
  }
  if (node.relativeTransform && !isRootLevel) {
    const transform = node.relativeTransform;
    if (transform.length >= 2) {
      props.localX = Math.round(transform[0][2]);
      props.localY = Math.round(transform[1][2]);
    }
  }
  if (node.visible !== void 0 && node.visible !== true) {
    props.visible = node.visible;
  }
  if (node.opacity !== void 0 && node.opacity !== 1) {
    props.alpha = node.opacity;
  }
  if (node.rotation !== void 0 && node.rotation !== 0) {
    props.rotation = node.rotation;
  }
  return props;
}
function extractVariantProps(node) {
  const variants = {};
  if (node.componentProperties) {
    Object.entries(node.componentProperties).forEach(([key, value]) => {
      variants[key] = value.value;
    });
  }
  return variants;
}
function determineViewportType(variantProps, componentName) {
  const supportedViewports = ["default", "portrait", "landscape"];
  for (const [key, value] of Object.entries(variantProps)) {
    const lowerKey = key.toLowerCase();
    const lowerValue = value.toLowerCase();
    if (lowerKey.includes("viewport") || lowerKey.includes("orientation") || lowerKey.includes("layout")) {
      if (supportedViewports.includes(lowerValue)) return lowerValue;
    }
    if (supportedViewports.includes(lowerValue)) return lowerValue;
  }
  const lowerName = componentName.toLowerCase();
  for (const viewport of supportedViewports) {
    if (lowerName.includes(viewport)) return viewport;
  }
  return "default";
}
function extractInstanceVariant(node) {
  if (node.type !== "INSTANCE") return {};
  const props = {};
  if (node.componentProperties) {
    const variantProps = extractVariantProps(node);
    const viewport = determineViewportType(variantProps, node.name);
    if (viewport !== "default") {
      props.variant = viewport;
    }
  }
  if (!props.variant) {
    const lowerName = node.name.toLowerCase();
    if (lowerName.includes("portrait")) {
      props.variant = "portrait";
    } else if (lowerName.includes("landscape")) {
      props.variant = "landscape";
    } else {
      props.variant = "default";
    }
  }
  return props;
}
function buildComponentMap(node, componentMap = /* @__PURE__ */ new Map(), parentIsComponentSet = false) {
  if ((node.type === "COMPONENT" || node.type === "COMPONENT_SET") && node.id && node.name && !parentIsComponentSet) {
    componentMap.set(node.id, {
      name: node.name,
      width: node.absoluteBoundingBox ? node.absoluteBoundingBox.width : 0,
      height: node.absoluteBoundingBox ? node.absoluteBoundingBox.height : 0
    });
  }
  if (node.type === "COMPONENT_SET" && node.children) {
    node.children.forEach((variant) => {
      if (variant.type === "COMPONENT" && variant.id) {
        componentMap.set(variant.id, {
          name: node.name,
          width: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.width : 0,
          height: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.height : 0
        });
      }
    });
  }
  if (node.children) {
    const isComponentSet = node.type === "COMPONENT_SET";
    node.children.forEach((child) => buildComponentMap(child, componentMap, isComponentSet));
  }
  return componentMap;
}
function processNode2(node, parentBounds = null, isRootLevel = false, componentMap = /* @__PURE__ */ new Map()) {
  if (node.type === "INSTANCE") {
    let parentComponentInfo = { name: "Component", width: 0, height: 0 };
    if (node.componentId && componentMap.has(node.componentId)) {
      parentComponentInfo = componentMap.get(node.componentId);
    }
    const props2 = {
      name: node.name,
      type: parentComponentInfo.name,
      isInstance: true
    };
    if (parentBounds && node.absoluteBoundingBox) {
      props2.x = Math.round(node.absoluteBoundingBox.x - parentBounds.x);
      props2.y = Math.round(node.absoluteBoundingBox.y - parentBounds.y);
    }
    if (node.absoluteBoundingBox && parentComponentInfo.width > 0 && parentComponentInfo.height > 0) {
      const scaleX = node.absoluteBoundingBox.width / parentComponentInfo.width;
      const scaleY = node.absoluteBoundingBox.height / parentComponentInfo.height;
      if (Math.abs(scaleX - 1) > 1e-3 || Math.abs(scaleY - 1) > 1e-3) {
        if (Math.abs(scaleX - scaleY) < 1e-3) {
          props2.scale = Math.round(scaleX * 1e3) / 1e3;
        } else {
          props2.scale = {
            x: Math.round(scaleX * 1e3) / 1e3,
            y: Math.round(scaleY * 1e3) / 1e3
          };
        }
      }
    }
    Object.assign(props2, extractInstanceVariant(node));
    return props2;
  }
  if (node.name && node.name.endsWith("_ph")) {
    const props2 = {
      name: node.name,
      type: "SuperContainer"
    };
    if (node.absoluteBoundingBox) {
      const centerX = node.absoluteBoundingBox.x + node.absoluteBoundingBox.width / 2;
      const centerY = node.absoluteBoundingBox.y + node.absoluteBoundingBox.height / 2;
      if (parentBounds) {
        props2.x = Math.round(centerX - parentBounds.x);
        props2.y = Math.round(centerY - parentBounds.y);
      } else {
        props2.x = Math.round(centerX);
        props2.y = Math.round(centerY);
      }
    }
    return props2;
  }
  const props = extractCommonProps(node, isRootLevel);
  if (parentBounds && node.absoluteBoundingBox) {
    props.x = Math.round(node.absoluteBoundingBox.x - parentBounds.x);
    props.y = Math.round(node.absoluteBoundingBox.y - parentBounds.y);
  }
  switch (node.type) {
    case "FRAME":
      Object.assign(props, extractAutoLayoutProps(node));
      break;
    case "TEXT": {
      Object.assign(props, extractTextProps(node));
      const textPositioning = calculateTextPositioning(node, parentBounds);
      if (textPositioning.anchorX !== void 0) props.anchorX = textPositioning.anchorX;
      if (textPositioning.anchorY !== void 0) props.anchorY = textPositioning.anchorY;
      if (textPositioning.adjustedX !== void 0) props.x = textPositioning.adjustedX;
      if (textPositioning.adjustedY !== void 0) props.y = textPositioning.adjustedY;
      break;
    }
    case "RECTANGLE":
      Object.assign(props, extractFillProps(node));
      Object.assign(props, extractStrokeProps(node));
      Object.assign(props, extractCornerProps(node));
      break;
    case "ELLIPSE":
    case "VECTOR":
      Object.assign(props, extractFillProps(node));
      Object.assign(props, extractStrokeProps(node));
      break;
    case "INSTANCE":
      Object.assign(props, extractInstanceVariant(node));
      break;
  }
  let shouldExportChildren;
  if (isRootLevel) {
    shouldExportChildren = true;
  } else {
    shouldExportChildren = node.type === "GROUP" || node.type === "FRAME" || node.type !== "COMPONENT" && node.type !== "COMPONENT_SET" && node.type !== "INSTANCE";
  }
  if (node.children && node.children.length > 0 && shouldExportChildren) {
    props.children = node.children.filter((child) => child.name !== "screen").map((child) => processNode2(child, node.absoluteBoundingBox, false, componentMap));
  }
  return props;
}
function processComponentVariants(componentSet, componentMap) {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const viewportGroups = {
    default: [],
    portrait: [],
    landscape: []
  };
  componentSet.children.forEach((variant) => {
    if (variant.type !== "COMPONENT") return;
    const variantProps = extractVariantProps(variant);
    const config = processNode2(variant, null, true, componentMap);
    const viewport = determineViewportType(variantProps, variant.name);
    viewportGroups[viewport].push({
      ...config,
      variantProps: Object.keys(variantProps).length > 0 ? variantProps : void 0
    });
  });
  const componentType = componentName.endsWith("Button") ? "AnimationButton" : "ComponentContainer";
  const result = {
    name: componentName,
    type: componentType,
    variants: {}
  };
  Object.entries(viewportGroups).forEach(([viewport, configs]) => {
    if (configs.length > 0) {
      if (configs.length === 1) {
        const { name, type, ...variantConfig } = configs[0];
        result.variants[viewport] = variantConfig;
        if (!result.variants[viewport].variantProps) {
          delete result.variants[viewport].variantProps;
        }
      } else {
        result.variants[viewport] = configs.map((config) => {
          const { name, type, ...variantConfig } = config;
          return variantConfig;
        });
      }
    }
  });
  const hasSpecificViewports = Object.keys(result.variants).length > 0;
  if (!hasSpecificViewports && componentSet.children.length > 0) {
    const firstVariant = componentSet.children.find((child) => child.type === "COMPONENT");
    if (firstVariant) {
      const config = processNode2(firstVariant, null, true, componentMap);
      const { name, type, ...variantConfig } = config;
      result.variants.default = variantConfig;
    }
  }
  return result;
}
async function run3(_args) {
  const gameRoot2 = findGameRoot();
  const fileKey = process.env.FILE_KEY;
  if (!fileKey) {
    console.error("FILE_KEY is not set in .env");
    process.exit(1);
  }
  const auth = new FigmaAuth();
  const client = new FigmaClient(auth);
  const outputDir = path5.join(gameRoot2, "assets");
  console.log("Checking OAuth authorization...");
  await auth.getValidToken();
  console.log("OAuth authorization OK\n");
  console.log("Fetching Figma file...");
  const figmaData = await client.getFile(fileKey);
  const document = figmaData.document;
  const componentsPage = document.children?.find((child) => child.name === "layouts");
  if (!componentsPage) {
    throw new Error('Page "layouts" not found in Figma file');
  }
  console.log("Building component map...");
  const componentMap = buildComponentMap(document);
  console.log(`Found ${componentMap.size} components`);
  const components = [];
  for (const child of componentsPage.children || []) {
    if (child.name === "screen") {
      console.log(`Skipping: ${child.name}`);
      continue;
    }
    console.log(`Processing: ${child.name}`);
    let componentConfig;
    if (child.type === "COMPONENT_SET") {
      componentConfig = processComponentVariants(child, componentMap);
    } else {
      const nodeConfig = processNode2(child, null, true, componentMap);
      const { name, type, ...variantConfig } = nodeConfig;
      const componentType = child.name.endsWith("Button") ? "AnimationButton" : "ComponentContainer";
      componentConfig = {
        name: nodeConfig.name,
        type: componentType,
        variants: { default: variantConfig }
      };
    }
    if (componentConfig) {
      components.push(componentConfig);
    }
  }
  const componentsWithMultipleVariants = components.filter((c) => {
    if (!c.variants) return false;
    return Object.keys(c.variants).length > 1;
  });
  const stats = {
    totalComponents: components.length,
    componentsWithVariants: componentsWithMultipleVariants.length,
    componentsWithoutVariants: components.length - componentsWithMultipleVariants.length
  };
  const variantStats = { default: 0, portrait: 0, landscape: 0 };
  components.forEach((component) => {
    if (component.variants) {
      Object.keys(component.variants).forEach((key) => {
        if (key in variantStats) variantStats[key]++;
      });
    }
  });
  const config = {
    components,
    metadata: {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      figmaFileKey: fileKey,
      statistics: { ...stats, variantsByViewport: variantStats }
    }
  };
  if (!fs5.existsSync(outputDir)) {
    fs5.mkdirSync(outputDir, { recursive: true });
  }
  const jsonPath = path5.join(outputDir, "components.config.json");
  await fs5.promises.writeFile(jsonPath, JSON.stringify(config, null, 2));
  console.log(`
Components config saved: ${jsonPath}`);
  console.log(`
Export statistics:`);
  console.log(`  Total components: ${stats.totalComponents}`);
  console.log(`  With variants: ${stats.componentsWithVariants}`);
  console.log(`  Without variants: ${stats.componentsWithoutVariants}`);
  if (stats.componentsWithVariants > 0) {
    console.log(`
Variants by viewport:`);
    Object.entries(variantStats).forEach(([viewport, count]) => {
      if (count > 0) console.log(`  ${viewport}: ${count}`);
    });
  }
  console.log("\nExport complete!");
}
var NODE_TYPE_MAPPING, toHex2, colorToHex;
var init_export_components = __esm({
  "tools/figma/src/commands/export-components.ts"() {
    "use strict";
    init_FigmaAuth();
    init_FigmaClient();
    init_find_game_root();
    NODE_TYPE_MAPPING = {
      "GROUP": "SuperContainer",
      "FRAME": "AutoLayout",
      "COMPONENT": "Component",
      "COMPONENT_SET": "Component",
      "INSTANCE": "Component",
      "TEXT": "Text",
      "RECTANGLE": "Rectangle",
      "ELLIPSE": "Ellipse",
      "VECTOR": "Graphics"
    };
    toHex2 = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
    colorToHex = (color) => `#${toHex2(color.r)}${toHex2(color.g)}${toHex2(color.b)}`;
  }
});

// tools/figma/src/commands/oauth-setup.ts
var oauth_setup_exports = {};
__export(oauth_setup_exports, {
  run: () => run4
});
import http from "http";
import net from "net";
import { parse } from "url";
async function findAvailablePort(startPort = 3e3) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : startPort;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      findAvailablePort(startPort + 1).then(resolve).catch(reject);
    });
  });
}
async function run4(_args) {
  console.log("OAuth authorization setup for Figma API\n");
  let auth;
  try {
    auth = new FigmaAuth();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    showSetupInstructions();
    process.exit(1);
  }
  try {
    await auth.getOAuthToken();
    console.log("OAuth tokens are already configured and valid!");
    return;
  } catch {
    console.log("OAuth tokens not found or expired, starting authorization...\n");
  }
  const port = await findAvailablePort(3e3);
  const redirectUri = `http://localhost:${port}/callback`;
  if (port !== 3e3) {
    console.log(`Port 3000 is busy, using port ${port}`);
    console.log(`Make sure this redirect URI is configured in Figma app: ${redirectUri}
`);
  }
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = parse(req.url || "", true);
      if (parsedUrl.pathname === "/callback") {
        try {
          const query = parsedUrl.query;
          if (query.error) {
            throw new Error(`Authorization error: ${query.error_description || query.error}`);
          }
          if (!query.code || typeof query.code !== "string") {
            throw new Error("Authorization code not received");
          }
          console.log("Authorization code received, exchanging for tokens...");
          const tokens = await auth.exchangeCodeForTokens(query.code, redirectUri);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
                        <html>
                            <head><title>Authorization successful</title>
                            <style>
                                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                                .success { color: #22c55e; font-size: 48px; }
                            </style></head>
                            <body>
                                <div class="success">OK</div>
                                <h1>Authorization successful!</h1>
                                <p>OAuth tokens saved. You can close this window.</p>
                                <p>Token expires in: ${Math.round(tokens.expires_in / 3600)} hours</p>
                            </body>
                        </html>
                    `);
          console.log("OAuth authorization complete!");
          console.log(`Tokens saved to: ${auth.tokenFile}`);
          console.log(`Access token expires in: ${Math.round(tokens.expires_in / 3600)} hours`);
          setTimeout(() => {
            server.close();
            resolve();
          }, 1e3);
        } catch (error) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
                        <html><body style="font-family: Arial, sans-serif; padding: 40px;">
                            <h1>Authorization error</h1>
                            <p>${error.message}</p>
                        </body></html>
                    `);
          reject(error);
        }
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });
    server.listen(port, () => {
      const authUrl = auth.getAuthorizationUrl(redirectUri);
      console.log(`Temporary server running on http://localhost:${port}`);
      console.log(`
Open the following link in your browser:
`);
      console.log(authUrl);
      console.log(`
Waiting for authorization...`);
    });
    setTimeout(() => {
      server.close();
      reject(new Error("Authorization timeout (10 minutes)"));
    }, 10 * 60 * 1e3);
  });
}
function showSetupInstructions() {
  console.log("\nOAuth setup instructions:\n");
  console.log("1. Create a Figma app:");
  console.log("   https://www.figma.com/developers/apps\n");
  console.log("2. Configure redirect URI:");
  console.log("   http://localhost:3000/callback\n");
  console.log("3. Add credentials to .env:");
  console.log("   FIGMA_CLIENT_ID=your_client_id");
  console.log("   FIGMA_CLIENT_SECRET=your_client_secret\n");
  console.log("4. Run this command again\n");
}
var init_oauth_setup = __esm({
  "tools/figma/src/commands/oauth-setup.ts"() {
    "use strict";
    init_FigmaAuth();
  }
});

// tools/figma/src/commands/oauth-check.ts
var oauth_check_exports = {};
__export(oauth_check_exports, {
  run: () => run5
});
import net2 from "net";
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net2.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function run5(_args) {
  console.log("Checking Figma OAuth configuration\n");
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  const fileKey = process.env.FILE_KEY;
  console.log("OAuth Credentials:");
  console.log(`  FIGMA_CLIENT_ID: ${clientId ? "OK" : "NOT FOUND"}`);
  console.log(`  FIGMA_CLIENT_SECRET: ${clientSecret ? "OK" : "NOT FOUND"}`);
  console.log(`  FILE_KEY: ${fileKey ? "OK" : "NOT FOUND"}
`);
  if (!clientId || !clientSecret) {
    console.log("Error: OAuth credentials not configured");
    process.exit(1);
  }
  console.log("Checking ports:");
  const port3000Available = await checkPort(3e3);
  const port3001Available = await checkPort(3001);
  console.log(`  Port 3000: ${port3000Available ? "available" : "busy"}`);
  console.log(`  Port 3001: ${port3001Available ? "available" : "busy"}
`);
  console.log("Recommended redirect URIs for Figma app:");
  console.log(`  https://www.figma.com/developers/apps`);
  console.log(`  Client ID: ${clientId}
`);
  if (port3000Available) {
    console.log("  http://localhost:3000/callback (primary)");
    if (port3001Available) {
      console.log("  http://localhost:3001/callback (fallback)");
    }
  } else if (port3001Available) {
    console.log("  http://localhost:3000/callback (port busy)");
    console.log("  http://localhost:3001/callback (will be used)");
  } else {
    console.log("  Both ports (3000, 3001) are busy!");
  }
  console.log("\nAfter configuring redirect URIs, run:");
  console.log("  npx onearm-figma oauth-setup");
}
var init_oauth_check = __esm({
  "tools/figma/src/commands/oauth-check.ts"() {
    "use strict";
  }
});

// tools/figma/src/cli.ts
init_find_game_root();
import dotenv from "dotenv";
import path6 from "path";
var gameRoot = findGameRoot();
dotenv.config({ path: path6.join(gameRoot, ".env") });
var COMMANDS = {
  "export-images": () => Promise.resolve().then(() => (init_export_images(), export_images_exports)),
  "export-fonts": () => Promise.resolve().then(() => (init_export_fonts(), export_fonts_exports)),
  "export-components": () => Promise.resolve().then(() => (init_export_components(), export_components_exports)),
  "oauth-setup": () => Promise.resolve().then(() => (init_oauth_setup(), oauth_setup_exports)),
  "oauth-check": () => Promise.resolve().then(() => (init_oauth_check(), oauth_check_exports))
};
function showHelp() {
  console.log("onearm-figma - Figma tools for onearm engine\n");
  console.log("Usage: onearm-figma <command> [options]\n");
  console.log("Commands:");
  console.log("  export-images      Export images from Figma");
  console.log("  export-fonts       Export font styles from Figma");
  console.log("  export-components  Export component layouts from Figma");
  console.log("  oauth-setup        Setup OAuth authorization");
  console.log("  oauth-check        Check OAuth configuration");
  console.log("\nOptions:");
  console.log("  --help, -h         Show help");
}
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    showHelp();
    return;
  }
  const loader = COMMANDS[command];
  if (!loader) {
    console.error(`Unknown command: ${command}`);
    console.log('Run "onearm-figma --help" for available commands');
    process.exit(1);
  }
  const commandArgs = args.slice(1);
  try {
    const mod = await loader();
    await mod.run(commandArgs);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
main();
