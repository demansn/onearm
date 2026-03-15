export class HTMLScene {
    constructor({ name, services, ...options }) {
        this.label = name || this.constructor.name;
        this.services = services;
        this.visible = false;

        // Root DOM element — appended to .canvas-box
        this.root = document.createElement("div");
        this.root.style.cssText = "position:absolute;inset:0;pointer-events:none;display:none;";
        this.root.dataset.scene = this.label;

        const canvasBox = document.querySelector(".canvas-box");
        if (canvasBox) canvasBox.appendChild(this.root);

        // Resize support
        const resizeSystem = typeof services.get === "function"
            ? services.get("resizeSystem") : services.resizeSystem;
        if (resizeSystem) {
            this._resizeUnsub = resizeSystem.onResize((ctx) => this.onResize(ctx));
        }

        this.create(options);
    }

    create(options) {}

    onResize(context) {}

    show() {
        this.visible = true;
        this.root.style.display = "";
    }

    hide() {
        this.visible = false;
        this.root.style.display = "none";
    }

    destroy() {
        if (this._resizeUnsub) this._resizeUnsub();
        this.root?.remove();
        this.root = null;
    }
}
