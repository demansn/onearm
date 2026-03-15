import * as PIXI from "pixi.js";
import { Spine, SpineDebugRenderer } from "@esotericsoftware/spine-pixi-v8";
import { Select, CheckBox, Slider, List } from "@pixi/ui";

const PANEL_WIDTH = 280;
const PANEL_PADDING = 16;
const ITEM_HEIGHT = 36;
const BG_COLOR = 0x1a1a2e;
const PANEL_BG = 0x16213e;
const ACCENT_COLOR = 0x0f3460;
const HOVER_COLOR = 0x533483;
const TEXT_STYLE = { fill: 0xffffff, fontSize: 14, fontFamily: "Arial, sans-serif" };
const LABEL_STYLE = { fill: 0x9aa4b2, fontSize: 12, fontFamily: "Arial, sans-serif" };

function findSpineAssets(manifest) {
    const bundles = new Set();
    const skeletons = [];

    for (const bundle of manifest.bundles) {
        for (const asset of bundle.assets) {
            const aliases = Array.isArray(asset.alias) ? asset.alias : [asset.alias];
            for (const alias of aliases) {
                if (alias.endsWith("Data")) {
                    bundles.add(bundle.name);
                    skeletons.push(alias.slice(0, -4)); // remove "Data"
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

function createSelectBG(width, height, color) {
    const g = new PIXI.Graphics();
    g.roundRect(0, 0, width, height, 6);
    g.fill(color);
    return g;
}

function createLabel(text) {
    return new PIXI.Text({ text, style: LABEL_STYLE });
}

function createSelect(items, width = PANEL_WIDTH - PANEL_PADDING * 2) {
    const select = new Select({
        closedBG: createSelectBG(width, ITEM_HEIGHT, ACCENT_COLOR),
        openBG: createSelectBG(width, ITEM_HEIGHT, HOVER_COLOR),
        textStyle: TEXT_STYLE,
        items: {
            items,
            backgroundColor: ACCENT_COLOR,
            hoverColor: HOVER_COLOR,
            width,
            height: ITEM_HEIGHT,
            textStyle: TEXT_STYLE,
        },
        scrollBox: {
            width,
            height: Math.min(300, items.length * ITEM_HEIGHT + 10),
            radius: 8,
        },
    });

    return select;
}

function updateSelectItems(select, newItems, width = PANEL_WIDTH - PANEL_PADDING * 2) {
    // Remove existing items from end
    for (let i = 999; i >= 0; i--) {
        try { select.removeItem(i); } catch { break; }
    }
    // Add new items as SelectItemsOptions
    if (newItems.length > 0) {
        select.addItems({
            items: newItems,
            backgroundColor: ACCENT_COLOR,
            hoverColor: HOVER_COLOR,
            width,
            height: ITEM_HEIGHT,
            textStyle: TEXT_STYLE,
        });
    }
}

export async function spinePreviewFlow(scope, ctx) {
    const { app, resources, resizeSystem } = ctx;
    const manifest = resources.manifest;

    const root = new PIXI.Container();
    root.label = "spinePreview";
    app.root.addChild(root);
    scope.defer(() => root.destroy({ children: true }));

    // Background
    const bg = new PIXI.Graphics();
    root.addChild(bg);

    // Spine container (behind panel)
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

    // --- UI Panel ---
    const panel = new PIXI.Container();
    panel.label = "uiPanel";
    root.addChild(panel);

    const panelBG = new PIXI.Graphics();
    panel.addChild(panelBG);

    const listContainer = new PIXI.Container();
    listContainer.sortableChildren = true;
    listContainer.x = PANEL_PADDING;
    listContainer.y = PANEL_PADDING;
    panel.addChild(listContainer);

    // Title
    const title = new PIXI.Text({
        text: "Spine Previewer",
        style: { fill: 0xffffff, fontSize: 20, fontFamily: "Arial, sans-serif", fontWeight: "bold" },
    });

    // Skeleton select (highest zIndex — its dropdown must cover everything below)
    const skeletonLabel = createLabel("Skeleton");
    const skeletonSelect = createSelect(skeletons);
    skeletonSelect.zIndex = 30;

    // Animation select
    const animLabel = createLabel("Animation");
    const animSelect = createSelect(["—"]);
    animSelect.zIndex = 20;

    // Skin select
    const skinLabel = createLabel("Skin");
    const skinSelect = createSelect(["default"]);
    skinSelect.zIndex = 10;

    // Loop checkbox
    const loopLabel = createLabel("Loop");
    const loopCheckBG = new PIXI.Graphics().roundRect(0, 0, 24, 24, 4).fill(ACCENT_COLOR);
    const loopCheckFill = new PIXI.Graphics().roundRect(4, 4, 16, 16, 2).fill(0xe94560);
    const loopCheck = new CheckBox({
        style: {
            unchecked: loopCheckBG,
            checked: loopCheckFill,
        },
        checked: true,
    });
    const loopRow = new PIXI.Container();
    loopRow.addChild(loopLabel);
    loopCheck.x = 50;
    loopCheck.y = -2;
    loopRow.addChild(loopCheck);

    // Speed slider
    const speedLabel = createLabel("Speed: 1.0x");
    const sliderBG = new PIXI.Graphics().roundRect(0, 0, PANEL_WIDTH - PANEL_PADDING * 2, 20, 10).fill(ACCENT_COLOR);
    const sliderFill = new PIXI.Graphics().roundRect(0, 0, PANEL_WIDTH - PANEL_PADDING * 2, 20, 10).fill(0xe94560);
    const sliderHandle = new PIXI.Graphics().circle(0, 0, 10).fill(0xffffff);
    const speedSlider = new Slider({
        bg: sliderBG,
        fill: sliderFill,
        slider: sliderHandle,
        min: 10,
        max: 300,
        value: 100,
        step: 10,
    });

    // --- Debug section ---
    function createCheckRow(label, checked = false) {
        const row = new PIXI.Container();
        const bg = new PIXI.Graphics().roundRect(0, 0, 24, 24, 4).fill(ACCENT_COLOR);
        const fill = new PIXI.Graphics().roundRect(4, 4, 16, 16, 2).fill(0xe94560);
        const cb = new CheckBox({ style: { unchecked: bg, checked: fill }, checked });
        const txt = createLabel(label);
        txt.x = 32;
        txt.y = 4;
        row.addChild(cb);
        row.addChild(txt);
        return { row, cb };
    }

    const debugToggle = createCheckRow("Debug");
    debugToggle.row.children[1].style.fontSize = 16;
    debugToggle.row.children[1].style.fill = 0xffffff;

    const debugBones = createCheckRow("Bones");
    const debugSlots = createCheckRow("Slots");
    const debugMesh = createCheckRow("Mesh");
    const debugBounds = createCheckRow("Bounding Boxes");
    const debugPaths = createCheckRow("Paths");
    const debugClipping = createCheckRow("Clipping");
    const debugEvents = createCheckRow("Events");

    // Info label
    const infoLabel = createLabel("");

    // Layout items vertically
    const items = [
        title, skeletonLabel, skeletonSelect, animLabel, animSelect, skinLabel, skinSelect,
        loopRow, speedLabel, speedSlider,
        debugToggle.row,
        debugBones.row, debugSlots.row, debugMesh.row, debugBounds.row, debugPaths.row, debugClipping.row, debugEvents.row,
        infoLabel,
    ];
    let yOffset = 0;
    for (const item of items) {
        item.y = yOffset;
        listContainer.addChild(item);
        yOffset += (item.height || ITEM_HEIGHT) + 8;
    }

    // --- State ---
    let currentSpine = null;
    let currentAnimName = "";
    let isLoop = true;

    const debugRenderer = new SpineDebugRenderer();
    let debugMasterOn = false;

    function applyDebug() {
        if (!currentSpine) return;
        currentSpine.debug = debugMasterOn ? debugRenderer : null;
    }

    function syncRendererFromCheckboxes() {
        debugRenderer.drawBones = debugBones.cb.checked;
        debugRenderer.drawRegionAttachments = debugSlots.cb.checked;
        debugRenderer.drawMeshTriangles = debugMesh.cb.checked;
        debugRenderer.drawMeshHull = debugMesh.cb.checked;
        debugRenderer.drawBoundingBoxes = debugBounds.cb.checked;
        debugRenderer.drawPaths = debugPaths.cb.checked;
        debugRenderer.drawClipping = debugClipping.cb.checked;
        debugRenderer.drawEvents = debugEvents.cb.checked;
    }

    // Master toggle — turns debug on/off, enables all sub-options on first enable
    debugToggle.cb.onChange.connect((checked) => {
        debugMasterOn = checked;
        if (checked && !debugBones.cb.checked && !debugSlots.cb.checked) {
            // First time on — enable bones + slots by default
            debugBones.cb.forceCheck(true);
            debugSlots.cb.forceCheck(true);
            syncRendererFromCheckboxes();
        }
        applyDebug();
    });

    // Sub-checkboxes fine-tune what's drawn (only effective when master is on)
    const debugCheckboxes = [
        [debugBones, "drawBones"],
        [debugSlots, "drawRegionAttachments"],
        [debugMesh, "drawMeshTriangles"],
        [debugBounds, "drawBoundingBoxes"],
        [debugPaths, "drawPaths"],
        [debugClipping, "drawClipping"],
        [debugEvents, "drawEvents"],
    ];

    for (const [ctrl, key] of debugCheckboxes) {
        ctrl.cb.onChange.connect((checked) => {
            debugRenderer[key] = checked;
            if (key === "drawMeshTriangles") debugRenderer.drawMeshHull = checked;
            // Auto-enable master if a sub-option is checked
            if (checked && !debugMasterOn) {
                debugMasterOn = true;
                debugToggle.cb.forceCheck(true);
            }
            applyDebug();
        });
    }

    syncRendererFromCheckboxes();

    function playAnimation(name, loop) {
        if (!currentSpine || !name || name === "—") return;
        currentAnimName = name;
        isLoop = loop;
        currentSpine.state.setAnimation(0, name, loop);

        const anim = currentSpine.skeleton.data.findAnimation(name);
        if (anim) {
            infoLabel.text = `Duration: ${anim.duration.toFixed(2)}s`;
        }
    }

    function loadSkeleton(name) {
        // Remove old
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
            infoLabel.text = `Error: ${e.message}`;
            return;
        }

        spineContainer.addChild(currentSpine);

        // Check spine version compatibility
        const spineVersion = currentSpine.skeleton.data.version;
        if (spineVersion && !spineVersion.startsWith("4.")) {
            infoLabel.text = `⚠ Spine ${spineVersion} — incompatible (need 4.x)`;
        }

        // Skins — set first skin immediately so attachments are visible
        const skins = currentSpine.skeleton.data.skins.map((s) => s.name);
        updateSelectItems(skinSelect, skins);

        if (skins.length > 0) {
            currentSpine.skeleton.setSkinByName(skins[0]);
            currentSpine.skeleton.setSlotsToSetupPose();
        }

        // Animations
        const animations = currentSpine.skeleton.data.animations.map((a) => a.name);
        updateSelectItems(animSelect, animations);

        // Fit to screen
        const context = resizeSystem.getContext();
        if (context) {
            const { width, height } = context.resolution;
            centerAndFit(currentSpine, width, height, PANEL_WIDTH);
        }

        // Restore debug state
        applyDebug();

        // Play first animation
        if (animations.length > 0) {
            playAnimation(animations[0], isLoop);
        }

        infoLabel.text = `${animations.length} animations, ${skins.length} skins`;
    }

    // --- Event handlers ---
    skeletonSelect.onSelect.connect((_idx, text) => {
        loadSkeleton(text);
    });

    animSelect.onSelect.connect((_idx, text) => {
        playAnimation(text, isLoop);
    });

    skinSelect.onSelect.connect((_idx, text) => {
        if (!currentSpine) return;
        currentSpine.skeleton.setSkinByName(text);
        currentSpine.skeleton.setSlotsToSetupPose();
    });

    loopCheck.onChange.connect((checked) => {
        isLoop = checked;
        if (currentAnimName) {
            playAnimation(currentAnimName, isLoop);
        }
    });

    speedSlider.onUpdate.connect((value) => {
        const speed = value / 100;
        speedLabel.text = `Speed: ${speed.toFixed(1)}x`;
        if (currentSpine) {
            currentSpine.state.timeScale = speed;
        }
    });

    // --- Resize ---
    root.onScreenResize = (context) => {
        if (!context) return;
        const { width, height } = context.resolution;

        bg.clear().rect(0, 0, width, height).fill(BG_COLOR);

        // Panel background
        const panelH = Math.min(yOffset + PANEL_PADDING * 2, height);
        panelBG.clear().rect(0, 0, PANEL_WIDTH, panelH).fill({ color: PANEL_BG, alpha: 0.95 });

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
