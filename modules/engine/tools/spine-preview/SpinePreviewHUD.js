import { Signal } from "typed-signals";
import { HTMLScene } from "../../services/sceneManager/HTMLScene.js";

const PANEL_WIDTH = 280;

const CSS = `
[data-scene="SpinePreviewHUD"] .sp-panel {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: ${PANEL_WIDTH}px;
    background: rgba(22, 33, 62, 0.95);
    color: #fff;
    font-family: Arial, sans-serif;
    font-size: 13px;
    overflow-y: auto;
    padding: 16px;
    box-sizing: border-box;
    pointer-events: auto;
}
[data-scene="SpinePreviewHUD"] .sp-panel h3 {
    margin: 0 0 12px; font-size: 18px;
}
[data-scene="SpinePreviewHUD"] .sp-panel h4 {
    margin: 14px 0 6px; font-size: 14px; color: #9aa4b2;
}
[data-scene="SpinePreviewHUD"] .sp-panel label {
    display: block; margin: 8px 0 4px; color: #9aa4b2; font-size: 12px;
}
[data-scene="SpinePreviewHUD"] .sp-panel select {
    width: 100%; padding: 6px 8px; border: none; border-radius: 6px;
    background: #0f3460; color: #fff; font-size: 13px; cursor: pointer;
    outline: none;
}
[data-scene="SpinePreviewHUD"] .sp-panel select:hover {
    background: #533483;
}
[data-scene="SpinePreviewHUD"] .sp-panel .sp-row {
    display: flex; align-items: center; gap: 8px; margin: 8px 0;
}
[data-scene="SpinePreviewHUD"] .sp-panel .sp-row label {
    margin: 0; flex-shrink: 0; min-width: 40px;
}
[data-scene="SpinePreviewHUD"] .sp-panel input[type="checkbox"] {
    width: 18px; height: 18px; accent-color: #e94560; cursor: pointer;
}
[data-scene="SpinePreviewHUD"] .sp-panel input[type="range"] {
    width: 100%; accent-color: #e94560; cursor: pointer;
}
[data-scene="SpinePreviewHUD"] .sp-panel .sp-debug-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;
}
[data-scene="SpinePreviewHUD"] .sp-panel .sp-debug-grid .sp-row {
    margin: 2px 0;
}
[data-scene="SpinePreviewHUD"] .sp-panel .sp-info {
    margin-top: 12px; color: #9aa4b2; font-size: 12px;
}
`;

export class SpinePreviewHUD extends HTMLScene {
    create() {
        this.onSkeletonSelect = new Signal();
        this.onAnimationSelect = new Signal();
        this.onSkinSelect = new Signal();
        this.onLoopChange = new Signal();
        this.onSpeedChange = new Signal();
        this.onDebugChange = new Signal();

        // Inject styles
        this._style = document.createElement("style");
        this._style.textContent = CSS;
        document.head.appendChild(this._style);

        // Build panel
        const panel = document.createElement("div");
        panel.className = "sp-panel";

        panel.innerHTML = `
            <h3>Spine Previewer</h3>

            <label>Skeleton</label>
            <select data-id="skeleton"></select>

            <label>Animation</label>
            <select data-id="animation"></select>

            <label>Skin</label>
            <select data-id="skin"></select>

            <div class="sp-row">
                <label>Loop</label>
                <input type="checkbox" data-id="loop" checked>
            </div>

            <div class="sp-row">
                <label data-id="speed-label">Speed: 1.0x</label>
            </div>
            <input type="range" data-id="speed" min="1" max="30" value="10" step="1">

            <h4>Debug</h4>
            <div class="sp-row">
                <input type="checkbox" data-id="debug-master">
                <label>Debug</label>
            </div>
            <div class="sp-debug-grid">
                <div class="sp-row"><input type="checkbox" data-id="debug-bones"><label>Bones</label></div>
                <div class="sp-row"><input type="checkbox" data-id="debug-slots"><label>Slots</label></div>
                <div class="sp-row"><input type="checkbox" data-id="debug-mesh"><label>Mesh</label></div>
                <div class="sp-row"><input type="checkbox" data-id="debug-bounds"><label>Bounds</label></div>
                <div class="sp-row"><input type="checkbox" data-id="debug-paths"><label>Paths</label></div>
                <div class="sp-row"><input type="checkbox" data-id="debug-clipping"><label>Clipping</label></div>
                <div class="sp-row"><input type="checkbox" data-id="debug-events"><label>Events</label></div>
            </div>

            <div class="sp-info" data-id="info"></div>
        `;

        this.root.appendChild(panel);

        // Cache elements
        this._el = {};
        panel.querySelectorAll("[data-id]").forEach(el => {
            this._el[el.dataset.id] = el;
        });

        // Wire events
        this._el.skeleton.addEventListener("change", () => {
            this.onSkeletonSelect.emit(this._el.skeleton.value);
        });

        this._el.animation.addEventListener("change", () => {
            this.onAnimationSelect.emit(this._el.animation.value);
        });

        this._el.skin.addEventListener("change", () => {
            this.onSkinSelect.emit(this._el.skin.value);
        });

        this._el.loop.addEventListener("change", () => {
            this.onLoopChange.emit(this._el.loop.checked);
        });

        this._el.speed.addEventListener("input", () => {
            const speed = this._el.speed.value / 10;
            this._el["speed-label"].textContent = `Speed: ${speed.toFixed(1)}x`;
            this.onSpeedChange.emit(speed);
        });

        // Debug — master toggle
        this._el["debug-master"].addEventListener("change", () => {
            const checked = this._el["debug-master"].checked;
            if (checked) {
                // First enable — turn on bones + slots by default if nothing is checked
                const anyChecked = ["bones", "slots", "mesh", "bounds", "paths", "clipping", "events"]
                    .some(k => this._el[`debug-${k}`].checked);
                if (!anyChecked) {
                    this._el["debug-bones"].checked = true;
                    this._el["debug-slots"].checked = true;
                }
            }
            this._emitDebug();
        });

        // Debug — sub-checkboxes
        for (const key of ["bones", "slots", "mesh", "bounds", "paths", "clipping", "events"]) {
            this._el[`debug-${key}`].addEventListener("change", () => {
                // Auto-enable master if a sub-option is checked
                if (this._el[`debug-${key}`].checked && !this._el["debug-master"].checked) {
                    this._el["debug-master"].checked = true;
                }
                this._emitDebug();
            });
        }
    }

    _emitDebug() {
        this.onDebugChange.emit({
            master: this._el["debug-master"].checked,
            bones: this._el["debug-bones"].checked,
            slots: this._el["debug-slots"].checked,
            mesh: this._el["debug-mesh"].checked,
            bounds: this._el["debug-bounds"].checked,
            paths: this._el["debug-paths"].checked,
            clipping: this._el["debug-clipping"].checked,
            events: this._el["debug-events"].checked,
        });
    }

    setSkeletons(names) {
        this._setOptions(this._el.skeleton, names);
    }

    setAnimations(names) {
        this._setOptions(this._el.animation, names);
    }

    setSkins(names) {
        this._setOptions(this._el.skin, names);
    }

    setInfo(text) {
        this._el.info.textContent = text;
    }

    _setOptions(select, items) {
        select.innerHTML = "";
        for (const item of items) {
            const opt = document.createElement("option");
            opt.value = item;
            opt.textContent = item;
            select.appendChild(opt);
        }
    }

    destroy() {
        this._style?.remove();
        super.destroy();
    }
}

SpinePreviewHUD.PANEL_WIDTH = PANEL_WIDTH;
