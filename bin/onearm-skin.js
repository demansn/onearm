#!/usr/bin/env node
import path from "path";
import { fileURLToPath } from "url";
import { packSkin, validateSkinName } from "../scripts/skin/index.js";
import { findGameRoot } from "../scripts/utils/find-game-root.js";

const [, , subcommand, skinArg] = process.argv;

if (subcommand !== "pack" || !skinArg) {
    console.error("Usage: onearm-skin pack <skin>");
    console.error("  pack default    — pack the default skin from assets/");
    console.error("  pack halloween  — pack an overlay skin from skins/halloween/");
    process.exit(1);
}

const gameRoot = process.env.GAME_ROOT ?? findGameRoot();

try {
    validateSkinName(skinArg);
    await packSkin(gameRoot, skinArg);
} catch (err) {
    console.error(`[onearm-skin] Failed: ${err.message}`);
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
}
