import { Signal } from "typed-signals";
import { Service } from "./Service.js";
import { detectiOS } from "./fullscreen/detectiOS.js";
import { ScrollFullscreen } from "./fullscreen/ScrollFullscreen.js";

/**
 * FullscreenService — единый API для fullscreen с iOS fallback.
 *
 * Стратегия:
 * 1. Native Fullscreen API (iOS 26+, Android, Desktop)
 * 2. Scroll-to-hide (iOS Safari < 26, без Fullscreen API)
 * 3. Не поддерживается (Chrome на iOS, iframe, и т.д.)
 *
 * API:
 * - isFullscreen: boolean
 * - isSupported: boolean
 * - enterFullscreen() / exitFullscreen() / toggleFullscreen()
 * - onFullscreenChange: Signal<boolean>
 */
export class FullscreenService extends Service {
    constructor(params) {
        super(params);

        this.isFullscreen = false;
        this.onFullscreenChange = new Signal();

        this._ios = detectiOS();
        this._scrollFullscreen = null;
        this._mode = this._detectMode();

        this._handleFullscreenChange = this._handleFullscreenChange.bind(this);

        if (this._mode === "native") {
            this._addNativeListeners();
        } else if (this._mode === "scroll") {
            this._scrollFullscreen = new ScrollFullscreen((isFs) => {
                this._setFullscreenState(isFs);
            });
        }
    }

    _detectMode() {
        if (this._ios.hasFullscreenAPI) return "native";
        if (this._ios.isIOS && this._ios.isSafari && !this._ios.isInIframe) return "scroll";
        return "none";
    }

    get isSupported() {
        return this._mode !== "none";
    }

    async enterFullscreen() {
        if (this.isFullscreen) return;

        if (this._mode === "native") {
            await this._enterNative();
        } else if (this._mode === "scroll") {
            this._scrollFullscreen.show();
        }
    }

    async exitFullscreen() {
        if (!this.isFullscreen) return;

        if (this._mode === "native") {
            await this._exitNative();
        } else if (this._mode === "scroll") {
            this._scrollFullscreen.exit();
            this._setFullscreenState(false);
        }
    }

    async toggleFullscreen() {
        if (this.isFullscreen) {
            await this.exitFullscreen();
        } else {
            await this.enterFullscreen();
        }
    }

    destroy() {
        this._removeNativeListeners();

        if (this._scrollFullscreen) {
            this._scrollFullscreen.destroy();
            this._scrollFullscreen = null;
        }

        this.onFullscreenChange.disconnectAll();
    }

    // --- Native Fullscreen API ---

    _addNativeListeners() {
        document.addEventListener("fullscreenchange", this._handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", this._handleFullscreenChange);
    }

    _removeNativeListeners() {
        document.removeEventListener("fullscreenchange", this._handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", this._handleFullscreenChange);
    }

    _handleFullscreenChange() {
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement || document.webkitFullscreenElement
        );
        this._setFullscreenState(isCurrentlyFullscreen);
    }

    async _enterNative() {
        const el = document.documentElement;
        try {
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                await el.webkitRequestFullscreen();
            }
        } catch (error) {
            console.warn("FullscreenService: failed to enter fullscreen:", error);
        }
    }

    async _exitNative() {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            }
        } catch (error) {
            console.warn("FullscreenService: failed to exit fullscreen:", error);
        }
    }

    _setFullscreenState(isFs) {
        if (this.isFullscreen === isFs) return;
        this.isFullscreen = isFs;
        this.onFullscreenChange.emit(isFs);
    }
}
