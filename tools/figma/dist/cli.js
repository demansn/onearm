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
          scope: "file_content:read",
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
var FIGMA_API_BASE, FigmaClient;
var init_FigmaClient = __esm({
  "tools/figma/src/api/FigmaClient.ts"() {
    "use strict";
    FIGMA_API_BASE = "https://api.figma.com/v1";
    FigmaClient = class {
      auth;
      constructor(auth) {
        this.auth = auth;
      }
      async getFile(fileKey) {
        const response = await this.auth.makeAuthenticatedRequest(
          `${FIGMA_API_BASE}/files/${fileKey}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get file: ${response.status} ${response.statusText}
${errorText}`);
        }
        return await response.json();
      }
      async fetchFile(fileKey, depth) {
        let url = `${FIGMA_API_BASE}/files/${fileKey}`;
        if (depth !== void 0) {
          url += `?depth=${depth}`;
        }
        const response = await this.auth.makeAuthenticatedRequest(url);
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Figma API error ${response.status}: ${body}`);
        }
        return response.json();
      }
      async fetchNodes(fileKey, nodeIds) {
        const ids = nodeIds.join(",");
        const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`;
        const response = await this.auth.makeAuthenticatedRequest(url);
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Figma API error ${response.status}: ${body}`);
        }
        return response.json();
      }
      async getImages(fileKey, nodeIds, format = "png", scale = 1) {
        const ids = nodeIds.join(",");
        const url = `${FIGMA_API_BASE}/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`;
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

// tools/figma/src/adapters/rest/RestNodeAdapter.ts
var RestNodeAdapter;
var init_RestNodeAdapter = __esm({
  "tools/figma/src/adapters/rest/RestNodeAdapter.ts"() {
    "use strict";
    RestNodeAdapter = class _RestNodeAdapter {
      data;
      parentAbsX;
      parentAbsY;
      _children;
      constructor(data, parentAbsX = 0, parentAbsY = 0) {
        this.data = data;
        this.parentAbsX = parentAbsX;
        this.parentAbsY = parentAbsY;
      }
      get id() {
        return this.data.id || "";
      }
      get type() {
        return this.data.type || "";
      }
      get name() {
        return this.data.name || "";
      }
      // Convert absolute to relative coordinates
      get x() {
        const bbox = this.data.absoluteBoundingBox;
        return bbox ? Math.round(bbox.x - this.parentAbsX) : 0;
      }
      get y() {
        const bbox = this.data.absoluteBoundingBox;
        return bbox ? Math.round(bbox.y - this.parentAbsY) : 0;
      }
      get width() {
        return this.data.absoluteBoundingBox ? this.data.absoluteBoundingBox.width : 0;
      }
      get height() {
        return this.data.absoluteBoundingBox ? this.data.absoluteBoundingBox.height : 0;
      }
      get visible() {
        return this.data.visible !== false;
      }
      get opacity() {
        return this.data.opacity !== void 0 ? this.data.opacity : 1;
      }
      get rotation() {
        return this.data.rotation || 0;
      }
      // Layout properties
      get layoutMode() {
        return this.data.layoutMode;
      }
      get itemSpacing() {
        return this.data.itemSpacing;
      }
      get counterAxisSpacing() {
        return this.data.counterAxisSpacing;
      }
      get layoutSizingHorizontal() {
        return this.data.primaryAxisSizingMode === "AUTO" ? "HUG" : this.data.primaryAxisSizingMode === "FIXED" ? "FIXED" : this.data.layoutSizingHorizontal;
      }
      get layoutSizingVertical() {
        return this.data.counterAxisSizingMode === "AUTO" ? "HUG" : this.data.counterAxisSizingMode === "FIXED" ? "FIXED" : this.data.layoutSizingVertical;
      }
      get primaryAxisAlignItems() {
        return this.data.primaryAxisAlignItems;
      }
      get counterAxisAlignItems() {
        return this.data.counterAxisAlignItems;
      }
      get layoutGrids() {
        return this.data.layoutGrids;
      }
      // Constraints
      get constraints() {
        if (!this.data.constraints) return void 0;
        const h = this.data.constraints.horizontal;
        const v = this.data.constraints.vertical;
        const hMap = {
          "LEFT": "MIN",
          "RIGHT": "MAX",
          "CENTER": "CENTER",
          "LEFT_RIGHT": "STRETCH",
          "SCALE": "SCALE",
          // Plugin API values pass through
          "MIN": "MIN",
          "MAX": "MAX",
          "STRETCH": "STRETCH"
        };
        const vMap = {
          "TOP": "MIN",
          "BOTTOM": "MAX",
          "CENTER": "CENTER",
          "TOP_BOTTOM": "STRETCH",
          "SCALE": "SCALE",
          "MIN": "MIN",
          "MAX": "MAX",
          "STRETCH": "STRETCH"
        };
        return {
          horizontal: hMap[h] || "MIN",
          vertical: vMap[v] || "MIN"
        };
      }
      // Visual properties (REST API returns arrays, never mixed)
      get fills() {
        return this.data.fills || [];
      }
      get strokes() {
        return this.data.strokes || [];
      }
      get strokeWeight() {
        return this.data.strokeWeight || 0;
      }
      get cornerRadius() {
        return this.data.cornerRadius || 0;
      }
      get topLeftRadius() {
        return this.data.rectangleCornerRadii ? this.data.rectangleCornerRadii[0] : void 0;
      }
      get topRightRadius() {
        return this.data.rectangleCornerRadii ? this.data.rectangleCornerRadii[1] : void 0;
      }
      get bottomRightRadius() {
        return this.data.rectangleCornerRadii ? this.data.rectangleCornerRadii[2] : void 0;
      }
      get bottomLeftRadius() {
        return this.data.rectangleCornerRadii ? this.data.rectangleCornerRadii[3] : void 0;
      }
      // Text properties (from style object in REST API)
      get characters() {
        return this.data.characters;
      }
      get fontName() {
        if (this.data.type !== "TEXT") return void 0;
        const style = this.data.style;
        if (!style) return void 0;
        return {
          family: style.fontFamily || "",
          style: style.fontPostScriptName || style.fontStyle || ""
        };
      }
      get fontSize() {
        if (this.data.type !== "TEXT") return void 0;
        return this.data.style ? this.data.style.fontSize : void 0;
      }
      get fontWeight() {
        if (this.data.type !== "TEXT") return void 0;
        return this.data.style ? this.data.style.fontWeight : void 0;
      }
      get lineHeight() {
        if (this.data.type !== "TEXT" || !this.data.style) return void 0;
        const style = this.data.style;
        if (style.lineHeightPx !== void 0 && style.lineHeightPercentFontSize !== void 0) {
          return { unit: "PIXELS", value: style.lineHeightPx };
        }
        if (style.lineHeightUnit === "FONT_SIZE_%") {
          return { unit: "PERCENT", value: style.lineHeightPercentFontSize || 100 };
        }
        if (style.lineHeightUnit === "INTRINSIC_%") {
          return { unit: "AUTO", value: 0 };
        }
        return void 0;
      }
      get textAlignHorizontal() {
        if (this.data.type !== "TEXT" || !this.data.style) return void 0;
        return this.data.style.textAlignHorizontal;
      }
      get textAutoResize() {
        if (this.data.type !== "TEXT") return void 0;
        return this.data.style ? this.data.style.textAutoResize : void 0;
      }
      // Component properties
      get mainComponentId() {
        return this.data.componentId;
      }
      get componentProperties() {
        return this.data.componentProperties;
      }
      get variantProperties() {
        if (this.data.type === "COMPONENT" && this.data.name && this.data.name.includes("=")) {
          const result = {};
          const pairs = this.data.name.split(",").map((s) => s.trim());
          pairs.forEach((pair) => {
            const [key, value] = pair.split("=").map((s) => s.trim());
            if (key && value) {
              result[key] = value;
            }
          });
          return Object.keys(result).length > 0 ? result : null;
        }
        return null;
      }
      get componentPropertyDefinitions() {
        return this.data.componentPropertyDefinitions;
      }
      get parentType() {
        return void 0;
      }
      // Tree
      get children() {
        if (this._children === void 0) {
          const myAbsX = this.data.absoluteBoundingBox ? this.data.absoluteBoundingBox.x : 0;
          const myAbsY = this.data.absoluteBoundingBox ? this.data.absoluteBoundingBox.y : 0;
          this._children = (this.data.children || []).map(
            (c) => new _RestNodeAdapter(c, myAbsX, myAbsY)
          );
        }
        return this._children ?? [];
      }
    };
  }
});

// tools/figma/src/adapters/rest/RestDocumentProvider.ts
var RestDocumentProvider;
var init_RestDocumentProvider = __esm({
  "tools/figma/src/adapters/rest/RestDocumentProvider.ts"() {
    "use strict";
    init_RestNodeAdapter();
    RestDocumentProvider = class {
      fileData;
      /**
       * @param fileData Parsed response from GET /v1/files/:key
       */
      constructor(fileData) {
        this.fileData = fileData;
      }
      getPages() {
        if (!this.fileData.document || !this.fileData.document.children) return [];
        return this.fileData.document.children.map(
          (page) => new RestNodeAdapter(page)
        );
      }
      findPageByName(name) {
        if (!this.fileData.document || !this.fileData.document.children) return void 0;
        const page = this.fileData.document.children.find((p) => p.name === name);
        return page ? new RestNodeAdapter(page) : void 0;
      }
      buildComponentMap() {
        const map = /* @__PURE__ */ new Map();
        const components = this.fileData.components || {};
        Object.entries(components).forEach(([id, meta]) => {
          map.set(id, {
            name: meta.name,
            width: 0,
            height: 0
          });
        });
        if (this.fileData.document) {
          this.traverseForComponents(this.fileData.document, map, 0, 0);
        }
        return map;
      }
      traverseForComponents(nodeData, map, parentAbsX, parentAbsY, parentIsComponentSet = false) {
        const absX = nodeData.absoluteBoundingBox ? nodeData.absoluteBoundingBox.x : 0;
        const absY = nodeData.absoluteBoundingBox ? nodeData.absoluteBoundingBox.y : 0;
        if ((nodeData.type === "COMPONENT" || nodeData.type === "COMPONENT_SET") && nodeData.id && nodeData.name && !parentIsComponentSet) {
          const node = new RestNodeAdapter(nodeData, parentAbsX, parentAbsY);
          map.set(nodeData.id, {
            name: nodeData.name,
            width: nodeData.absoluteBoundingBox ? nodeData.absoluteBoundingBox.width : 0,
            height: nodeData.absoluteBoundingBox ? nodeData.absoluteBoundingBox.height : 0,
            node
          });
        }
        if (nodeData.type === "COMPONENT_SET" && nodeData.children) {
          nodeData.children.forEach((variant) => {
            if (variant.type === "COMPONENT" && variant.id) {
              const variantNode = new RestNodeAdapter(variant, absX, absY);
              map.set(variant.id, {
                name: nodeData.name,
                width: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.width : 0,
                height: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.height : 0,
                node: variantNode
              });
            }
          });
        }
        if (nodeData.children) {
          const isComponentSet = nodeData.type === "COMPONENT_SET";
          nodeData.children.forEach((child) => {
            this.traverseForComponents(child, map, absX, absY, isComponentSet);
          });
        }
      }
    };
  }
});

// tools/figma/src/extractors/colorUtils.ts
function colorToHex(color, alpha) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = alpha !== void 0 ? alpha : "a" in color ? color.a : 1;
  return `rgba(${r},${g},${b},${a})`;
}
var init_colorUtils = __esm({
  "tools/figma/src/extractors/colorUtils.ts"() {
    "use strict";
  }
});

// tools/figma/src/extractors/nodeUtils.ts
function shouldExportInstanceSize(name) {
  if (!name) return false;
  return name.endsWith("*") || name.includes("[scaled]") || name.includes("@size");
}
function cleanNameFromSizeMarker(name) {
  if (!name) return name;
  let cleanName = name.replace(/\*$/, "");
  cleanName = cleanName.replace(/\s*\[scaled\]\s*/g, "");
  cleanName = cleanName.replace(/\s*@size\s*/g, "");
  return cleanName.trim();
}
var NODE_TYPE_MAPPING;
var init_nodeUtils = __esm({
  "tools/figma/src/extractors/nodeUtils.ts"() {
    "use strict";
    NODE_TYPE_MAPPING = {
      "GROUP": "SuperContainer",
      "FRAME": "SuperContainer",
      // Default for Frame, will be overridden if AutoLayout
      "COMPONENT": "Component",
      "COMPONENT_SET": "Component",
      "INSTANCE": "Component",
      "TEXT": "Text",
      "RECTANGLE": "Rectangle",
      "ELLIPSE": "Ellipse",
      "VECTOR": "Graphics"
    };
  }
});

// tools/figma/src/extractors/autoLayoutExtractor.ts
function extractAutoLayoutProps(node) {
  if (node.type !== "FRAME" || !node.layoutMode) {
    return {};
  }
  const props = {
    flow: node.layoutMode.toLowerCase()
    // VERTICAL, HORIZONTAL
  };
  if (node.itemSpacing !== void 0) {
    props.gap = node.itemSpacing;
  }
  if (node.primaryAxisAlignItems === "SPACE_BETWEEN") {
    props.spaceBetween = true;
  }
  const alignmentMap = {
    "MIN": "left",
    "CENTER": "center",
    "MAX": "right",
    "SPACE_BETWEEN": "space-between",
    "SPACE_AROUND": "space-around",
    "SPACE_EVENLY": "space-evenly"
  };
  const verticalAlignmentMap = {
    "MIN": "top",
    "CENTER": "center",
    "MAX": "bottom",
    "SPACE_BETWEEN": "space-between",
    "SPACE_AROUND": "space-around",
    "SPACE_EVENLY": "space-evenly"
  };
  props.contentAlign = {
    x: "left",
    y: "top"
  };
  if (node.primaryAxisAlignItems) {
    if (node.layoutMode === "HORIZONTAL") {
      props.contentAlign.x = alignmentMap[node.primaryAxisAlignItems] || "left";
    } else {
      props.contentAlign.y = verticalAlignmentMap[node.primaryAxisAlignItems] || "top";
    }
  }
  if (node.counterAxisAlignItems) {
    if (node.layoutMode === "HORIZONTAL") {
      props.contentAlign.y = verticalAlignmentMap[node.counterAxisAlignItems] || "top";
    } else {
      props.contentAlign.x = alignmentMap[node.counterAxisAlignItems] || "left";
    }
  }
  return props;
}
var init_autoLayoutExtractor = __esm({
  "tools/figma/src/extractors/autoLayoutExtractor.ts"() {
    "use strict";
  }
});

// tools/figma/src/adapters/mixed.ts
function isMixed(value) {
  return value === MIXED_VALUE;
}
var MIXED_VALUE;
var init_mixed = __esm({
  "tools/figma/src/adapters/mixed.ts"() {
    "use strict";
    MIXED_VALUE = Symbol("MIXED_VALUE");
  }
});

// tools/figma/src/extractors/fillExtractor.ts
function extractFillProps(node) {
  if (!("fills" in node) || !node.fills) {
    return {};
  }
  if (isMixed(node.fills)) {
    return {};
  }
  const allFills = node.fills;
  if (allFills.length === 0) {
    return {};
  }
  const fills = allFills.filter((fill2) => fill2.visible !== false);
  const fill = fills[fills.length - 1];
  if (!fill) {
    return {};
  }
  if (fill.type === "SOLID") {
    const props = { fill: colorToHex(fill.color) };
    if (fill.opacity !== void 0 && fill.opacity !== 1) {
      props.alpha = fill.opacity;
    }
    return props;
  }
  if ((fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR") && fill.gradientStops && fill.gradientStops.length > 0) {
    if (node.type === "TEXT") {
      const colors = fill.gradientStops.map((stop) => {
        const alpha = stop.color.a !== void 0 ? stop.color.a : 1;
        return colorToHex(stop.color, alpha);
      });
      const stops = fill.gradientStops.map((stop) => stop.position);
      const props = {
        fill: colors,
        fillGradientStops: stops
      };
      if (fill.opacity !== void 0 && fill.opacity !== 1) {
        props.alpha = fill.opacity;
      }
      return props;
    } else {
      const colors = fill.gradientStops.map((stop) => {
        const alpha = stop.color.a !== void 0 ? stop.color.a : 1;
        return colorToHex(stop.color, alpha);
      });
      const stops = fill.gradientStops.map((stop) => stop.position);
      const props = {
        fill: colors,
        colorStops: stops
      };
      if (fill.type === "GRADIENT_LINEAR") {
        props.gradientType = "linear";
        if (fill.gradientTransform && fill.gradientTransform.length >= 2) {
          const transform = fill.gradientTransform;
          const dx = transform[0][0];
          const dy = transform[0][1];
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          props.gradientAngle = Math.round(angle);
        } else {
          props.gradientAngle = 0;
        }
      } else if (fill.type === "GRADIENT_RADIAL") {
        props.gradientType = "radial";
        if (fill.gradientTransform && fill.gradientTransform.length >= 2) {
          const transform = fill.gradientTransform;
          const centerX = transform[0][2] || 0.5;
          const centerY = transform[1][2] || 0.5;
          props.gradientCenter = {
            x: Math.round(centerX * 100) / 100,
            y: Math.round(centerY * 100) / 100
          };
          const scaleX = Math.sqrt(transform[0][0] * transform[0][0] + transform[0][1] * transform[0][1]);
          const scaleY = Math.sqrt(transform[1][0] * transform[1][0] + transform[1][1] * transform[1][1]);
          const radius = Math.max(scaleX, scaleY);
          props.gradientRadius = Math.round(radius * 100) / 100;
        } else {
          props.gradientCenter = { x: 0.5, y: 0.5 };
          props.gradientRadius = 1;
        }
      } else if (fill.type === "GRADIENT_ANGULAR") {
        props.gradientType = "angular";
        if (fill.gradientTransform && fill.gradientTransform.length >= 2) {
          const transform = fill.gradientTransform;
          const centerX = transform[0][2] || 0.5;
          const centerY = transform[1][2] || 0.5;
          props.gradientCenter = {
            x: Math.round(centerX * 100) / 100,
            y: Math.round(centerY * 100) / 100
          };
        } else {
          props.gradientCenter = { x: 0.5, y: 0.5 };
        }
      }
      if (fill.opacity !== void 0 && fill.opacity !== 1) {
        props.alpha = fill.opacity;
      }
      return props;
    }
  }
  return {};
}
var init_fillExtractor = __esm({
  "tools/figma/src/extractors/fillExtractor.ts"() {
    "use strict";
    init_mixed();
    init_colorUtils();
  }
});

// tools/figma/src/extractors/strokeExtractor.ts
function extractStrokeProps(node) {
  const props = {};
  if ("strokes" in node && node.strokes && !isMixed(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes.find((s) => s.visible !== false);
    if (stroke) {
      if (stroke.type === "SOLID") {
        props.stroke = colorToHex(stroke.color);
      } else if (node.type === "TEXT" && (stroke.type === "GRADIENT_LINEAR" || stroke.type === "GRADIENT_RADIAL" || stroke.type === "GRADIENT_ANGULAR") && stroke.gradientStops && stroke.gradientStops.length > 0) {
        const colors = stroke.gradientStops.map((stop) => {
          const alpha = stop.color.a !== void 0 ? stop.color.a : 1;
          return colorToHex(stop.color, alpha);
        });
        props.stroke = colors;
        if (stroke.gradientStops.length > 1) {
          const stops = stroke.gradientStops.map((stop) => stop.position);
          props.strokeGradientStops = stops;
        }
      }
      if ("strokeWeight" in node && node.strokeWeight !== void 0 && !isMixed(node.strokeWeight) && typeof node.strokeWeight === "number" && node.strokeWeight > 0) {
        props.strokeWidth = Math.round(node.strokeWeight);
      }
    }
  }
  return props;
}
var init_strokeExtractor = __esm({
  "tools/figma/src/extractors/strokeExtractor.ts"() {
    "use strict";
    init_mixed();
    init_colorUtils();
  }
});

// tools/figma/src/extractors/cornerExtractor.ts
function extractCornerProps(node) {
  const props = {};
  const radiusProperty = "cornerRadius";
  if ("cornerRadius" in node && node.cornerRadius !== void 0 && !isMixed(node.cornerRadius) && typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
    props[radiusProperty] = node.cornerRadius;
  }
  if ("topLeftRadius" in node) {
    const hasRadius = (node.topLeftRadius ?? 0) > 0 || (node.topRightRadius ?? 0) > 0 || (node.bottomRightRadius ?? 0) > 0 || (node.bottomLeftRadius ?? 0) > 0;
    if (hasRadius) {
      const allSame = node.topLeftRadius === node.topRightRadius && node.topRightRadius === node.bottomRightRadius && node.bottomRightRadius === node.bottomLeftRadius;
      if (allSame) {
        props[radiusProperty] = node.topLeftRadius;
      } else {
        props[radiusProperty] = {
          topLeft: node.topLeftRadius,
          topRight: node.topRightRadius,
          bottomRight: node.bottomRightRadius,
          bottomLeft: node.bottomLeftRadius
        };
      }
    }
  }
  return props;
}
var init_cornerExtractor = __esm({
  "tools/figma/src/extractors/cornerExtractor.ts"() {
    "use strict";
    init_mixed();
  }
});

// tools/figma/src/extractors/textExtractor.ts
function resolveLineHeightPx(node) {
  if (node.type !== "TEXT") {
    return void 0;
  }
  const lineHeight = node.lineHeight;
  if (!lineHeight || isMixed(lineHeight)) {
    return void 0;
  }
  if (lineHeight.unit === "PIXELS") {
    return lineHeight.value;
  }
  if (lineHeight.unit === "PERCENT") {
    const fontSize = node.fontSize;
    if (isMixed(fontSize) || typeof fontSize !== "number") {
      return void 0;
    }
    return lineHeight.value * fontSize / 100;
  }
  return void 0;
}
function extractTextProps(node) {
  if (node.type !== "TEXT") {
    return {};
  }
  const props = {
    text: node.characters || ""
  };
  const style = {};
  if (node.fontName && typeof node.fontName === "object" && !isMixed(node.fontName)) {
    style.fontFamily = node.fontName.family;
  }
  if (node.fontSize && !isMixed(node.fontSize)) {
    style.fontSize = node.fontSize;
  }
  if (node.fontWeight && !isMixed(node.fontWeight)) {
    style.fontWeight = node.fontWeight;
  }
  const lineHeightPx = resolveLineHeightPx(node);
  if (lineHeightPx !== void 0) {
    style.lineHeight = lineHeightPx;
  }
  if (node.textAlignHorizontal && !isMixed(node.textAlignHorizontal)) {
    const alignMap = {
      "LEFT": "left",
      "CENTER": "center",
      "RIGHT": "right",
      "JUSTIFIED": "justify"
    };
    style.align = alignMap[node.textAlignHorizontal] || "left";
  }
  if ("textAutoResize" in node && node.textAutoResize !== void 0 && !isMixed(node.textAutoResize)) {
    if (node.textAutoResize === "HEIGHT") {
      style.wordWrap = true;
      style.wordWrapWidth = Math.round(node.width);
    } else if (node.textAutoResize === "NONE") {
      style.wordWrap = true;
      style.wordWrapWidth = Math.round(node.width);
    }
  }
  Object.assign(style, extractFillProps(node));
  Object.assign(style, extractStrokeProps(node));
  props.style = style;
  return props;
}
function extractTextBlockProps(node) {
  if (node.type !== "TEXT") {
    return {};
  }
  const style = {};
  if (node.fontName && typeof node.fontName === "object" && !isMixed(node.fontName)) {
    style.fontFamily = node.fontName.family;
  }
  if (node.fontSize && !isMixed(node.fontSize)) {
    style.fontSize = node.fontSize;
  }
  if (node.fontWeight && !isMixed(node.fontWeight)) {
    style.fontWeight = node.fontWeight;
  }
  const lineHeightPx = resolveLineHeightPx(node);
  if (lineHeightPx !== void 0) {
    style.lineHeight = lineHeightPx;
  }
  if (node.textAlignHorizontal && !isMixed(node.textAlignHorizontal)) {
    const alignMap = {
      "LEFT": "left",
      "CENTER": "center",
      "RIGHT": "right",
      "JUSTIFIED": "justify"
    };
    style.align = alignMap[node.textAlignHorizontal] || "left";
  }
  if ("textAutoResize" in node && node.textAutoResize !== void 0 && !isMixed(node.textAutoResize)) {
    if (node.textAutoResize === "HEIGHT") {
      style.wordWrap = true;
      style.wordWrapWidth = Math.round(node.width);
    } else if (node.textAutoResize === "NONE") {
      style.wordWrap = true;
      style.wordWrapWidth = Math.round(node.width);
    }
  }
  Object.assign(style, extractFillProps(node));
  Object.assign(style, extractStrokeProps(node));
  style.size = {
    width: Math.round(node.width),
    height: Math.round(node.height)
  };
  style.vAlign = "middle";
  const props = {
    elements: [{
      type: "Text",
      text: node.characters || ""
    }],
    style
  };
  return props;
}
var init_textExtractor = __esm({
  "tools/figma/src/extractors/textExtractor.ts"() {
    "use strict";
    init_mixed();
    init_fillExtractor();
    init_strokeExtractor();
  }
});

// tools/figma/src/core/componentRegistry.ts
function registerComponentType(def) {
  registry.push(def);
}
function findComponentType(name) {
  if (!name) return null;
  const cleanName = cleanNameFromSizeMarker(name);
  for (const def of registry) {
    if (def.matchMode === "exact") {
      if (cleanName === def.match) return def;
    } else {
      if (cleanName.endsWith(def.match)) return def;
    }
  }
  return null;
}
var registry;
var init_componentRegistry = __esm({
  "tools/figma/src/core/componentRegistry.ts"() {
    "use strict";
    init_nodeUtils();
    init_specialProcessors();
    registry = [];
    registerComponentType({
      match: "ProgressBar",
      type: "ProgressBar",
      process: processProgressBar,
      processSet: processProgressBarComponentSet
    });
    registerComponentType({
      match: "DotsGroup",
      matchMode: "exact",
      type: "DotsGroup",
      process: processDotsGroup
    });
    registerComponentType({
      match: "RadioGroup",
      matchMode: "exact",
      type: "RadioGroup",
      process: processRadioGroup,
      handleInstance: true
    });
    registerComponentType({
      match: "ReelsLayout",
      matchMode: "exact",
      type: "ReelsLayout",
      process: processReelsLayout
    });
    registerComponentType({
      match: "ValueSlider",
      type: "ValueSlider",
      process: processValueSlider,
      processSet: processValueSliderComponentSet,
      handleInstance: true
    });
    registerComponentType({
      match: "ScrollBox",
      type: "ScrollBox",
      process: processScrollBox
    });
    registerComponentType({
      match: "Toggle",
      type: "CheckBoxComponent",
      processSet: processToggleComponentSet
    });
    registerComponentType({
      match: "Variants",
      type: "VariantsContainer",
      processSet: processVariantsContainerSet
    });
    registerComponentType({
      match: "Button",
      type: "Button"
    });
  }
});

// tools/figma/src/extractors/commonExtractor.ts
function extractCommonProps(node, isRootLevel = false, parentBounds = null) {
  let componentType;
  if (node.name === "GameZone" && node.type === "FRAME") {
    componentType = "GameZone";
  } else if (node.name === "FullScreenZone" && node.type === "FRAME") {
    componentType = "FullScreenZone";
  } else if (node.name === "SaveZone" && node.type === "FRAME") {
    componentType = "SaveZone";
  } else if (cleanNameFromSizeMarker(node.name).endsWith("TextBlock") && node.type === "TEXT") {
    componentType = "TextBlock";
  } else {
    const typeDef = node.type !== "INSTANCE" ? findComponentType(node.name) : null;
    if (typeDef) {
      componentType = typeDef.type;
    } else if (isRootLevel) {
      componentType = "ComponentContainer";
    } else if (node.type === "COMPONENT" || node.type === "COMPONENT_SET" || node.type === "INSTANCE") {
      componentType = "Component";
    } else if (node.type === "FRAME") {
      if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
        componentType = "AutoLayout";
      } else {
        componentType = "SuperContainer";
      }
    } else {
      componentType = NODE_TYPE_MAPPING[node.type] || node.type;
    }
  }
  const props = {
    name: cleanNameFromSizeMarker(node.name),
    type: componentType
  };
  if (!isRootLevel) {
    if (parentBounds) {
      props.x = Math.round(node.x - parentBounds.x);
      props.y = Math.round(node.y - parentBounds.y);
    } else {
      props.x = Math.round(node.x);
      props.y = Math.round(node.y);
    }
  }
  const isMarkedForSize = shouldExportInstanceSize(node.name);
  if (node.type === "FRAME" && componentType === "AutoLayout") {
    props.size = {};
    if ("layoutSizingHorizontal" in node && node.layoutSizingHorizontal !== "HUG") {
      props.size.width = Math.round(node.width);
    }
    if ("layoutSizingVertical" in node && node.layoutSizingVertical !== "HUG") {
      props.size.height = Math.round(node.height);
    }
  } else if (isMarkedForSize || node.type === "RECTANGLE") {
    props.width = Math.round(node.width);
    props.height = Math.round(node.height);
  }
  if (node.visible !== void 0 && node.visible === false) {
    props.visible = false;
  }
  if ("opacity" in node && node.opacity !== void 0 && !isMixed(node.opacity) && node.opacity !== 1) {
    props.alpha = node.opacity;
  }
  if ("rotation" in node && node.rotation !== void 0 && !isMixed(node.rotation) && node.rotation !== 0) {
    props.rotation = node.rotation;
  }
  return props;
}
var init_commonExtractor = __esm({
  "tools/figma/src/extractors/commonExtractor.ts"() {
    "use strict";
    init_mixed();
    init_nodeUtils();
    init_componentRegistry();
  }
});

// tools/figma/src/extractors/positioningUtils.ts
function calculateTextPositioning(node, isTextBlock = false) {
  if (node.type !== "TEXT" || !("constraints" in node) || !node.constraints) {
    return {};
  }
  const result = {};
  if (isTextBlock) {
    const alignItems = {};
    if (node.constraints.horizontal) {
      switch (node.constraints.horizontal) {
        case "MIN":
          alignItems.x = "left";
          break;
        case "CENTER":
          alignItems.x = "center";
          break;
        case "MAX":
          alignItems.x = "right";
          break;
        case "STRETCH":
          alignItems.x = "left";
          break;
        case "SCALE":
          alignItems.x = "center";
          break;
        default:
          alignItems.x = "left";
      }
    } else {
      alignItems.x = "left";
    }
    if (node.constraints.vertical) {
      switch (node.constraints.vertical) {
        case "MIN":
          alignItems.y = "top";
          break;
        case "CENTER":
          alignItems.y = "center";
          break;
        case "MAX":
          alignItems.y = "bottom";
          break;
        case "STRETCH":
          alignItems.y = "top";
          break;
        case "SCALE":
          alignItems.y = "center";
          break;
        default:
          alignItems.y = "top";
      }
    } else {
      alignItems.y = "top";
    }
    result.alignItems = alignItems;
  } else {
    if (node.constraints.horizontal) {
      switch (node.constraints.horizontal) {
        case "MIN":
          result.anchorX = 0;
          break;
        case "CENTER":
          result.anchorX = 0.5;
          break;
        case "MAX":
          result.anchorX = 1;
          break;
        case "STRETCH":
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
        case "MIN":
          result.anchorY = 0;
          break;
        case "CENTER":
          result.anchorY = 0.5;
          break;
        case "MAX":
          result.anchorY = 1;
          break;
        case "STRETCH":
          result.anchorY = 0;
          break;
        case "SCALE":
          result.anchorY = 0.5;
          break;
        default:
          result.anchorY = 0;
      }
    }
    if (result.anchorX !== void 0 || result.anchorY !== void 0) {
      const relativeX = node.x;
      const relativeY = node.y;
      if (result.anchorX !== void 0) {
        if (result.anchorX === 0.5) {
          result.adjustedX = Math.round(relativeX + node.width / 2);
        } else if (result.anchorX === 1) {
          result.adjustedX = Math.round(relativeX + node.width);
        } else {
          result.adjustedX = Math.round(relativeX);
        }
      }
      if (result.anchorY !== void 0) {
        if (result.anchorY === 0.5) {
          result.adjustedY = Math.round(relativeY + node.height / 2);
        } else if (result.anchorY === 1) {
          result.adjustedY = Math.round(relativeY + node.height);
        } else {
          result.adjustedY = Math.round(relativeY);
        }
      }
    }
  }
  return result;
}
function extractZoneChildProps(node, zoneNode) {
  const props = {};
  if (!("constraints" in node) || !node.constraints) {
    return props;
  }
  const constraints = node.constraints;
  const align = {};
  const offset = {};
  const nodeLeft = node.x;
  const nodeTop = node.y;
  const nodeRight = node.x + node.width;
  const nodeBottom = node.y + node.height;
  const nodeCenterX = node.x + node.width / 2;
  const nodeCenterY = node.y + node.height / 2;
  switch (constraints.horizontal) {
    case "MIN":
      align.x = "left";
      offset.left = Math.round(nodeLeft);
      break;
    case "MAX":
      align.x = "right";
      offset.right = Math.round(zoneNode.width - nodeRight);
      break;
    case "STRETCH":
      if (constraints.horizontal === "STRETCH") {
        align.x = "absolute";
        const leftPercent = nodeLeft / zoneNode.width * 100;
        offset.x = `${leftPercent.toFixed(1)}%`;
      }
      break;
    case "CENTER":
      align.x = "center";
      const zoneCenterX = zoneNode.width / 2;
      offset.centerX = Math.round(nodeCenterX - zoneCenterX);
      break;
    case "SCALE":
      align.x = "absolute";
      break;
    default:
      align.x = "left";
      if (!offset.hasOwnProperty("left")) {
        offset.left = Math.round(nodeLeft);
      }
  }
  switch (constraints.vertical) {
    case "MIN":
      align.y = "top";
      offset.top = Math.round(nodeTop);
      break;
    case "MAX":
      align.y = "bottom";
      offset.bottom = Math.round(zoneNode.height - nodeBottom);
      break;
    case "STRETCH":
      if (constraints.vertical === "STRETCH") {
        align.y = "absolute";
        const topPercent = nodeTop / zoneNode.height * 100;
        offset.y = `${topPercent.toFixed(1)}%`;
      }
      break;
    case "CENTER":
      align.y = "center";
      const zoneCenterY = zoneNode.height / 2;
      offset.centerY = Math.round(nodeCenterY - zoneCenterY);
      break;
    case "SCALE":
      align.y = "absolute";
      break;
    default:
      align.y = "top";
      if (!offset.hasOwnProperty("top")) {
        offset.top = Math.round(nodeTop);
      }
  }
  if (align.x === "absolute" && align.y === "absolute" && constraints.horizontal === "SCALE" && constraints.vertical === "SCALE") {
    offset.x = Math.round(nodeLeft);
    offset.y = Math.round(nodeTop);
  } else if (align.x === "absolute" && constraints.horizontal === "SCALE") {
    offset.x = Math.round(nodeLeft);
  } else if (align.y === "absolute" && constraints.vertical === "SCALE") {
    offset.y = Math.round(nodeTop);
  }
  props.align = align;
  if (Object.keys(offset).length > 0) {
    props.offset = offset;
  }
  return props;
}
var init_positioningUtils = __esm({
  "tools/figma/src/extractors/positioningUtils.ts"() {
    "use strict";
  }
});

// tools/figma/src/extractors/variantExtractor.ts
function extractVariantProps(node) {
  const variants = {};
  try {
    if (node.type === "COMPONENT" && node.parent && node.parent.type === "COMPONENT_SET") {
      if ("variantProperties" in node && node.variantProperties) {
        return node.variantProperties;
      }
      const name = node.name;
      if (name.includes("=")) {
        const pairs = name.split(",").map((s) => s.trim());
        pairs.forEach((pair) => {
          const [key, value] = pair.split("=").map((s) => s.trim());
          if (key && value) {
            variants[key] = value;
          }
        });
        return variants;
      }
    }
    if (node.type === "COMPONENT_SET" || node.type === "COMPONENT" && (!node.parent || node.parent.type !== "COMPONENT_SET")) {
      if ("componentPropertyDefinitions" in node && node.componentPropertyDefinitions) {
        Object.entries(node.componentPropertyDefinitions).forEach(([key, def]) => {
          if (def.type === "VARIANT") {
            variants[key] = def.defaultValue;
          }
        });
      }
    }
  } catch (error) {
    console.warn("Error extracting variant properties:", error);
  }
  return variants;
}
function determineViewportType(variantProps, componentName) {
  const supportedViewports = ["default", "portrait", "landscape"];
  for (const [key, value] of Object.entries(variantProps)) {
    const lowerKey = key.toLowerCase();
    const lowerValue = String(value).toLowerCase();
    if (lowerKey.includes("viewport") || lowerKey.includes("orientation") || lowerKey.includes("layout")) {
      if (supportedViewports.includes(lowerValue)) {
        return lowerValue;
      }
    }
    if (supportedViewports.includes(lowerValue)) {
      return lowerValue;
    }
  }
  const lowerName = componentName.toLowerCase();
  for (const viewport of supportedViewports) {
    if (lowerName.includes(viewport)) {
      return viewport;
    }
  }
  return "default";
}
function extractComponentProps(node) {
  if (!node.componentProperties) return null;
  const props = {};
  for (const [key, value] of Object.entries(node.componentProperties)) {
    const cleanKey = key.replace(/#\d+:\d+$/, "");
    props[cleanKey] = value.value ?? value;
  }
  return Object.keys(props).length > 0 ? props : null;
}
function extractInstanceVariant(node) {
  const props = {};
  if (node.componentProperties) {
    const variantProps = {};
    Object.entries(node.componentProperties).forEach(([key, value]) => {
      variantProps[key] = value.value || value;
    });
    const viewport = determineViewportType(variantProps, node.name);
    if (viewport !== "default") {
      props.variant = viewport;
    } else if (Object.keys(variantProps).length > 0) {
      const variantKeys = Object.keys(variantProps).sort();
      if (variantKeys.length === 1) {
        const key = variantKeys[0];
        const value = variantProps[key];
        if (value && value !== "default") {
          props.variant = String(value);
        }
      } else if (variantKeys.length > 1) {
        const variantName = variantKeys.map((key) => `${key}=${variantProps[key]}`).join(",");
        props.variant = variantName;
      }
    }
  }
  if (!props.variant) {
    const componentName = node.name;
    const lowerName = componentName.toLowerCase();
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
var init_variantExtractor = __esm({
  "tools/figma/src/extractors/variantExtractor.ts"() {
    "use strict";
  }
});

// tools/figma/src/extractors/index.ts
var init_extractors = __esm({
  "tools/figma/src/extractors/index.ts"() {
    "use strict";
    init_colorUtils();
    init_nodeUtils();
    init_autoLayoutExtractor();
    init_fillExtractor();
    init_strokeExtractor();
    init_cornerExtractor();
    init_textExtractor();
    init_commonExtractor();
    init_positioningUtils();
    init_variantExtractor();
  }
});

// tools/figma/src/core/constants.ts
function isSpecialZone(type) {
  return ZONE_NAMES.indexOf(type) !== -1;
}
var ZONE_NAMES, DEFAULT_PAGE_NAME, SKIP_NODE_NAME;
var init_constants = __esm({
  "tools/figma/src/core/constants.ts"() {
    "use strict";
    ZONE_NAMES = ["GameZone", "FullScreenZone", "SaveZone"];
    DEFAULT_PAGE_NAME = "layouts";
    SKIP_NODE_NAME = "screen";
  }
});

// tools/figma/src/core/ProcessingContext.ts
function createRootContext(componentMap) {
  return {
    componentMap,
    parentBounds: null,
    isRootLevel: true,
    parentZoneInfo: null,
    diagnostics: []
  };
}
function withContext(context, patch) {
  return {
    componentMap: patch.componentMap || context.componentMap,
    parentBounds: patch.parentBounds === void 0 ? context.parentBounds : patch.parentBounds,
    isRootLevel: patch.isRootLevel === void 0 ? context.isRootLevel : patch.isRootLevel,
    parentZoneInfo: patch.parentZoneInfo === void 0 ? context.parentZoneInfo : patch.parentZoneInfo,
    diagnostics: patch.diagnostics || context.diagnostics
  };
}
function getContainerBounds(node) {
  if (node.type === "GROUP") {
    return { x: node.x, y: node.y };
  }
  return null;
}
function getDirectZoneContext(type, node) {
  if (node.type === "FRAME" && isSpecialZone(type)) {
    return { type, zoneNode: node };
  }
  return null;
}
var init_ProcessingContext = __esm({
  "tools/figma/src/core/ProcessingContext.ts"() {
    "use strict";
    init_constants();
  }
});

// tools/figma/src/handlers/special/specialProcessors.ts
function processProgressBar(node, context, processNode2) {
  const componentName = node.name;
  try {
    const progressConfig = {
      name: componentName,
      type: "ProgressBar"
    };
    const nodeContext = withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null });
    const nodeProps = extractCommonProps(node, true, null);
    const { type: _, ...commonProps } = nodeProps;
    Object.assign(progressConfig, commonProps);
    if ("children" in node && node.children && node.children.length > 0) {
      let bgChild = null;
      let fillChild = null;
      node.children.forEach((child) => {
        const childName = child.name.toLowerCase();
        const childContext = withContext(nodeContext, { isRootLevel: false });
        if (childName === "bg") {
          const childConfig = processNode2(child, childContext);
          delete childConfig.x;
          delete childConfig.y;
          progressConfig.bg = childConfig;
          bgChild = child;
        } else if (childName === "fill") {
          const childConfig = processNode2(child, childContext);
          delete childConfig.x;
          delete childConfig.y;
          progressConfig.fill = childConfig;
          fillChild = child;
        }
      });
      if (!progressConfig.bg) {
        console.warn(`ProgressBar "${componentName}": missing required child "bg"`);
      }
      if (!progressConfig.fill) {
        console.warn(`ProgressBar "${componentName}": missing required child "fill"`);
      }
      if (fillChild && bgChild) {
        progressConfig.fillPaddings = {
          left: Math.round(fillChild.x - bgChild.x),
          top: Math.round(fillChild.y - bgChild.y)
        };
      } else if (fillChild) {
        progressConfig.fillPaddings = {
          left: Math.round(fillChild.x),
          top: Math.round(fillChild.y)
        };
      }
    } else {
      const nodeConfig = processNode2(node, withContext(nodeContext, { isRootLevel: false }));
      delete nodeConfig.x;
      delete nodeConfig.y;
      delete nodeConfig.name;
      delete nodeConfig.type;
      Object.assign(progressConfig, nodeConfig);
    }
    return progressConfig;
  } catch (error) {
    console.warn(`Error processing ProgressBar component ${componentName}:`, error);
    return null;
  }
}
function processProgressBarComponentSet(componentSet, context, processNode2) {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const firstVariant = componentSet.children.find((child) => child.type === "COMPONENT");
  if (!firstVariant) return null;
  try {
    const variantConfig = processNode2(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
    const progressConfig = { name: componentName, type: "ProgressBar" };
    if (variantConfig.children) {
      let bgChild = null;
      let fillChild = null;
      variantConfig.children.forEach((child) => {
        const childName = child.name.toLowerCase();
        if (childName === "bg") {
          const { x, y, ...childWithoutCoords } = child;
          progressConfig.bg = childWithoutCoords;
          bgChild = child;
        } else if (childName === "fill") {
          const { x, y, ...childWithoutCoords } = child;
          progressConfig.fill = childWithoutCoords;
          fillChild = child;
        }
      });
      if (fillChild && bgChild) {
        progressConfig.fillPaddings = { left: fillChild.x - bgChild.x, top: fillChild.y - bgChild.y };
      } else if (fillChild) {
        progressConfig.fillPaddings = { left: fillChild.x || 0, top: fillChild.y || 0 };
      }
    }
    return progressConfig;
  } catch (error) {
    console.warn(`Error processing ProgressBar component ${componentName}:`, error);
    return null;
  }
}
function processDotsGroup(node, context, processNode2) {
  const componentName = node.name;
  if (!("children" in node) || !node.children || node.children.length === 0) return null;
  try {
    const dotsConfig = {
      name: componentName,
      type: "DotsGroup",
      gap: 0,
      flow: "horizontal"
    };
    if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
      dotsConfig.flow = node.layoutMode.toLowerCase();
      if ("itemSpacing" in node && node.itemSpacing !== void 0) {
        dotsConfig.gap = node.itemSpacing;
      }
      if (node.layoutMode === "GRID" && "counterAxisSpacing" in node && node.counterAxisSpacing !== void 0) {
        dotsConfig.gap = node.itemSpacing || 0;
      }
    }
    node.children.forEach((child) => {
      const childName = child.name.toLowerCase();
      const childConfig = processNode2(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }));
      if (childName === "on") {
        delete childConfig.x;
        delete childConfig.y;
        dotsConfig.on = childConfig;
      } else if (childName === "off") {
        delete childConfig.x;
        delete childConfig.y;
        dotsConfig.off = childConfig;
      }
    });
    if (!dotsConfig.on) {
      console.warn(`DotsGroup "${componentName}": missing required child "on"`);
    }
    if (!dotsConfig.off) {
      console.warn(`DotsGroup "${componentName}": missing required child "off"`);
    }
    return dotsConfig;
  } catch (error) {
    console.warn(`Error processing DotsGroup component ${componentName}:`, error);
    return null;
  }
}
function processRadioGroup(node, context, processNode2) {
  const componentName = node.name;
  if (!("children" in node) || !node.children || node.children.length === 0) return null;
  try {
    const radioGroupConfig = {
      name: componentName,
      type: "RadioGroup",
      elementsMargin: 0,
      flow: "horizontal"
    };
    if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
      radioGroupConfig.flow = node.layoutMode.toLowerCase();
      if ("itemSpacing" in node && node.itemSpacing !== void 0) {
        radioGroupConfig.elementsMargin = Math.round(node.itemSpacing);
      }
      if (node.layoutMode === "GRID" && "counterAxisSpacing" in node && node.counterAxisSpacing !== void 0) {
        radioGroupConfig.elementsMargin = Math.round(node.itemSpacing || 0);
      }
    }
    let onChild = null;
    let offChild = null;
    let totalChildCount = 0;
    node.children.forEach((child) => {
      const childName = child.name.toLowerCase();
      totalChildCount++;
      if (childName === "on" && !onChild) {
        const childConfig = processNode2(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }));
        delete childConfig.x;
        delete childConfig.y;
        if ("width" in child && "height" in child) {
          childConfig.width = Math.round(child.width);
          childConfig.height = Math.round(child.height);
        }
        radioGroupConfig.on = childConfig;
        onChild = child;
      } else if (childName === "off" && !offChild) {
        const childConfig = processNode2(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }));
        delete childConfig.x;
        delete childConfig.y;
        if ("width" in child && "height" in child) {
          childConfig.width = Math.round(child.width);
          childConfig.height = Math.round(child.height);
        }
        radioGroupConfig.off = childConfig;
        offChild = child;
      }
    });
    if (!radioGroupConfig.on) {
      console.warn(`RadioGroup "${componentName}": missing required child "on"`);
    }
    if (!radioGroupConfig.off) {
      console.warn(`RadioGroup "${componentName}": missing required child "off"`);
    }
    if (totalChildCount > 0) {
      radioGroupConfig.size = totalChildCount;
    } else {
      const sizeMatch = componentName.match(/\d+/);
      radioGroupConfig.size = sizeMatch ? parseInt(sizeMatch[0], 10) : 3;
    }
    return radioGroupConfig;
  } catch (error) {
    console.warn(`Error processing RadioGroup component ${componentName}:`, error);
    return null;
  }
}
function processValueSlider(node, context, processNode2) {
  const componentName = node.name;
  if (!("children" in node) || !node.children || node.children.length === 0) return null;
  try {
    const valueSliderConfig = { name: componentName, type: "ValueSlider" };
    const parentBounds = getContainerBounds(node);
    valueSliderConfig.children = node.children.map(
      (child) => processNode2(child, withContext(context, { parentBounds, isRootLevel: false, parentZoneInfo: null }))
    );
    return valueSliderConfig;
  } catch (error) {
    console.warn(`Error processing ValueSlider component ${componentName}:`, error);
    return null;
  }
}
function processValueSliderComponentSet(componentSet, context, processNode2) {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const firstVariant = componentSet.children.find((child) => child.type === "COMPONENT");
  if (!firstVariant) return null;
  try {
    const variantConfig = processNode2(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
    const valueSliderConfig = { name: componentName, type: "ValueSlider" };
    if (variantConfig.children) {
      valueSliderConfig.children = variantConfig.children;
    }
    return valueSliderConfig;
  } catch (error) {
    console.warn(`Error processing ValueSlider component ${componentName}:`, error);
    return null;
  }
}
function processScrollBox(node, context, processNode2) {
  const componentName = node.name;
  try {
    const scrollBoxConfig = {
      name: cleanNameFromSizeMarker(componentName),
      type: "ScrollBox",
      width: Math.round(node.width),
      height: Math.round(node.height),
      scrollType: "vertical",
      elementsMargin: 0
    };
    if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
      scrollBoxConfig.scrollType = node.layoutMode === "HORIZONTAL" ? "horizontal" : "vertical";
      if ("itemSpacing" in node && node.itemSpacing !== void 0) {
        scrollBoxConfig.elementsMargin = Math.round(node.itemSpacing);
      }
    }
    if ("children" in node && node.children && node.children.length > 0) {
      const parentBounds = getContainerBounds(node);
      scrollBoxConfig.children = node.children.map(
        (child) => processNode2(child, withContext(context, { parentBounds, isRootLevel: false, parentZoneInfo: null }))
      );
    }
    return scrollBoxConfig;
  } catch (error) {
    console.warn(`Error processing ScrollBox component ${componentName}:`, error);
    return null;
  }
}
function processVariantsContainerSet(componentSet, context, processNode2) {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const variants = {};
  componentSet.children.forEach((variant) => {
    if (variant.type !== "COMPONENT") return;
    try {
      const variantProps = extractVariantProps(variant);
      const config = processNode2(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      let variantName = "default";
      if (variantProps.variant) {
        variantName = variantProps.variant;
      } else if (Object.keys(variantProps).length > 0) {
        const firstKey = Object.keys(variantProps)[0];
        variantName = variantProps[firstKey];
      } else if (variant.name.includes("=")) {
        const pairs = variant.name.split(",").map((s) => s.trim());
        const firstPair = pairs[0];
        if (firstPair.includes("=")) {
          variantName = firstPair.split("=")[1].trim();
        }
      } else {
        variantName = variant.name;
      }
      const { name, type, ...variantConfig } = config;
      variants[variantName] = variantConfig;
    } catch (error) {
      console.warn(`Error processing VariantsContainer variant ${variant.name}:`, error);
    }
  });
  return {
    name: componentName,
    type: "VariantsContainer",
    variants
  };
}
function processToggleComponentSet(componentSet, context, processNode2) {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  let onState = null;
  let offState = null;
  componentSet.children.forEach((variant) => {
    if (variant.type !== "COMPONENT") return;
    try {
      const variantProps = extractVariantProps(variant);
      if (variantProps.state === "on" || variant.name.includes("state=on")) {
        onState = processNode2(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      } else if (variantProps.state === "off" || variant.name.includes("state=off")) {
        offState = processNode2(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      }
    } catch (error) {
      console.warn(`Error processing toggle variant ${variant.name}:`, error);
    }
  });
  const result = { name: componentName, type: "CheckBoxComponent" };
  if (onState) {
    if (onState.children && onState.children.length > 0) {
      result.checked = onState.children[0];
    } else {
      const stateCopy = Object.assign({}, onState);
      delete stateCopy.name;
      delete stateCopy.type;
      result.checked = stateCopy;
    }
  }
  if (offState) {
    if (offState.children && offState.children.length > 0) {
      result.unchecked = offState.children[0];
    } else {
      const stateCopy = Object.assign({}, offState);
      delete stateCopy.name;
      delete stateCopy.type;
      result.unchecked = stateCopy;
    }
  }
  return result;
}
function processComponentVariantsSet(componentSet, context, processNode2) {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const viewportGroups = {
    default: [],
    portrait: [],
    landscape: []
  };
  componentSet.children.forEach((variant) => {
    if (variant.type !== "COMPONENT") return;
    try {
      const variantProps = extractVariantProps(variant);
      const config = processNode2(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const viewport = determineViewportType(variantProps, variant.name);
      viewportGroups[viewport].push({
        ...config,
        variantProps: Object.keys(variantProps).length > 0 ? variantProps : void 0
      });
    } catch (error) {
      console.warn(`Error processing variant ${variant.name}:`, error);
      const config = processNode2(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const viewport = determineViewportType({}, variant.name);
      viewportGroups[viewport].push(config);
    }
  });
  const cleanName = cleanNameFromSizeMarker(componentName);
  const isButton = cleanName.endsWith("Button");
  const isScreenLayout = cleanName.endsWith("Layout") || cleanName.endsWith("Scene");
  let componentType;
  if (isButton) {
    componentType = "Button";
  } else if (isScreenLayout) {
    componentType = "ComponentContainer";
  } else {
    const firstVariant = componentSet.children.find((child) => child.type === "COMPONENT");
    if (firstVariant && "layoutMode" in firstVariant && firstVariant.layoutMode && firstVariant.layoutMode !== "NONE") {
      componentType = "AutoLayout";
    } else {
      componentType = "SuperContainer";
    }
  }
  const result = { name: componentName, type: componentType, variants: {} };
  Object.entries(viewportGroups).forEach(([viewport, configs]) => {
    if (configs.length > 0) {
      if (configs.length === 1) {
        const config = configs[0];
        const { name, type, ...variantConfig } = config;
        if (isButton && variantConfig.children && variantConfig.children.length > 0) {
          variantConfig.image = variantConfig.children[0];
          delete variantConfig.children;
        }
        result.variants[viewport] = variantConfig;
        if (!result.variants[viewport].variantProps) {
          delete result.variants[viewport].variantProps;
        }
      } else {
        result.variants[viewport] = configs.map((config) => {
          const { name, type, ...variantConfig } = config;
          if (isButton && variantConfig.children && variantConfig.children.length > 0) {
            variantConfig.image = variantConfig.children[0];
            delete variantConfig.children;
          }
          return variantConfig;
        });
      }
    }
  });
  const hasSpecificViewports = Object.keys(result.variants).length > 0;
  if (!hasSpecificViewports && componentSet.children.length > 0) {
    const firstVariant = componentSet.children.find((child) => child.type === "COMPONENT");
    if (firstVariant) {
      const config = processNode2(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const { name, type, ...variantConfig } = config;
      if (isButton && variantConfig.children && variantConfig.children.length > 0) {
        variantConfig.image = variantConfig.children[0];
        delete variantConfig.children;
      }
      result.variants.default = variantConfig;
    }
  }
  return result;
}
function processReelsLayout(node, context, processNode2) {
  const componentName = node.name;
  if (!("children" in node) || !node.children || node.children.length === 0) return null;
  try {
    const reelsConfig = { name: componentName, type: "ReelsLayout" };
    node.children.forEach((child) => {
      const childName = child.name.toLowerCase();
      const childContext = withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null });
      if (childName === "shadow") {
        reelsConfig.shadow = processNode2(child, childContext);
      } else if (childName === "mask") {
        reelsConfig.mask = processNode2(child, childContext);
      } else if (childName === "frame") {
        reelsConfig.frame = processNode2(child, childContext);
      } else if (childName === "reels" && child.type === "FRAME") {
        const reelsData = {
          x: Math.round(child.x),
          y: Math.round(child.y),
          gap: { betweenColumns: 0, betweenRows: 0 }
        };
        let hasGridProperties = false;
        if ("layoutMode" in child && child.layoutMode !== "NONE") {
          hasGridProperties = true;
          if (child.layoutMode === "GRID") {
            if ("itemSpacing" in child && child.itemSpacing !== void 0) {
              reelsData.gap.betweenColumns = child.itemSpacing;
              reelsData.gap.betweenRows = child.itemSpacing;
            }
            if ("counterAxisSpacing" in child && child.counterAxisSpacing !== void 0) {
              reelsData.gap.betweenRows = child.counterAxisSpacing;
            }
          } else {
            if ("itemSpacing" in child && child.itemSpacing !== void 0) {
              if (child.layoutMode === "HORIZONTAL") {
                reelsData.gap.betweenColumns = child.itemSpacing;
              } else if (child.layoutMode === "VERTICAL") {
                reelsData.gap.betweenRows = child.itemSpacing;
              }
            }
            if ("counterAxisSpacing" in child && child.counterAxisSpacing !== void 0) {
              if (child.layoutMode === "HORIZONTAL") {
                reelsData.gap.betweenRows = child.counterAxisSpacing;
              } else if (child.layoutMode === "VERTICAL") {
                reelsData.gap.betweenColumns = child.counterAxisSpacing;
              }
            }
          }
        }
        if (!hasGridProperties && "layoutGrids" in child && child.layoutGrids && child.layoutGrids.length > 0) {
          const grid = child.layoutGrids.find((g) => g.pattern === "GRID");
          if (grid && grid.gutterSize !== void 0) {
            hasGridProperties = true;
            reelsData.gap.betweenColumns = grid.gutterSize;
            reelsData.gap.betweenRows = grid.gutterSize;
          }
        }
        if ((!hasGridProperties || child.layoutMode === "GRID" && reelsData.gap.betweenColumns === 0 && reelsData.gap.betweenRows === 0) && child.children && child.children.length > 0) {
          const children = Array.from(child.children);
          const childPositions = children.map((c) => ({ x: c.x, y: c.y, width: c.width, height: c.height }));
          const uniqueXPositions = [...new Set(childPositions.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
          const uniqueYPositions = [...new Set(childPositions.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
          reelsData.columns = uniqueXPositions.length;
          reelsData.rows = uniqueYPositions.length;
          if (uniqueXPositions.length > 1) {
            const firstY = uniqueYPositions[0];
            const firstChild = childPositions.find((p) => Math.round(p.y) === firstY && Math.round(p.x) === uniqueXPositions[0]);
            const secondChild = childPositions.find((p) => Math.round(p.y) === firstY && Math.round(p.x) === uniqueXPositions[1]);
            if (firstChild && secondChild) {
              reelsData.gap.betweenColumns = Math.round(secondChild.x - (firstChild.x + firstChild.width));
            }
          }
          if (uniqueYPositions.length > 1) {
            const firstX = uniqueXPositions[0];
            const firstChild = childPositions.find((p) => Math.round(p.x) === firstX && Math.round(p.y) === uniqueYPositions[0]);
            const secondChild = childPositions.find((p) => Math.round(p.x) === firstX && Math.round(p.y) === uniqueYPositions[1]);
            if (firstChild && secondChild) {
              reelsData.gap.betweenRows = Math.round(secondChild.y - (firstChild.y + firstChild.height));
            }
          }
        } else if (child.children && child.children.length > 0) {
          const children = Array.from(child.children);
          const childPositions = children.map((c) => ({ x: c.x, y: c.y, width: c.width, height: c.height }));
          const uniqueXPositions = [...new Set(childPositions.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
          const uniqueYPositions = [...new Set(childPositions.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
          reelsData.columns = uniqueXPositions.length;
          reelsData.rows = uniqueYPositions.length;
        }
        if (child.children && child.children.length > 0) {
          const firstChild = child.children[0];
          reelsData.symbolWidth = Math.round(firstChild.width);
          reelsData.symbolHeight = Math.round(firstChild.height);
        } else {
          reelsData.symbolWidth = 0;
          reelsData.symbolHeight = 0;
        }
        if (!reelsData.rows) reelsData.rows = 1;
        if (!reelsData.columns) reelsData.columns = 1;
        reelsConfig.reels = reelsData;
      }
    });
    return reelsConfig;
  } catch (error) {
    console.warn(`Error processing ReelsLayout component ${componentName}:`, error);
    return null;
  }
}
var init_specialProcessors = __esm({
  "tools/figma/src/handlers/special/specialProcessors.ts"() {
    "use strict";
    init_extractors();
    init_ProcessingContext();
  }
});

// tools/figma/src/core/coordinateUtils.ts
function applyRelativePosition(target, node, parentBounds) {
  if (parentBounds) {
    target.x = Math.round(node.x - parentBounds.x);
    target.y = Math.round(node.y - parentBounds.y);
  } else {
    target.x = Math.round(node.x);
    target.y = Math.round(node.y);
  }
}
var init_coordinateUtils = __esm({
  "tools/figma/src/core/coordinateUtils.ts"() {
    "use strict";
  }
});

// tools/figma/src/core/NodeProcessor.ts
var NodeProcessor;
var init_NodeProcessor = __esm({
  "tools/figma/src/core/NodeProcessor.ts"() {
    "use strict";
    init_extractors();
    init_componentRegistry();
    init_constants();
    init_coordinateUtils();
    init_ProcessingContext();
    NodeProcessor = class {
      process(node, context) {
        let result;
        const typeDef = !context.isRootLevel ? findComponentType(node.name) : null;
        if (typeDef?.process && !context.isRootLevel) {
          result = typeDef.process(node, context, (n, c) => this.process(n, c));
          if (result) {
            applyRelativePosition(result, node, context.parentBounds);
          }
        } else if (node.type === "INSTANCE") {
          result = this.processInstance(node, context);
        } else if (node.name && node.name.endsWith("_ph")) {
          result = this.processPlaceholder(node, context);
        } else {
          result = this.processBaseNode(node, context);
        }
        if (result && typeof result === "object" && Array.isArray(result.children) && result.children.length === 0) {
          delete result.children;
        }
        return result;
      }
      processInstance(node, context) {
        var parentComponentInfo = { name: "Component", width: 0, height: 0, node: void 0 };
        if (node.mainComponentId && context.componentMap.has(node.mainComponentId)) {
          parentComponentInfo = context.componentMap.get(node.mainComponentId);
        }
        var mainComponentNode = parentComponentInfo.node;
        var instanceTypeDef = findComponentType(parentComponentInfo.name);
        if (instanceTypeDef?.handleInstance && instanceTypeDef.process && mainComponentNode) {
          var specialConfig = instanceTypeDef.process(
            mainComponentNode,
            withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }),
            (n, c) => this.process(n, c)
          );
          if (specialConfig) {
            specialConfig.name = cleanNameFromSizeMarker(node.name);
            applyRelativePosition(specialConfig, node, context.parentBounds);
            if (instanceTypeDef.type === "RadioGroup") {
              var scaleX = node.width / mainComponentNode.width;
              var scaleY = node.height / mainComponentNode.height;
              if (specialConfig.on && mainComponentNode.children) {
                var onChild = mainComponentNode.children.find(function(child2) {
                  return child2.name.toLowerCase() === "on";
                });
                if (onChild) {
                  specialConfig.on.width = Math.round(onChild.width * scaleX);
                  specialConfig.on.height = Math.round(onChild.height * scaleY);
                }
              }
              if (specialConfig.off && mainComponentNode.children) {
                var offChild = mainComponentNode.children.find(function(child2) {
                  return child2.name.toLowerCase() === "off";
                });
                if (offChild) {
                  specialConfig.off.width = Math.round(offChild.width * scaleX);
                  specialConfig.off.height = Math.round(offChild.height * scaleY);
                }
              }
              if (specialConfig.elementsMargin && mainComponentNode.itemSpacing !== void 0) {
                var avgScale = (scaleX + scaleY) / 2;
                specialConfig.elementsMargin = Math.round(specialConfig.elementsMargin * avgScale);
              }
            }
            return specialConfig;
          }
        }
        var props = {
          name: cleanNameFromSizeMarker(node.name),
          type: parentComponentInfo.name,
          isInstance: true
        };
        applyRelativePosition(props, node, context.parentBounds);
        var commonProps = extractCommonProps(node, false, context.parentBounds);
        var { type: _, ...commonPropsWithoutType } = commonProps;
        Object.assign(props, {
          ...commonPropsWithoutType,
          x: props.x,
          y: props.y,
          type: props.type
        });
        props.width = Math.round(node.width);
        props.height = Math.round(node.height);
        var parentTypeDef = findComponentType(parentComponentInfo.name);
        if (parentTypeDef?.type === "CheckBoxComponent") {
          var variantInfo = extractInstanceVariant(node);
          var stateValue;
          if (node.componentProperties) {
            Object.entries(node.componentProperties).forEach(function(entry) {
              var key = entry[0];
              var value = entry[1];
              if (key.toLowerCase() === "state") {
                stateValue = value.value || value;
              }
            });
          }
          if (!stateValue && variantInfo.variant) {
            if (variantInfo.variant.includes("on")) {
              stateValue = "on";
            } else if (variantInfo.variant.includes("off")) {
              stateValue = "off";
            }
          }
          props.value = stateValue === "on";
        } else {
          Object.assign(props, extractInstanceVariant(node));
        }
        var componentProps = extractComponentProps(node);
        if (componentProps) {
          props.componentProperties = componentProps;
        }
        var hasTopLevelConfig = mainComponentNode && mainComponentNode.parent && mainComponentNode.parent.type === "COMPONENT_SET";
        if (!hasTopLevelConfig && node.children && node.children.length > 0) {
          var parentBounds = getContainerBounds(node);
          var inlineChildren = [];
          for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (child.name === SKIP_NODE_NAME) continue;
            inlineChildren.push(this.process(child, withContext(context, {
              parentBounds,
              isRootLevel: false,
              parentZoneInfo: null
            })));
          }
          if (inlineChildren.length > 0) {
            props.children = inlineChildren;
          }
        }
        return props;
      }
      processPlaceholder(node, context) {
        var props = {
          name: cleanNameFromSizeMarker(node.name),
          type: "SuperContainer"
        };
        var centerX = node.x + node.width / 2;
        var centerY = node.y + node.height / 2;
        if (context.parentBounds) {
          props.x = Math.round(centerX - context.parentBounds.x);
          props.y = Math.round(centerY - context.parentBounds.y);
        } else {
          props.x = Math.round(centerX);
          props.y = Math.round(centerY);
        }
        return props;
      }
      processBaseNode(node, context) {
        var props = extractCommonProps(node, context.isRootLevel, context.parentBounds);
        switch (node.type) {
          case "FRAME":
            if (props.type === "AutoLayout") {
              Object.assign(props, extractAutoLayoutProps(node));
            }
            break;
          case "TEXT":
            if (props.type === "TextBlock") {
              Object.assign(props, extractTextBlockProps(node));
              var textBlockPos = calculateTextPositioning(node, true);
              if (textBlockPos.alignItems) {
                props.style.alignItems = textBlockPos.alignItems;
              }
            } else {
              Object.assign(props, extractTextProps(node));
              var textPos = calculateTextPositioning(node, false);
              if (textPos.anchorX !== void 0) {
                props.anchorX = textPos.anchorX;
              }
              if (textPos.anchorY !== void 0) {
                props.anchorY = textPos.anchorY;
              }
              if (textPos.adjustedX !== void 0) {
                if (context.parentBounds) {
                  props.x = Math.round(textPos.adjustedX - context.parentBounds.x);
                } else {
                  props.x = textPos.adjustedX;
                }
              }
              if (textPos.adjustedY !== void 0) {
                if (context.parentBounds) {
                  props.y = Math.round(textPos.adjustedY - context.parentBounds.y);
                } else {
                  props.y = textPos.adjustedY;
                }
              }
            }
            break;
          case "RECTANGLE": {
            const style = {};
            Object.assign(style, extractFillProps(node));
            Object.assign(style, extractStrokeProps(node));
            Object.assign(style, extractCornerProps(node));
            if (props.alpha !== void 0) {
              style.alpha = props.alpha;
              delete props.alpha;
            }
            if (Object.keys(style).length > 0) {
              props.style = style;
            }
            break;
          }
          case "ELLIPSE":
          case "VECTOR": {
            const style = {};
            Object.assign(style, extractFillProps(node));
            Object.assign(style, extractStrokeProps(node));
            if (props.alpha !== void 0) {
              style.alpha = props.alpha;
              delete props.alpha;
            }
            if (Object.keys(style).length > 0) {
              props.style = style;
            }
            break;
          }
        }
        var shouldExportChildren;
        if (context.isRootLevel) {
          shouldExportChildren = true;
        } else {
          var containerTypes = ["GROUP", "FRAME"];
          var componentTypes = ["COMPONENT", "COMPONENT_SET", "INSTANCE"];
          shouldExportChildren = containerTypes.indexOf(node.type) !== -1 || componentTypes.indexOf(node.type) === -1;
        }
        if (node.children && node.children.length > 0 && shouldExportChildren) {
          var parentBounds = getContainerBounds(node);
          var zoneType = isSpecialZone(props.type);
          var self = this;
          props.children = [];
          for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (child.name === SKIP_NODE_NAME) continue;
            var zoneInfoForChild = zoneType ? getDirectZoneContext(props.type, node) : null;
            var childContext = withContext(context, {
              parentBounds,
              isRootLevel: false,
              parentZoneInfo: zoneInfoForChild
            });
            var childProps = self.process(child, childContext);
            if (zoneType && node.type === "FRAME") {
              var zoneProps = extractZoneChildProps(child, node);
              Object.assign(childProps, zoneProps);
              delete childProps.x;
              delete childProps.y;
            }
            props.children.push(childProps);
          }
        }
        return props;
      }
    };
  }
});

// tools/figma/src/core/ExportPipeline.ts
var ExportPipeline;
var init_ExportPipeline = __esm({
  "tools/figma/src/core/ExportPipeline.ts"() {
    "use strict";
    init_specialProcessors();
    init_componentRegistry();
    init_constants();
    init_ProcessingContext();
    init_NodeProcessor();
    ExportPipeline = class {
      nodeProcessor;
      documentProvider;
      onProgress;
      /**
       * @param {ExportPipelineOptions} options
       */
      constructor(options) {
        this.documentProvider = options.documentProvider;
        this.nodeProcessor = new NodeProcessor();
        this.onProgress = options.onProgress;
      }
      /**
       * @param {string} pageName
       * @returns {ExportResult}
       */
      run(pageName) {
        const targetPage = pageName || DEFAULT_PAGE_NAME;
        const componentsPage = this.documentProvider.findPageByName(targetPage);
        if (!componentsPage) {
          throw new Error(`\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0441 \u0438\u043C\u0435\u043D\u0435\u043C "${targetPage}" \u0432 \u0444\u0430\u0439\u043B\u0435 Figma`);
        }
        this.onProgress && this.onProgress("\u0421\u043E\u0437\u0434\u0430\u0435\u043C \u043A\u0430\u0440\u0442\u0443 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u043E\u0432...");
        const componentMap = this.documentProvider.buildComponentMap();
        const rootContext = createRootContext(componentMap);
        const components = [];
        for (const child of componentsPage.children) {
          if (child.name === SKIP_NODE_NAME) {
            continue;
          }
          try {
            let componentConfig = null;
            const typeDef = findComponentType(child.name);
            const processNodeFn = (node, context) => this.nodeProcessor.process(node, context);
            const childContext = withContext(rootContext, { isRootLevel: false, parentBounds: null, parentZoneInfo: null });
            if (child.type === "COMPONENT_SET") {
              if (typeDef?.processSet) {
                componentConfig = typeDef.processSet(child, rootContext, processNodeFn);
              } else {
                componentConfig = processComponentVariantsSet(child, rootContext, processNodeFn);
              }
            } else if (typeDef?.process) {
              componentConfig = typeDef.process(child, childContext, processNodeFn);
            } else {
              const nodeConfig = this.nodeProcessor.process(child, rootContext);
              const { name, type, ...variantConfig } = nodeConfig;
              const componentType = typeDef?.type || "ComponentContainer";
              componentConfig = {
                name,
                type: componentType,
                variants: {
                  default: variantConfig
                }
              };
            }
            if (componentConfig) {
              components.push(componentConfig);
            }
          } catch (error) {
            console.warn(`Error processing component ${child.name}:`, error);
            this.onProgress && this.onProgress(`\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u043C \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442 ${child.name} \u0438\u0437-\u0437\u0430 \u043E\u0448\u0438\u0431\u043A\u0438`);
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
              if (Object.prototype.hasOwnProperty.call(variantStats, key)) {
                variantStats[key]++;
              }
            });
          }
        });
        return {
          components,
          metadata: {
            exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
            statistics: {
              ...stats,
              variantsByViewport: variantStats
            }
          }
        };
      }
    };
  }
});

// tools/figma/src/commands/export-components.ts
var export_components_exports = {};
__export(export_components_exports, {
  run: () => run3
});
import fs5 from "fs";
import path5 from "path";
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
  const fileData = await client.fetchFile(fileKey);
  const provider = new RestDocumentProvider(fileData);
  const pipeline = new ExportPipeline({
    documentProvider: provider,
    onProgress: (message) => console.log(message)
  });
  console.log("Processing components...");
  const result = pipeline.run("layouts");
  const config = {
    ...result,
    metadata: {
      ...result.metadata,
      figmaFileKey: fileKey
    }
  };
  if (!fs5.existsSync(outputDir)) {
    fs5.mkdirSync(outputDir, { recursive: true });
  }
  const jsonPath = path5.join(outputDir, "components.config.json");
  await fs5.promises.writeFile(jsonPath, JSON.stringify(config, null, 2));
  const stats = result.metadata?.statistics;
  console.log(`
Components config saved: ${jsonPath}`);
  console.log(`
Export statistics:`);
  console.log(`  Total components: ${stats?.totalComponents ?? 0}`);
  console.log(`  With variants: ${stats?.componentsWithVariants ?? 0}`);
  console.log(`  Without variants: ${stats?.componentsWithoutVariants ?? 0}`);
  if (stats?.variantsByViewport) {
    console.log(`
Variants by viewport:`);
    Object.entries(stats.variantsByViewport).forEach(([viewport, count]) => {
      if (count > 0) console.log(`  ${viewport}: ${count}`);
    });
  }
  console.log("\nExport complete!");
}
var init_export_components = __esm({
  "tools/figma/src/commands/export-components.ts"() {
    "use strict";
    init_FigmaAuth();
    init_FigmaClient();
    init_find_game_root();
    init_RestDocumentProvider();
    init_ExportPipeline();
  }
});

// tools/figma/src/commands/oauth-setup.ts
var oauth_setup_exports = {};
__export(oauth_setup_exports, {
  run: () => run4
});
import http from "http";
import net from "net";
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
      const parsedUrl = new URL(req.url || "", `http://localhost:${port}`);
      if (parsedUrl.pathname === "/callback") {
        try {
          const query = Object.fromEntries(parsedUrl.searchParams);
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
