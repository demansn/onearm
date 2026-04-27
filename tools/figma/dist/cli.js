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
        const maxRetries = 5;
        let backoff = 1e3;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const response = await fetch(url, { ...options, headers });
          if (response.status === 429) {
            if (attempt === maxRetries) {
              throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
            }
            const retryAfter = response.headers.get("Retry-After");
            const waitMs = retryAfter ? parseInt(retryAfter) * 1e3 : backoff;
            console.log(`Rate limit (429), waiting ${waitMs / 1e3}s... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            backoff = Math.min(backoff * 2, 3e4);
            continue;
          }
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
        throw new Error("Max retries exceeded");
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
      async getLastModified(fileKey) {
        const url = `${FIGMA_API_BASE}/files/${fileKey}?depth=1`;
        const response = await this.auth.makeAuthenticatedRequest(url);
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Figma API error ${response.status}: ${body}`);
        }
        const data = await response.json();
        return data.lastModified;
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
        let newPath = child.name.substring("path/".length).trim();
        if (!newPath.endsWith("{tps}")) {
          newPath += "{tps}";
        }
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
      await new Promise((resolve) => setTimeout(resolve, 300));
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
      get clipsContent() {
        return this.data.clipsContent;
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
        return this.data.style?.textAutoResize ?? "NONE";
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
      const colorStops = fill.gradientStops.map((stop) => {
        const alpha = stop.color.a !== void 0 ? stop.color.a : 1;
        return {
          offset: stop.position,
          color: colorToHex(stop.color, alpha)
        };
      });
      const props = {};
      if (fill.type === "GRADIENT_LINEAR") {
        const { start, end } = linearGradientEndpoints(fill.gradientTransform);
        props.fill = { type: "linear", start, end, colorStops };
      } else if (fill.type === "GRADIENT_RADIAL") {
        const { center, outerRadius } = radialGradientShape(fill.gradientTransform);
        props.fill = { type: "radial", center, innerRadius: 0, outerRadius, colorStops };
      } else {
        props.fill = {
          type: "linear",
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
          colorStops
        };
      }
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
function linearGradientEndpoints(transform) {
  const fallback = {
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 }
  };
  if (!transform || transform.length < 2) return fallback;
  const a = transform[0][0];
  const c = transform[0][1];
  const e = transform[0][2];
  const b = transform[1][0];
  const d = transform[1][1];
  const f = transform[1][2];
  const det = a * d - b * c;
  if (!det) return fallback;
  const inv00 = d / det;
  const inv01 = -c / det;
  const inv02 = (c * f - d * e) / det;
  const inv10 = -b / det;
  const inv11 = a / det;
  const inv12 = (b * e - a * f) / det;
  const startX = inv02;
  const startY = inv12;
  const endX = inv00 + inv02;
  const endY = inv10 + inv12;
  const round = (v) => Math.round(v * 1e3) / 1e3;
  return {
    start: { x: round(startX), y: round(startY) },
    end: { x: round(endX), y: round(endY) }
  };
}
function radialGradientShape(transform) {
  if (!transform || transform.length < 2) {
    return { center: { x: 0.5, y: 0.5 }, outerRadius: 0.5 };
  }
  const a = transform[0][0];
  const c = transform[0][1];
  const e = transform[0][2];
  const b = transform[1][0];
  const d = transform[1][1];
  const f = transform[1][2];
  const det = a * d - b * c;
  let cx = 0.5;
  let cy = 0.5;
  if (det) {
    const inv00 = d / det;
    const inv01 = -c / det;
    const inv02 = (c * f - d * e) / det;
    const inv10 = -b / det;
    const inv11 = a / det;
    const inv12 = (b * e - a * f) / det;
    cx = 0.5 * inv00 + 0.5 * inv01 + inv02;
    cy = 0.5 * inv10 + 0.5 * inv11 + inv12;
  }
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);
  const outerRadius = (scaleX + scaleY) * 0.5 || 0.5;
  const round = (v) => Math.round(v * 1e3) / 1e3;
  return {
    center: { x: round(cx), y: round(cy) },
    outerRadius: round(outerRadius)
  };
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
      props.maxWidth = Math.round(node.width);
    }
  }
  Object.assign(style, extractFillProps(node));
  Object.assign(style, extractStrokeProps(node));
  props.style = style;
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

// tools/figma/src/core/coordinateUtils.ts
function getUnrotatedDimensions(node) {
  const rotation = typeof node.rotation === "number" ? node.rotation : 0;
  const isSwapped = Math.abs(Math.sin(rotation)) > 0.707;
  return {
    origW: isSwapped ? node.height : node.width,
    origH: isSwapped ? node.width : node.height
  };
}
function correctRotatedPosition(x, y, node) {
  const rotation = typeof node.rotation === "number" ? node.rotation : 0;
  if (rotation === 0) return { x, y };
  const cos\u03B8 = Math.cos(rotation);
  const sin\u03B8 = Math.sin(rotation);
  const { origW, origH } = getUnrotatedDimensions(node);
  const cx = x + node.width / 2;
  const cy = y + node.height / 2;
  return {
    x: Math.round(cx - cos\u03B8 * origW / 2 + sin\u03B8 * origH / 2),
    y: Math.round(cy - sin\u03B8 * origW / 2 - cos\u03B8 * origH / 2)
  };
}
function computeScale(instanceW, instanceH, originalW, originalH) {
  if (originalW <= 0 || originalH <= 0) return void 0;
  const scaleX = instanceW / originalW;
  const scaleY = instanceH / originalH;
  if (scaleX === 1 && scaleY === 1) return void 0;
  const roundedX = Math.round(scaleX * 1e3) / 1e3;
  const roundedY = Math.round(scaleY * 1e3) / 1e3;
  return roundedX === roundedY ? roundedX : { x: roundedX, y: roundedY };
}
function applyRelativePosition(target, node, parentBounds) {
  const baseX = parentBounds ? Math.round(node.x - parentBounds.x) : Math.round(node.x);
  const baseY = parentBounds ? Math.round(node.y - parentBounds.y) : Math.round(node.y);
  const corrected = correctRotatedPosition(baseX, baseY, node);
  target.x = corrected.x;
  target.y = corrected.y;
}
var init_coordinateUtils = __esm({
  "tools/figma/src/core/coordinateUtils.ts"() {
    "use strict";
  }
});

