import { Container } from "pixi.js";
import { getEngineContext } from "../core/EngineContext.js";

const STYLE_MAP = {
    fontFamily: "font-family",
    fontSize: "font-size",
    fontWeight: "font-weight",
    lineHeight: "line-height",
    align: "text-align",
    fill: "color",
};

const PX_PROPS = new Set(["font-size", "line-height"]);

function applyCSS(element, style) {
    for (const [key, value] of Object.entries(style)) {
        const cssProp = STYLE_MAP[key];
        if (!cssProp) continue;

        if (cssProp === "color") {
            element.style[cssProp] = typeof value === "number"
                ? `#${value.toString(16).padStart(6, "0")}`
                : value;
        } else if (PX_PROPS.has(cssProp)) {
            element.style[cssProp] = `${value}px`;
        } else {
            element.style[cssProp] = value;
        }
    }
}

/**
 * DOM-based text element. Uses a real HTML div for selectable/copyable text.
 *
 * Mimics DOMPipe's postrender approach for positioning and visibility,
 * but places the div directly in .canvas-box (skips CanvasObserver
 * which has a double-offset bug when canvas is inside a positioned container).
 */
export class DOMText extends Container {
    _configWidth = 0;
    _configHeight = 0;

    constructor(config = {}) {
        super();

        const { text, style, width, height } = config;

        this._div = document.createElement("div");
        this._div.style.position = "absolute";
        this._div.style.left = "0";
        this._div.style.top = "0";
        this._div.style.transformOrigin = "0 0";
        this._div.style.pointerEvents = "auto";
        this._div.style.userSelect = "text";
        this._div.style.cursor = "text";
        this._div.style.overflow = "hidden";
        this._div.style.display = "none";

        this._configWidth = width || 0;
        this._configHeight = height || 0;

        if (width) this._div.style.width = `${width}px`;
        if (height) this._div.style.height = `${height}px`;

        if (style) {
            applyCSS(this._div, style);
            if (style.wordWrap) {
                this._div.style.wordWrap = "break-word";
                this._div.style.overflowWrap = "break-word";
            }
        }

        if (text != null) {
            this._div.textContent = text;
        }

        this._lastTransform = "";

        // Hook into renderer postrender — same mechanism as DOMPipe
        const { services } = getEngineContext();
        this._renderer = services.get("app").renderer;
        this._renderer.runners.postrender.add(this);
    }

    get text() {
        return this._div.textContent;
    }

    set text(value) {
        this._div.textContent = value;
    }

    get width() {
        return this._configWidth;
    }

    set width(value) {
        this._configWidth = value;
        if (this._div) this._div.style.width = `${value}px`;
    }

    get height() {
        return this._configHeight;
    }

    set height(value) {
        this._configHeight = value;
        if (this._div) this._div.style.height = `${value}px`;
    }

    updateStyle(style) {
        applyCSS(this._div, style);
    }

    /**
     * Called by renderer.runners.postrender after every render.
     * Runs regardless of this container's visibility — same pattern as DOMPipe.
     */
    postrender() {
        if (!this._div) return;

        // Visibility check — same as DOMPipe: globalDisplayStatus 7 = fully visible
        if (!this.parent || this.globalDisplayStatus < 7) {
            if (this._div.style.display !== "none") {
                this._div.style.display = "none";
            }
            return;
        }

        // Attach to canvas-box on first visible frame
        if (!this._div.parentNode) {
            const canvasBox = document.querySelector(".canvas-box");
            if (canvasBox) {
                canvasBox.appendChild(this._div);
            } else {
                return;
            }
        }

        // worldTransform is in CSS pixels (autoDensity:true),
        // relative to canvas origin = canvas-box origin
        const wt = this.worldTransform;
        const newTransform = `matrix(${wt.a}, ${wt.b}, ${wt.c}, ${wt.d}, ${wt.tx}, ${wt.ty})`;

        if (newTransform !== this._lastTransform) {
            this._div.style.transform = newTransform;
            this._lastTransform = newTransform;
        }

        if (this._div.style.display === "none") {
            this._div.style.display = "";
        }

        this._div.style.opacity = this.groupAlpha.toString();
    }

    destroy(options) {
        if (this._renderer) {
            this._renderer.runners.postrender.remove(this);
            this._renderer = null;
        }
        this._div?.remove();
        this._div = null;
        super.destroy(options);
    }
}
