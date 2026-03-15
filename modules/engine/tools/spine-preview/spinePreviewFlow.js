import * as PIXI from "pixi.js";
import { Spine, SpineDebugRenderer } from "@esotericsoftware/spine-pixi-v8";
import { SpinePreviewHUD } from "./SpinePreviewHUD.js";

const BG_COLOR = 0x1a1a2e;

function findSpineAssets(manifest) {
    const bundles = new Set();
    const skeletons = [];

    for (const bundle of manifest.bundles) {
        for (const asset of bundle.assets) {
            const aliases = Array.isArray(asset.alias) ? asset.alias : [asset.alias];
            for (const alias of aliases) {
                if (alias.endsWith("Data")) {
                    bundles.add(bundle.name);
                    skeletons.push(alias.slice(0, -4));
                }
            }
        }
    }

    return { bundles: [...bundles], skeletons };
}

function centerAndFit(spine, width, height, panelWidth) {
    const bounds = spine.getBounds();
    if (bounds.width === 0 || bounds.height === 0) return;

    const availW = width - panelWidth;
    const availH = height;
    const targetW = availW * 0.8;
    const targetH = availH * 0.8;

    const scale = Math.min(targetW / bounds.width, targetH / bounds.height, 2);
    spine.scale.set(scale);

    spine.x = panelWidth + availW / 2;
    spine.y = availH / 2;
}

export async function spinePreviewFlow(scope, ctx) {
    const { app, resources, resizeSystem } = ctx;
    const manifest = resources.manifest;
    const PANEL_WIDTH = SpinePreviewHUD.PANEL_WIDTH;

    const root = new PIXI.Container();
    root.label = "spinePreview";
    app.root.addChild(root);
    scope.defer(() => root.destroy({ children: true }));

    // Background
    const bg = new PIXI.Graphics();
    root.addChild(bg);

    // Spine container
    const spineContainer = new PIXI.Container();
    spineContainer.label = "spineContainer";
    root.addChild(spineContainer);

    // Find spine assets
    const { bundles, skeletons } = findSpineAssets(manifest);

    if (skeletons.length === 0) {
        const msg = new PIXI.Text({
            text: "No spine assets found in manifest",
            style: { fill: 0xff6666, fontSize: 24, fontFamily: "Arial, sans-serif" },
        });
        msg.anchor.set(0.5);
        root.addChild(msg);

        root.onScreenResize = (context) => {
            if (!context) return;
            const { width, height } = context.resolution;
            bg.clear().rect(0, 0, width, height).fill(BG_COLOR);
            msg.position.set(width / 2, height / 2);
        };
        root.onScreenResize(resizeSystem.getContext());
        await new Promise(() => {});
        return;
    }

    // Load all spine bundles
    for (const bundleName of bundles) {
        await resources.load(bundleName);
    }

    // --- HUD (HTML panel) ---
    const hud = new SpinePreviewHUD({ name: "SpinePreviewHUD", services: ctx });
    scope.defer(() => hud.destroy());
    hud.setSkeletons(skeletons);
    hud.show();

    // --- State ---
    let currentSpine = null;
    let currentAnimName = "";
    let isLoop = true;

    const debugRenderer = new SpineDebugRenderer();

    function applyDebug(flags) {
        if (!currentSpine) return;
        if (!flags.master) {
            currentSpine.debug = null;
            return;
        }
        debugRenderer.drawBones = flags.bones;
        debugRenderer.drawRegionAttachments = flags.slots;
        debugRenderer.drawMeshTriangles = flags.mesh;
        debugRenderer.drawMeshHull = flags.mesh;
        debugRenderer.drawBoundingBoxes = flags.bounds;
        debugRenderer.drawPaths = flags.paths;
        debugRenderer.drawClipping = flags.clipping;
        debugRenderer.drawEvents = flags.events;
        currentSpine.debug = debugRenderer;
    }

    let lastDebugFlags = { master: false, bones: false, slots: false, mesh: false, bounds: false, paths: false, clipping: false, events: false };

    function playAnimation(name, loop) {
        if (!currentSpine || !name) return;
        currentAnimName = name;
        isLoop = loop;
        currentSpine.state.setAnimation(0, name, loop);

        const anim = currentSpine.skeleton.data.findAnimation(name);
        if (anim) {
            hud.setInfo(`Duration: ${anim.duration.toFixed(2)}s`);
        }
    }

    function loadSkeleton(name) {
        if (currentSpine) {
            spineContainer.removeChild(currentSpine);
            currentSpine.destroy();
            currentSpine = null;
        }

        try {
            currentSpine = Spine.from({
                skeleton: `${name}Data`,
                atlas: `${name}Atlas`,
                autoUpdate: true,
            });
        } catch (e) {
            hud.setInfo(`Error: ${e.message}`);
            return;
        }

        spineContainer.addChild(currentSpine);

        // Check spine version compatibility
        const spineVersion = currentSpine.skeleton.data.version;
        if (spineVersion && !spineVersion.startsWith("4.")) {
            hud.setInfo(`⚠ Spine ${spineVersion} — incompatible (need 4.x)`);
        }

        // Skins
        const skins = currentSpine.skeleton.data.skins.map((s) => s.name);
        hud.setSkins(skins);

        if (skins.length > 0) {
            currentSpine.skeleton.setSkinByName(skins[0]);
            currentSpine.skeleton.setSlotsToSetupPose();
        }

        // Animations
        const animations = currentSpine.skeleton.data.animations.map((a) => a.name);
        hud.setAnimations(animations);

        // Fit to screen
        const context = resizeSystem.getContext();
        if (context) {
            const { width, height } = context.resolution;
            centerAndFit(currentSpine, width, height, PANEL_WIDTH);
        }

        // Restore debug state
        applyDebug(lastDebugFlags);

        // Play first animation
        if (animations.length > 0) {
            playAnimation(animations[0], isLoop);
        }

        hud.setInfo(`${animations.length} animations, ${skins.length} skins`);
    }

    // --- Wire HUD signals ---
    hud.onSkeletonSelect.connect((name) => {
        loadSkeleton(name);
    });

    hud.onAnimationSelect.connect((name) => {
        playAnimation(name, isLoop);
    });

    hud.onSkinSelect.connect((name) => {
        if (!currentSpine) return;
        currentSpine.skeleton.setSkinByName(name);
        currentSpine.skeleton.setSlotsToSetupPose();
    });

    hud.onLoopChange.connect((checked) => {
        isLoop = checked;
        if (currentAnimName) {
            playAnimation(currentAnimName, isLoop);
        }
    });

    hud.onSpeedChange.connect((speed) => {
        if (currentSpine) {
            currentSpine.state.timeScale = speed;
        }
    });

    hud.onDebugChange.connect((flags) => {
        lastDebugFlags = flags;
        applyDebug(flags);
    });

    // --- Resize ---
    root.onScreenResize = (context) => {
        if (!context) return;
        const { width, height } = context.resolution;

        bg.clear().rect(0, 0, width, height).fill(BG_COLOR);

        if (currentSpine) {
            centerAndFit(currentSpine, width, height, PANEL_WIDTH);
        }
    };

    root.onScreenResize(resizeSystem.getContext());

    // Auto-select first skeleton
    if (skeletons.length > 0) {
        loadSkeleton(skeletons[0]);
    }

    // Keep alive
    await new Promise(() => {});
}