// tools/figma/src/handlers/special/specialProcessors.ts
function stripCoords(config) {
  const { x, y, ...rest } = config;
  return rest;
}
function extractLayoutSpacing(node) {
  if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
    let spacing = 0;
    if ("itemSpacing" in node && node.itemSpacing !== void 0) {
      spacing = node.itemSpacing;
    }
    if (node.layoutMode === "GRID" && "counterAxisSpacing" in node && node.counterAxisSpacing !== void 0) {
      spacing = node.itemSpacing || 0;
    }
    return { flow: node.layoutMode.toLowerCase(), spacing };
  }
  return { flow: "horizontal", spacing: 0 };
}
function processFirstVariantOfSet(componentSet, context, processNode2, typeName, buildConfig) {
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const firstVariant = componentSet.children.find((child) => child.type === "COMPONENT");
  if (!firstVariant) return null;
  try {
    const variantConfig = processNode2(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
    return { name: componentSet.name, type: typeName, ...buildConfig(variantConfig) };
  } catch (error) {
    console.warn(`Error processing ${typeName} component ${componentSet.name}:`, error);
    return null;
  }
}
function processPlaceholder(node, context, processNode2) {
  if (node.type === "INSTANCE") {
    let phInfo = { name: "Component", width: 0, height: 0, node: void 0 };
    if (node.mainComponentId && context.componentMap.has(node.mainComponentId)) {
      phInfo = context.componentMap.get(node.mainComponentId);
    }
    const props2 = {
      name: cleanNameFromSizeMarker(node.name),
      type: "BaseContainer"
    };
    const { origW, origH } = getUnrotatedDimensions(node);
    props2.width = Math.round(origW);
    props2.height = Math.round(origH);
    const scale = computeScale(props2.width, props2.height, phInfo.width, phInfo.height);
    if (scale !== void 0) props2.scale = scale;
    return props2;
  }
  const props = {
    name: cleanNameFromSizeMarker(node.name),
    type: "SuperContainer",
    _skipPosition: true
  };
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  if (context.parentBounds) {
    props.x = Math.round(centerX - context.parentBounds.x);
    props.y = Math.round(centerY - context.parentBounds.y);
  } else {
    props.x = Math.round(centerX);
    props.y = Math.round(centerY);
  }
  return props;
}
function processProgressBar(node, context, processNode2) {
  const componentName = node.name;
  try {
    const progressConfig = {
      name: componentName,
      type: "ProgressBar"
    };
    const nodeContext = withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null });
    const { type: _, ...commonProps } = extractCommonProps(node, true, null);
    Object.assign(progressConfig, commonProps);
    if ("children" in node && node.children && node.children.length > 0) {
      let bgChild = null;
      let fillChild = null;
      node.children.forEach((child) => {
        const childName = child.name.toLowerCase();
        const childContext = withContext(nodeContext, { isRootLevel: false });
        if (childName === "bg") {
          progressConfig.bg = stripCoords(processNode2(child, childContext));
          bgChild = child;
        } else if (childName === "fill") {
          progressConfig.fill = stripCoords(processNode2(child, childContext));
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
  return processFirstVariantOfSet(componentSet, context, processNode2, "ProgressBar", (variantConfig) => {
    const result = {};
    if (!variantConfig.children) return result;
    let bgChild = null;
    let fillChild = null;
    variantConfig.children.forEach((child) => {
      const childName = child.name.toLowerCase();
      if (childName === "bg") {
        result.bg = stripCoords(child);
        bgChild = child;
      } else if (childName === "fill") {
        result.fill = stripCoords(child);
        fillChild = child;
      }
    });
    if (fillChild && bgChild) {
      result.fillPaddings = { left: fillChild.x - bgChild.x, top: fillChild.y - bgChild.y };
    } else if (fillChild) {
      result.fillPaddings = { left: fillChild.x || 0, top: fillChild.y || 0 };
    }
    return result;
  });
}
function processDotsGroup(node, context, processNode2) {
  const componentName = node.name;
  if (!("children" in node) || !node.children || node.children.length === 0) return null;
  try {
    const { flow, spacing } = extractLayoutSpacing(node);
    const dotsConfig = {
      name: componentName,
      type: "DotsGroup",
      gap: spacing,
      flow
    };
    node.children.forEach((child) => {
      const childName = child.name.toLowerCase();
      if (childName === "on" || childName === "off") {
        dotsConfig[childName] = stripCoords(
          processNode2(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }))
        );
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
    const { flow, spacing } = extractLayoutSpacing(node);
    const radioGroupConfig = {
      name: componentName,
      type: "RadioGroup",
      elementsMargin: Math.round(spacing),
      flow
    };
    let onChild = null;
    let offChild = null;
    let totalChildCount = 0;
    node.children.forEach((child) => {
      const childName = child.name.toLowerCase();
      totalChildCount++;
      if (childName === "on" && !onChild || childName === "off" && !offChild) {
        const childConfig = stripCoords(
          processNode2(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }))
        );
        if ("width" in child && "height" in child) {
          childConfig.width = Math.round(child.width);
          childConfig.height = Math.round(child.height);
        }
        radioGroupConfig[childName] = childConfig;
        if (childName === "on") onChild = child;
        else offChild = child;
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
function adjustCheckBoxInstance(config, instanceNode) {
  const variantInfo = extractInstanceVariant(instanceNode);
  let stateValue;
  if (instanceNode.componentProperties) {
    for (const [key, value] of Object.entries(instanceNode.componentProperties)) {
      if (key.toLowerCase() === "state") {
        stateValue = value.value ?? value;
      }
    }
  }
  if (!stateValue && variantInfo.variant) {
    if (variantInfo.variant.includes("on")) {
      stateValue = "on";
    } else if (variantInfo.variant.includes("off")) {
      stateValue = "off";
    }
  }
  config.value = stateValue === "on";
}
function adjustRadioGroupInstance(config, instanceNode, mainComponentNode) {
  const scaleX = instanceNode.width / mainComponentNode.width;
  const scaleY = instanceNode.height / mainComponentNode.height;
  if (config.on && mainComponentNode.children) {
    const onChild = mainComponentNode.children.find((child) => child.name.toLowerCase() === "on");
    if (onChild) {
      config.on.width = Math.round(onChild.width * scaleX);
      config.on.height = Math.round(onChild.height * scaleY);
    }
  }
  if (config.off && mainComponentNode.children) {
    const offChild = mainComponentNode.children.find((child) => child.name.toLowerCase() === "off");
    if (offChild) {
      config.off.width = Math.round(offChild.width * scaleX);
      config.off.height = Math.round(offChild.height * scaleY);
    }
  }
  if (config.elementsMargin && mainComponentNode.itemSpacing !== void 0) {
    const avgScale = (scaleX + scaleY) / 2;
    config.elementsMargin = Math.round(config.elementsMargin * avgScale);
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
  return processFirstVariantOfSet(componentSet, context, processNode2, "ValueSlider", (variantConfig) => {
    return variantConfig.children ? { children: variantConfig.children } : {};
  });
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
function processButtonComponentSet(componentSet, context, processNode2) {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const views = {};
  let textValue;
  let textStyle;
  let hasStateVariants = false;
  componentSet.children.forEach((variant) => {
    if (variant.type !== "COMPONENT") return;
    try {
      const variantProps = extractVariantProps(variant);
      const stateValue = variantProps.state?.toLowerCase?.();
      if (stateValue && BUTTON_STATE_MAP.has(stateValue)) {
        hasStateVariants = true;
        const config = processNode2(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
        flattenButtonChildren(config);
        const viewKey = BUTTON_STATE_MAP.get(stateValue);
        if (config.image) {
          views[viewKey] = config.image;
        }
        if (stateValue === "default") {
          textValue = config.text;
          textStyle = config.textStyle;
        }
      }
    } catch (error) {
      console.warn(`Error processing button variant ${variant.name}:`, error);
    }
  });
  if (!hasStateVariants) {
    return processComponentVariantsSet(componentSet, context, processNode2);
  }
  const result = { name: componentName, type: "Button", views };
  if (textValue !== void 0) result.text = textValue;
  if (textStyle) result.textStyle = textStyle;
  return result;
}
function flattenButtonChildren(variantConfig) {
  if (variantConfig.componentProperties?.animation !== void 0) {
    const val = variantConfig.componentProperties.animation;
    if (val === true || val === "true") {
      variantConfig.animation = true;
    }
    delete variantConfig.componentProperties.animation;
    if (Object.keys(variantConfig.componentProperties).length === 0) {
      delete variantConfig.componentProperties;
    }
  }
  if (!variantConfig.children || variantConfig.children.length === 0) return;
  let imageChild = null;
  let textChild = null;
  for (const child of variantConfig.children) {
    if (child.type === "Text" && !textChild) {
      textChild = child;
    } else if (!imageChild) {
      imageChild = child;
    }
  }
  if (imageChild) {
    variantConfig.image = imageChild;
  }
  if (textChild) {
    variantConfig.text = textChild.text;
    if (textChild.style) {
      variantConfig.textStyle = textChild.style;
    }
  }
  delete variantConfig.children;
}
function processComponentVariantsSet(componentSet, context, processNode2) {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const cleanName = cleanNameFromSizeMarker(componentName);
  const typeDef = findComponentType(cleanName);
  const isScene = typeDef?.isScene === true;
  if (isScene) {
    return processSceneVariantsSet(componentSet, context, processNode2, typeDef);
  }
  return processComponentVariants(componentSet, context, processNode2, typeDef);
}
function processSceneVariantsSet(componentSet, context, processNode2, typeDef) {
  const componentName = componentSet.name;
  const modes = {};
  componentSet.children.forEach((variant) => {
    if (variant.type !== "COMPONENT") return;
    try {
      const variantProps = extractVariantProps(variant);
      const config = processNode2(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const { name, type, ...modeConfig } = config;
      const modeName = resolveModeName(variantProps, variant.name);
      typeDef?.postProcess?.(modeConfig);
      modes[modeName] = { type: type || "BaseContainer", ...modeConfig };
    } catch (error) {
      console.warn(`Error processing scene variant ${variant.name}:`, error);
    }
  });
  if (Object.keys(modes).length === 0) return null;
  return { name: componentName, type: "Scene", modes };
}
function resolveModeName(variantProps, componentName) {
  const supportedModes = ["default", "portrait", "landscape", "desktop"];
  for (const [key, value] of Object.entries(variantProps)) {
    const lowerKey = key.toLowerCase();
    const lowerValue = String(value).toLowerCase();
    if (lowerKey.includes("viewport") || lowerKey.includes("orientation") || lowerKey.includes("layout") || lowerKey.includes("mode")) {
      if (supportedModes.includes(lowerValue)) {
        return lowerValue;
      }
    }
    if (supportedModes.includes(lowerValue)) {
      return lowerValue;
    }
  }
  const lowerName = componentName.toLowerCase();
  for (const mode of supportedModes) {
    if (new RegExp(`\\b${mode}\\b`).test(lowerName)) {
      return mode;
    }
  }
  return "default";
}
function processComponentVariants(componentSet, context, processNode2, typeDef) {
  const componentName = componentSet.name;
  const configs = [];
  componentSet.children.forEach((variant) => {
    if (variant.type !== "COMPONENT") return;
    try {
      const variantProps = extractVariantProps(variant);
      const config = processNode2(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      configs.push({ config, variantProps, variantName: variant.name });
    } catch (error) {
      console.warn(`Error processing variant ${variant.name}:`, error);
    }
  });
  if (configs.length === 0) return null;
  let rootType;
  if (typeDef?.type) {
    rootType = typeDef.type;
  } else {
    const firstVariant = componentSet.children.find((child) => child.type === "COMPONENT");
    if (firstVariant && "layoutMode" in firstVariant && firstVariant.layoutMode && firstVariant.layoutMode !== "NONE") {
      rootType = "AutoLayout";
    } else {
      rootType = "SuperContainer";
    }
  }
  if (configs.length === 1) {
    const { config } = configs[0];
    const { name, type, ...variantConfig } = config;
    typeDef?.postProcess?.(variantConfig);
    return { name: componentName, type: rootType, ...variantConfig };
  }
  const variantKeys = configs.map(({ variantProps, variantName }) => {
    if (variantProps && Object.keys(variantProps).length > 0) {
      const values = Object.values(variantProps);
      if (values.length === 1) return String(values[0]);
      return Object.entries(variantProps).map(([k, v]) => `${k}=${v}`).join(",");
    }
    if (variantName) return String(variantName);
    return null;
  });
  const allHaveKeys = variantKeys.every((k) => k !== null);
  const allUnique = allHaveKeys && new Set(variantKeys).size === variantKeys.length;
  const variants = {};
  if (allHaveKeys && allUnique) {
    configs.forEach(({ config }, i) => {
      const { name, type, ...variantConfig } = config;
      typeDef?.postProcess?.(variantConfig);
      variants[variantKeys[i]] = variantConfig;
    });
  } else {
    variants.default = configs.map(({ config }) => {
      const { name, type, ...variantConfig } = config;
      typeDef?.postProcess?.(variantConfig);
      return variantConfig;
    });
  }
  return { name: componentName, type: rootType, variants };
}
function processDOMText(node, context, processNode2) {
  const componentName = node.name;
  try {
    let textNode = null;
    if (node.type === "TEXT") {
      textNode = node;
    } else if ("children" in node && node.children && node.children.length > 0) {
      textNode = node.children.find((child) => child.type === "TEXT") || null;
    }
    if (!textNode) {
      console.warn(`DOMText "${componentName}": no TEXT node found`);
      return null;
    }
    const { type: _, ...commonProps } = extractCommonProps(node, false, null);
    const textProps = extractTextProps(textNode);
    const domTextConfig = {
      name: componentName,
      type: "DOMText",
      ...commonProps,
      width: Math.round(node.width),
      height: Math.round(node.height),
      ...textProps
    };
    return domTextConfig;
  } catch (error) {
    console.warn(`Error processing DOMText component ${componentName}:`, error);
    return null;
  }
}
function postProcessSpine(config) {
  const cp = config.componentProperties;
  if (!cp) return;
  config.type = "SpineAnimation";
  const params = {};
  if (cp.spine) params.spine = cp.spine;
  if (cp.animation) params.animation = cp.animation;
  if (cp.autoPlay === true || cp.autoPlay === "true") params.autoPlay = true;
  if (cp.loop === true || cp.loop === "true") params.loop = true;
  if (cp.skin) params.skin = cp.skin;
  config.params = params;
  delete config.componentProperties;
  delete config.isInstance;
}
function processScrollBar(node, context, processNode2) {
  const componentName = node.name;
  if (!("children" in node) || !node.children || node.children.length === 0) return null;
  try {
    const config = { name: componentName, type: "ScrollBar" };
    const parentBounds = getContainerBounds(node);
    config.children = node.children.map(
      (child) => processNode2(child, withContext(context, { parentBounds, isRootLevel: false, parentZoneInfo: null }))
    );
    return config;
  } catch (error) {
    console.warn(`Error processing ScrollBar component ${componentName}:`, error);
    return null;
  }
}
function processReelsConfig(node, context, processNode2) {
  const componentName = node.name;
  if (!("children" in node) || !node.children || node.children.length === 0) return null;
  try {
    const reelsConfig = { name: componentName, type: "Reels" };
    let reelsContainer = null;
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
        reelsContainer = child;
      }
    });
    if (!reelsContainer) {
      reelsContainer = node;
    }
    const container = reelsContainer;
    if (!("children" in container) || !container.children || container.children.length === 0) {
      return reelsConfig;
    }
    const reelsX = container === node ? 0 : Math.round(container.x);
    const reelsY = container === node ? 0 : Math.round(container.y);
    const columnChildren = container.children.filter((child) => {
      const hasChildren = "children" in child && child.children && child.children.length > 0;
      const isContainer = child.type === "FRAME" || child.type === "INSTANCE" || child.type === "COMPONENT";
      return hasChildren && isContainer;
    }).sort((a, b) => a.x - b.x);
    if (columnChildren.length === 0) {
      return reelsConfig;
    }
    const firstColumn = columnChildren[0];
    const firstCell = firstColumn.children[0];
    const symbolWidth = Math.round(firstCell.width);
    const symbolHeight = Math.round(firstCell.height);
    const columns = columnChildren.map((col) => ({
      x: Math.round(col.x),
      rows: col.children.length,
      width: Math.round(col.width)
    }));
    reelsConfig.reels = {
      x: reelsX,
      y: reelsY,
      symbolWidth,
      symbolHeight,
      rows: columns[0].rows,
      columns
    };
    return reelsConfig;
  } catch (error) {
    console.warn(`Error processing ReelsConfig component ${componentName}:`, error);
    return null;
  }
}
var BUTTON_STATE_MAP;
var init_specialProcessors = __esm({
  "tools/figma/src/handlers/special/specialProcessors.ts"() {
    "use strict";
    init_extractors();
    init_componentRegistry();
    init_ProcessingContext();
    init_coordinateUtils();
    BUTTON_STATE_MAP = /* @__PURE__ */ new Map([
      ["default", "defaultView"],
      ["hover", "hoverView"],
      ["pressed", "pressedView"],
      ["disabled", "disabledView"]
    ]);
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
      match: "_ph",
      type: "BaseContainer",
      process: processPlaceholder
    });
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
      handleInstance: true,
      adjustInstance: adjustRadioGroupInstance
    });
    registerComponentType({
      match: "ReelsConfig",
      matchMode: "exact",
      type: "Reels",
      process: processReelsConfig,
      handleInstance: true
    });
    registerComponentType({
      match: "ValueSlider",
      type: "ValueSlider",
      process: processValueSlider,
      processSet: processValueSliderComponentSet,
      handleInstance: true
    });
    registerComponentType({
      match: "ScrollBar",
      type: "ScrollBar",
      process: processScrollBar,
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
      processSet: processToggleComponentSet,
      adjustInstance: adjustCheckBoxInstance
    });
    registerComponentType({
      match: "DOMText",
      type: "DOMText",
      process: processDOMText
    });
    registerComponentType({
      match: "Spine",
      matchMode: "exact",
      type: "SpineAnimation",
      postProcess: postProcessSpine
    });
    registerComponentType({
      match: "Scene",
      type: "Scene",
      isScene: true
    });
    registerComponentType({
      match: "Button",
      type: "Button",
      processSet: processButtonComponentSet,
      postProcess: flattenButtonChildren
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
  } else {
    const typeDef = node.type !== "INSTANCE" ? findComponentType(node.name) : null;
    if (typeDef) {
      componentType = typeDef.type;
    } else if (isRootLevel) {
      if (node.type === "TEXT") {
        componentType = NODE_TYPE_MAPPING["TEXT"];
      } else if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
        componentType = "AutoLayout";
      } else {
        componentType = "SuperContainer";
      }
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
    props.angle = Math.round(node.rotation * (180 / Math.PI) * 10) / 10;
    if (!isRootLevel) {
      const corrected = correctRotatedPosition(props.x, props.y, node);
      props.x = corrected.x;
      props.y = corrected.y;
    }
  }
  return props;
}
var init_commonExtractor = __esm({
  "tools/figma/src/extractors/commonExtractor.ts"() {
    "use strict";
    init_mixed();
    init_nodeUtils();
    init_componentRegistry();
    init_coordinateUtils();
  }
});

// tools/figma/src/extractors/positioningUtils.ts
function calculateTextPositioning(node) {
  if (node.type !== "TEXT" || !("constraints" in node) || !node.constraints) {
    return {};
  }
  const result = {};
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
function cleanFigmaKey(rawKey) {
  return rawKey.replace(/#\d+:\d+$/, "");
}
function extractVariantProps(node) {
  const variants = {};
  try {
    if (node.type === "COMPONENT" && "variantProperties" in node && node.variantProperties) {
      return node.variantProperties;
    }
    if (node.type === "COMPONENT" && node.parent && node.parent.type === "COMPONENT_SET") {
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
function extractComponentProps(node) {
  if (!node.componentProperties) return null;
  const props = {};
  for (const [key, value] of Object.entries(node.componentProperties)) {
    if (value?.type === "VARIANT") continue;
    props[cleanFigmaKey(key)] = value.value ?? value;
  }
  return Object.keys(props).length > 0 ? props : null;
}
function extractInstanceVariant(node) {
  const props = {};
  if (!node.componentProperties) return props;
  const variantProps = {};
  Object.entries(node.componentProperties).forEach(([key, value]) => {
    if (value.type === "VARIANT") {
      variantProps[key] = value.value ?? value;
    }
  });
  if (Object.keys(variantProps).length === 0) return props;
  const variantKeys = Object.keys(variantProps).sort();
  if (variantKeys.length === 1) {
    const value = variantProps[variantKeys[0]];
    if (value && String(value).toLowerCase() !== "default") {
      props.variant = String(value);
    }
  } else {
    props.variant = variantKeys.map((key) => `${key}=${variantProps[key]}`).join(",");
  }
  return props;
}
function extractPropertyDefinitions(node) {
  if (!("componentPropertyDefinitions" in node) || !node.componentPropertyDefinitions) return null;
  const result = {};
  for (const [rawKey, def] of Object.entries(node.componentPropertyDefinitions)) {
    const { type, defaultValue } = def;
    if (type !== "BOOLEAN" && type !== "TEXT") continue;
    const key = cleanFigmaKey(rawKey);
    result[key] = type === "BOOLEAN" ? defaultValue === true || defaultValue === "true" : String(defaultValue ?? "");
  }
  return Object.keys(result).length > 0 ? result : null;
}
function resolveVariantFromMainComponent(mainComponentNode) {
  const variantProps = mainComponentNode.variantProperties;
  if (variantProps && Object.keys(variantProps).length > 0) {
    const keys = Object.keys(variantProps).sort();
    if (keys.length === 1) {
      const value = variantProps[keys[0]];
      return value && String(value).toLowerCase() !== "default" ? String(value) : null;
    }
    if (keys.length > 1) {
      return keys.map((k) => `${k}=${variantProps[k]}`).join(",");
    }
  }
  if (mainComponentNode.name && !mainComponentNode.name.includes("=")) {
    return mainComponentNode.name;
  }
  return null;
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
            if (result._skipPosition) {
              delete result._skipPosition;
            } else {
              applyRelativePosition(result, node, context.parentBounds);
            }
          }
        } else if (node.type === "INSTANCE") {
          result = this.processInstance(node, context);
        } else {
          result = this.processBaseNode(node, context);
        }
        if (result && typeof result === "object" && Array.isArray(result.children) && result.children.length === 0) {
          delete result.children;
        }
        if (result) {
          const postTypeDef = findComponentType(result.type || "");
          postTypeDef?.postProcess?.(result);
        }
        return result;
      }
      processInstance(node, context) {
        let parentComponentInfo = { name: "Component", width: 0, height: 0, node: void 0 };
        if (node.mainComponentId && context.componentMap.has(node.mainComponentId)) {
          parentComponentInfo = context.componentMap.get(node.mainComponentId);
        }
        const mainComponentNode = parentComponentInfo.node;
        const instanceTypeDef = findComponentType(parentComponentInfo.name);
        if (instanceTypeDef?.handleInstance && instanceTypeDef.process && mainComponentNode) {
          const specialConfig = instanceTypeDef.process(
            mainComponentNode,
            withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }),
            (n, c) => this.process(n, c)
          );
          if (specialConfig) {
            specialConfig.name = cleanNameFromSizeMarker(node.name);
            applyRelativePosition(specialConfig, node, context.parentBounds);
            instanceTypeDef.adjustInstance?.(specialConfig, node, mainComponentNode);
            return specialConfig;
          }
        }
        const props = {
          name: cleanNameFromSizeMarker(node.name),
          type: parentComponentInfo.name,
          isInstance: true
        };
        applyRelativePosition(props, node, context.parentBounds);
        const commonProps = extractCommonProps(node, false, context.parentBounds);
        const { type: _, ...commonPropsWithoutType } = commonProps;
        Object.assign(props, {
          ...commonPropsWithoutType,
          x: props.x,
          y: props.y,
          type: props.type
        });
        const { origW, origH } = getUnrotatedDimensions(node);
        props.width = Math.round(origW);
        props.height = Math.round(origH);
        const scale = computeScale(props.width, props.height, parentComponentInfo.width, parentComponentInfo.height);
        if (scale !== void 0) props.scale = scale;
        const parentTypeDef = findComponentType(parentComponentInfo.name);
        if (parentTypeDef?.adjustInstance) {
          parentTypeDef.adjustInstance(props, node, mainComponentNode);
        } else {
          Object.assign(props, extractInstanceVariant(node));
        }
        const isComponentSetVariant = mainComponentNode && parentComponentInfo.name !== mainComponentNode.name;
        if (!props.variant && isComponentSetVariant && !parentTypeDef?.adjustInstance) {
          const resolvedVariant = resolveVariantFromMainComponent(mainComponentNode);
          if (resolvedVariant) {
            props.variant = resolvedVariant;
          }
        }
        const componentProps = extractComponentProps(node);
        if (componentProps) {
          props.componentProperties = componentProps;
        }
        return props;
      }
      processBaseNode(node, context) {
        const props = extractCommonProps(node, context.isRootLevel, context.parentBounds);
        switch (node.type) {
          case "FRAME":
            if (props.type === "AutoLayout") {
              Object.assign(props, extractAutoLayoutProps(node));
            }
            break;
          case "TEXT":
            Object.assign(props, extractTextProps(node));
            if (props.maxWidth) {
              props.type = "EngineText";
            }
            const textPos = calculateTextPositioning(node);
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
            break;
          case "RECTANGLE":
          case "ELLIPSE":
          case "VECTOR": {
            const style = {};
            Object.assign(style, extractFillProps(node));
            Object.assign(style, extractStrokeProps(node));
            if (node.type === "RECTANGLE") Object.assign(style, extractCornerProps(node));
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
        let shouldExportChildren;
        if (context.isRootLevel) {
          shouldExportChildren = true;
        } else {
          const containerTypes = ["GROUP", "FRAME"];
          const componentTypes = ["COMPONENT", "COMPONENT_SET", "INSTANCE"];
          shouldExportChildren = containerTypes.indexOf(node.type) !== -1 || componentTypes.indexOf(node.type) === -1;
        }
        if (node.children && node.children.length > 0 && shouldExportChildren) {
          const parentBounds = getContainerBounds(node);
          const zoneType = isSpecialZone(props.type);
          props.children = [];
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child.name === SKIP_NODE_NAME) continue;
            const zoneInfoForChild = zoneType ? getDirectZoneContext(props.type, node) : null;
            const childContext = withContext(context, {
              parentBounds,
              isRootLevel: false,
              parentZoneInfo: zoneInfoForChild
            });
            const childProps = this.process(child, childContext);
            if (zoneType && node.type === "FRAME") {
              const zoneProps = extractZoneChildProps(child, node);
              Object.assign(childProps, zoneProps);
              delete childProps.x;
              delete childProps.y;
            }
            props.children.push(childProps);
          }
        }
        if (node.type === "FRAME" && node.clipsContent && !context.isRootLevel) {
          const hasManualMask = props.children && props.children.some(
            (child) => child.name && child.name.toLowerCase() === "mask"
          );
          if (!hasManualMask) {
            if (!props.children) props.children = [];
            const maskStyle = { fill: "#ffffff" };
            if (typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
              maskStyle.cornerRadius = node.cornerRadius;
            }
            props.children.push({
              name: "mask",
              type: "Rectangle",
              x: 0,
              y: 0,
              width: Math.round(node.width),
              height: Math.round(node.height),
              style: maskStyle
            });
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
    init_extractors();
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
              let componentType;
              if (typeDef?.type) {
                componentType = typeDef.type;
              } else if (type === "Text" || type === "EngineText") {
                componentType = type;
              } else if ("layoutMode" in child && child.layoutMode && child.layoutMode !== "NONE") {
                componentType = "AutoLayout";
              } else {
                componentType = "SuperContainer";
              }
              typeDef?.postProcess?.(variantConfig);
              componentConfig = { name, type: componentType, ...variantConfig };
            }
            if (componentConfig) {
              delete componentConfig.x;
              delete componentConfig.y;
              if (child.type === "COMPONENT_SET") {
                const propDefs = extractPropertyDefinitions(child);
                if (propDefs) {
                  for (const [key, value] of Object.entries(propDefs)) {
                    if (!(key in componentConfig)) {
                      componentConfig[key] = value;
                    }
                  }
                }
                if (componentConfig.type === "Button" && !("animation" in componentConfig)) {
                  componentConfig.animation = true;
                }
              }
              components.push(componentConfig);
            }
          } catch (error) {
            console.warn(`Error processing component ${child.name}:`, error);
            this.onProgress && this.onProgress(`\u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u043C \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442 ${child.name} \u0438\u0437-\u0437\u0430 \u043E\u0448\u0438\u0431\u043A\u0438`);
          }
        }
        const scenesWithModes = components.filter((c) => c.modes);
        const componentsWithVariants = components.filter((c) => c.variants);
        const stats = {
          totalComponents: components.length,
          scenes: scenesWithModes.length,
          componentsWithVariants: componentsWithVariants.length,
          componentsFlat: components.length - scenesWithModes.length - componentsWithVariants.length
        };
        const modeStats = {};
        scenesWithModes.forEach((component) => {
          Object.keys(component.modes).forEach((key) => {
            modeStats[key] = (modeStats[key] || 0) + 1;
          });
        });
        const warnings = [];
        const variantComponentNames = new Set(
          components.filter((c) => c.variants || c.modes).map((c) => c.name)
        );
        function findNameCollisions(obj, path9) {
          if (!obj || typeof obj !== "object") return;
          if (Array.isArray(obj)) {
            obj.forEach((v, i) => findNameCollisions(v, `${path9}[${i}]`));
            return;
          }
          if (obj.isInstance && obj.type && variantComponentNames.has(obj.type)) {
            const parentComponent = path9.split(".")[0];
            if (parentComponent === obj.type) {
              warnings.push(
                `Name collision: "${path9}" has child instance type="${obj.type}" which matches the parent COMPONENT_SET name. LayoutBuilder may recursively build the wrong component. Consider renaming the child component in Figma.`
              );
            }
          }
          if (obj.children) {
            obj.children.forEach((child, i) => {
              findNameCollisions(child, `${path9}.children[${i}] "${child.name || ""}"`);
            });
          }
          if (obj.variants) {
            for (const [key, value] of Object.entries(obj.variants)) {
              findNameCollisions(value, `${path9}.variants.${key}`);
            }
          }
          if (obj.modes) {
            for (const [key, value] of Object.entries(obj.modes)) {
              findNameCollisions(value, `${path9}.modes.${key}`);
            }
          }
        }
        components.forEach((c) => findNameCollisions(c, c.name));
        if (warnings.length > 0) {
          console.warn("\n\u26A0\uFE0F  Export warnings:");
          warnings.forEach((w) => console.warn("  " + w));
        }
        return {
          components,
          metadata: {
            exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
            statistics: {
              ...stats,
              modesByName: Object.keys(modeStats).length > 0 ? modeStats : void 0
            },
            warnings: warnings.length > 0 ? warnings : void 0
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
async function run3(args) {
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
  await exportComponents(client, fileKey, outputDir);
  const isWatch = args.includes("--watch");
  if (!isWatch) return;
  const intervalArg = args.find((a) => a.startsWith("--interval="));
  const interval = intervalArg ? parseInt(intervalArg.split("=")[1], 10) : DEFAULT_POLL_INTERVAL;
  let lastModified = await client.getLastModified(fileKey);
  console.log(`
Watching Figma file for changes (every ${interval / 1e3}s)...`);
  console.log("Press Ctrl+C to stop.\n");
  setInterval(async () => {
    try {
      const current = await client.getLastModified(fileKey);
      if (current !== lastModified) {
        lastModified = current;
        console.log(`
Figma file changed (${(/* @__PURE__ */ new Date()).toLocaleTimeString()}), re-exporting...`);
        await exportComponents(client, fileKey, outputDir);
      }
    } catch (error) {
      console.error(`Poll error: ${error.message}`);
    }
  }, interval);
}
async function exportComponents(client, fileKey, outputDir) {
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
var DEFAULT_POLL_INTERVAL;
var init_export_components = __esm({
  "tools/figma/src/commands/export-components.ts"() {
    "use strict";
    init_FigmaAuth();
    init_FigmaClient();
    init_find_game_root();
    init_RestDocumentProvider();
    init_ExportPipeline();
    DEFAULT_POLL_INTERVAL = 5e3;
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

// tools/figma/src/spine/scanSpineAssets.ts
import fs6 from "fs";
import path6 from "path";
function readDirs(dir) {
  return fs6.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}
function collectAttachmentSizes(data) {
  const result = /* @__PURE__ */ new Map();
  const skins = data.skins;
  if (!skins) return result;
  const processSkinSlots = (slots) => {
    for (const [slotName, attachments] of Object.entries(slots)) {
      if (!result.has(slotName)) result.set(slotName, /* @__PURE__ */ new Map());
      const slotMap = result.get(slotName);
      for (const [attName, props] of Object.entries(attachments)) {
        if (props.width && props.height) {
          slotMap.set(attName, {
            width: props.width,
            height: props.height
          });
        }
      }
    }
  };
  if (Array.isArray(skins)) {
    for (const skin of skins) {
      if (skin.attachments) processSkinSlots(skin.attachments);
    }
  } else {
    for (const slots of Object.values(skins)) {
      processSkinSlots(slots);
    }
  }
  return result;
}
function getSlotDefaults(data) {
  const defaults = /* @__PURE__ */ new Map();
  if (!Array.isArray(data.slots)) return defaults;
  for (const slot of data.slots) {
    if (slot.attachment) {
      defaults.set(slot.name, slot.attachment);
    }
  }
  return defaults;
}
function getAnimationAttachments(animData, slotDefaults, allSlots) {
  const active = /* @__PURE__ */ new Set();
  for (const [slotName, attName] of slotDefaults) {
    if (allSlots.has(slotName) && allSlots.get(slotName).has(attName)) {
      active.add(`${slotName}:${attName}`);
    }
  }
  const animSlots = animData.slots;
  if (animSlots) {
    for (const [slotName, slotData] of Object.entries(animSlots)) {
      const attachKeyframes = slotData.attachment;
      if (Array.isArray(attachKeyframes)) {
        for (const kf of attachKeyframes) {
          if (kf.name && allSlots.has(slotName)) {
            const slotMap = allSlots.get(slotName);
            if (slotMap.has(kf.name)) {
              active.add(`${slotName}:${kf.name}`);
            }
          }
        }
      }
    }
  }
  return active;
}
function estimateAnimationSize(activeAttachments, allSlots, fallbackW, fallbackH) {
  let maxW = 0;
  let maxH = 0;
  for (const key of activeAttachments) {
    const [slotName, attName] = key.split(":");
    const size = allSlots.get(slotName)?.get(attName);
    if (size) {
      if (size.width > maxW) maxW = size.width;
      if (size.height > maxH) maxH = size.height;
    }
  }
  return {
    width: maxW > 0 ? Math.round(maxW) : fallbackW,
    height: maxH > 0 ? Math.round(maxH) : fallbackH
  };
}
function parseSpineJson(filePath) {
  try {
    const data = JSON.parse(fs6.readFileSync(filePath, "utf8"));
    const skeleton = data.skeleton || {};
    const skelWidth = Math.round(skeleton.width || 100);
    const skelHeight = Math.round(skeleton.height || 100);
    const skins = Array.isArray(data.skins) ? data.skins.map((s) => s.name || "default") : data.skins ? Object.keys(data.skins) : ["default"];
    const animNames = data.animations ? Object.keys(data.animations) : [];
    const attachmentSizes = collectAttachmentSizes(data);
    const slotDefaults = getSlotDefaults(data);
    const animations = animNames.map((name) => {
      const animData = data.animations[name];
      const activeAtts = getAnimationAttachments(animData, slotDefaults, attachmentSizes);
      const size = estimateAnimationSize(activeAtts, attachmentSizes, skelWidth, skelHeight);
      return { name, width: size.width, height: size.height };
    });
    return { width: skelWidth, height: skelHeight, animations, skins };
  } catch {
    return { width: 100, height: 100, animations: [], skins: ["default"] };
  }
}
function addSpineEntries(entries, bundleName, dirPath, files) {
  const skeletonFiles = files.filter(
    (f) => SPINE_SKELETON_EXTENSIONS.has(path6.extname(f).toLowerCase())
  );
  for (const skeletonFile of skeletonFiles) {
    const ext = path6.extname(skeletonFile);
    const alias = path6.basename(skeletonFile, ext);
    const isBinary = ext.toLowerCase() === ".skel";
    const fullPath = path6.join(dirPath, skeletonFile);
    if (isBinary) {
      entries.push({
        alias,
        bundle: bundleName,
        width: 100,
        height: 100,
        animations: [],
        skins: ["default"],
        defaultAnimation: "",
        isBinary: true
      });
    } else {
      const meta = parseSpineJson(fullPath);
      entries.push({
        alias,
        bundle: bundleName,
        width: meta.width,
        height: meta.height,
        animations: meta.animations,
        skins: meta.skins,
        defaultAnimation: meta.animations[0]?.name || ""
      });
    }
  }
}
function scanSpineAssets(assetsDir) {
  const spineDir = path6.join(assetsDir, "spine");
  const entries = [];
  if (!fs6.existsSync(spineDir)) {
    return { version: 1, spines: entries };
  }
  const bundleDirs = readDirs(spineDir);
  for (const bundleName of bundleDirs) {
    const bundlePath = path6.join(spineDir, bundleName);
    const bundleFiles = fs6.readdirSync(bundlePath, { withFileTypes: true });
    const looseFiles = bundleFiles.filter((f) => f.isFile()).map((f) => f.name);
    addSpineEntries(entries, bundleName, bundlePath, looseFiles);
    const subDirs = readDirs(bundlePath);
    for (const dir of subDirs) {
      const dirPath = path6.join(bundlePath, dir);
      const files = fs6.readdirSync(dirPath);
      addSpineEntries(entries, bundleName, dirPath, files);
    }
  }
  const aliasCounts = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    aliasCounts.set(entry.alias, (aliasCounts.get(entry.alias) || 0) + 1);
  }
  for (const entry of entries) {
    if ((aliasCounts.get(entry.alias) || 0) > 1) {
      entry.alias = `${entry.bundle}/${entry.alias}`;
    }
  }
  return { version: 1, spines: entries };
}
var SPINE_SKELETON_EXTENSIONS;
var init_scanSpineAssets = __esm({
  "tools/figma/src/spine/scanSpineAssets.ts"() {
    "use strict";
    SPINE_SKELETON_EXTENSIONS = /* @__PURE__ */ new Set([".json", ".skel"]);
  }
});

// tools/figma/src/commands/generate-spine.ts
var generate_spine_exports = {};
__export(generate_spine_exports, {
  run: () => run6
});
import fs7 from "fs";
import path7 from "path";
async function run6(args) {
  const gameRoot2 = findGameRoot();
  const assetsDir = path7.join(gameRoot2, "assets");
  if (!fs7.existsSync(assetsDir)) {
    console.error(`Assets directory not found: ${assetsDir}`);
    process.exit(1);
  }
  console.log(`Scanning Spine assets in ${assetsDir}/spine/...`);
  const manifest = scanSpineAssets(assetsDir);
  let outputPath;
  for (const arg of args) {
    const match = arg.match(/^--output=(.+)$/);
    if (match) outputPath = match[1];
  }
  if (!outputPath) {
    const outputDir = path7.join(gameRoot2, "output");
    if (!fs7.existsSync(outputDir)) {
      fs7.mkdirSync(outputDir, { recursive: true });
    }
    outputPath = path7.join(outputDir, "spine-manifest.json");
  }
  fs7.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  const total = manifest.spines.length;
  const binaryCount = manifest.spines.filter((s) => s.isBinary).length;
  const totalAnimations = manifest.spines.reduce((sum, s) => sum + s.animations.length, 0);
  const bundles = [...new Set(manifest.spines.map((s) => s.bundle))];
  console.log(`
Found ${total} spine skeleton(s) in ${bundles.length} bundle(s): ${bundles.join(", ")}`);
  console.log(`Total animations: ${totalAnimations}`);
  if (binaryCount > 0) {
    console.log(`Binary (.skel) skeletons without metadata: ${binaryCount}`);
  }
  console.log(`
Manifest saved to: ${outputPath}`);
}
var init_generate_spine = __esm({
  "tools/figma/src/commands/generate-spine.ts"() {
    "use strict";
    init_find_game_root();
    init_scanSpineAssets();
  }
});

// tools/figma/src/cli.ts
init_find_game_root();
import dotenv from "dotenv";
import path8 from "path";
var gameRoot = findGameRoot();
dotenv.config({ path: path8.join(gameRoot, ".env") });
var COMMANDS = {
  "export-images": () => Promise.resolve().then(() => (init_export_images(), export_images_exports)),
  "export-fonts": () => Promise.resolve().then(() => (init_export_fonts(), export_fonts_exports)),
  "export-components": () => Promise.resolve().then(() => (init_export_components(), export_components_exports)),
  "oauth-setup": () => Promise.resolve().then(() => (init_oauth_setup(), oauth_setup_exports)),
  "oauth-check": () => Promise.resolve().then(() => (init_oauth_check(), oauth_check_exports)),
  "generate-spine": () => Promise.resolve().then(() => (init_generate_spine(), generate_spine_exports))
};
function showHelp() {
  console.log("onearm-figma - Figma tools for onearm engine\n");
  console.log("Usage: onearm-figma <command> [options]\n");
  console.log("Commands:");
  console.log("  export-images      Export images from Figma");
  console.log("  export-fonts       Export font styles from Figma");
  console.log("  export-components  Export component layouts from Figma");
  console.log("                     --watch          Poll Figma for changes and re-export");
  console.log("                     --interval=N     Poll interval in ms (default: 5000)");
  console.log("  oauth-setup        Setup OAuth authorization");
  console.log("  oauth-check        Check OAuth configuration");
  console.log("  generate-spine     Generate Spine manifest for Figma plugin");
  console.log("                     --output=PATH    Output file path (default: output/spine-manifest.json)");
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
