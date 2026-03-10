/** Toolbar height detection tolerance (px) */
const TOOLBAR_TOLERANCE = 50;
/** Extra height added to body to create scrollable area (px) */
const SCROLL_PADDING = 200;
/** Delay for entry check after swipe — toolbar animation takes ~300-600ms */
const ENTRY_CHECK_DELAY = 600;
/** Delay for monitoring check after resize — debounce rotation events */
const MONITOR_CHECK_DELAY = 300;
/** Height growth threshold to detect fullscreen entry (px) */
const FULLSCREEN_THRESHOLD = 20;

/**
 * ScrollFullscreen — fallback для iOS Safari без Fullscreen API.
 *
 * Lifecycle:
 *   show()  → overlay + scrollable body → user swipes → toolbar hides
 *   hide()  → overlay скрыт, scroll заблокирован, toolbar остаётся скрыт
 *             + мониторинг: если toolbar вернулся (rotation) → auto-exit
 *   exit()  → body восстановлен, scrollTo(0) → toolbar возвращается → можно снова show()
 *   destroy() → полный cleanup
 */
export class ScrollFullscreen {
    constructor(onStateChange) {
        this._onStateChange = onStateChange;
        this._isFullscreen = false;
        this._hintEl = null;
        this._visible = false;
        this._heightWhenShown = 0;
        this._checkTimer = null;
        this._monitorTimer = null;
        this._origStyles = null;
        this._cachedVh = 0;
        this._cachedOrientation = null;

        this._onViewportChange = this._onViewportChange.bind(this);
        this._onHintTap = this._onHintTap.bind(this);
        this._onMonitorResize = this._onMonitorResize.bind(this);

        this._createHint();
    }

    get isFullscreen() {
        return this._isFullscreen;
    }

    show() {
        if (this._visible) return;

        // Полный сброс перед началом нового цикла
        this._isFullscreen = false;
        this._stopMonitoring();
        clearTimeout(this._checkTimer);
        this._removeListeners(this._onViewportChange);

        this._visible = true;
        this._heightWhenShown = window.innerHeight;
        this._orientationWhenShown = this._getOrientation();
        this._enableScroll();
        this._hintEl.style.display = "flex";
        this._addListeners(this._onViewportChange);
    }

    /**
     * Скрыть hint overlay после входа в fullscreen.
     * Запускает мониторинг — если toolbar вернётся (rotation), auto-exit.
     */
    hide() {
        this._detach();
        this._lockScroll();
        this._fullscreenOrientation = this._getOrientation();
        this._startMonitoring();
    }

    /**
     * Выход из fullscreen: восстанавливает body/html, сбрасывает состояние.
     */
    exit() {
        this._detach();
        this._stopMonitoring();
        this._restoreScroll();
        this._isFullscreen = false;
        this._heightWhenShown = 0;
    }

    checkFullscreen() {
        if (!this._heightWhenShown) return false;
        return window.innerHeight > this._heightWhenShown + FULLSCREEN_THRESHOLD;
    }

    destroy() {
        this.exit();
        if (this._hintEl) {
            this._hintEl.removeEventListener("pointerup", this._onHintTap);
            this._hintEl.parentNode?.removeChild(this._hintEl);
            this._hintEl = null;
        }
    }

    // --- Listener helpers ---

    _addListeners(handler) {
        window.addEventListener("resize", handler);
        window.visualViewport?.addEventListener("resize", handler);
    }

    _removeListeners(handler) {
        window.removeEventListener("resize", handler);
        window.visualViewport?.removeEventListener("resize", handler);
    }

    /**
     * Общий teardown: скрыть hint, остановить таймеры, снять viewport listeners.
     */
    _detach() {
        if (!this._visible) return;
        this._visible = false;
        clearTimeout(this._checkTimer);
        this._hintEl.style.display = "none";
        this._removeListeners(this._onViewportChange);
    }

    // --- Fullscreen loss monitoring ---

    _startMonitoring() {
        this._addListeners(this._onMonitorResize);
    }

    _stopMonitoring() {
        clearTimeout(this._monitorTimer);
        this._removeListeners(this._onMonitorResize);
    }

    _onMonitorResize() {
        clearTimeout(this._monitorTimer);
        this._monitorTimer = setTimeout(() => this._checkFullscreenLost(), MONITOR_CHECK_DELAY);
    }

    _checkFullscreenLost() {
        if (!this._isFullscreen) return;

        // Смена ориентации всегда ломает scroll-fullscreen —
        // Safari показывает toolbar при повороте.
        const orientationChanged = this._getOrientation() !== this._fullscreenOrientation;

        if (orientationChanged || !this._isToolbarHidden()) {
            // Полный cleanup — аналог exit() но без _detach() (уже detached)
            this._isFullscreen = false;
            this._heightWhenShown = 0;
            clearTimeout(this._checkTimer);
            this._stopMonitoring();
            this._restoreScroll();
            this._onStateChange(false);
        }
    }

    _isToolbarHidden() {
        return window.innerHeight >= this._measureViewportHeight() - TOOLBAR_TOLERANCE;
    }

    // --- Scroll control ---

    _enableScroll() {
        if (!this._origStyles) {
            this._origStyles = {
                htmlHeight: document.documentElement.style.height,
                htmlOverflow: document.documentElement.style.overflowY,
                bodyHeight: document.body.style.height,
                bodyOverflow: document.body.style.overflowY,
                bodyWebkit: document.body.style.webkitOverflowScrolling,
            };
        }
        const h = window.innerHeight + SCROLL_PADDING + "px";
        document.documentElement.style.height = h;
        document.documentElement.style.overflowY = "scroll";
        document.body.style.height = h;
        document.body.style.overflowY = "scroll";
        document.body.style.webkitOverflowScrolling = "touch";
    }

    _lockScroll() {
        document.documentElement.style.overflowY = "hidden";
        document.body.style.overflowY = "hidden";
        document.body.style.webkitOverflowScrolling = "";
    }

    _restoreScroll() {
        if (!this._origStyles) return;
        const s = this._origStyles;
        document.documentElement.style.height = s.htmlHeight;
        document.documentElement.style.overflowY = s.htmlOverflow;
        document.body.style.height = s.bodyHeight;
        document.body.style.overflowY = s.bodyOverflow;
        document.body.style.webkitOverflowScrolling = s.bodyWebkit;
        window.scrollTo(0, 0);
        this._origStyles = null;
    }

    /**
     * Измеряет 100vh — максимальную высоту viewport без toolbar.
     * Кеширует по ориентации (100vh не меняется при show/hide toolbar).
     */
    _measureViewportHeight() {
        const orientation = screen.orientation?.angle ?? window.orientation ?? 0;
        if (this._cachedVh && this._cachedOrientation === orientation) {
            return this._cachedVh;
        }
        const div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;height:100vh;pointer-events:none;visibility:hidden;";
        document.body.appendChild(div);
        this._cachedVh = div.clientHeight;
        document.body.removeChild(div);
        this._cachedOrientation = orientation;
        return this._cachedVh;
    }

    // --- UI ---

    _createHint() {
        this._hintEl = document.createElement("div");
        this._hintEl.id = "ios-fullscreen-hint";
        this._hintEl.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999999;
            -webkit-transform: translate3d(0, 0, 0);
            cursor: pointer;
        `;

        this._hintEl.innerHTML = `
            <div style="text-align: center; color: white; font-family: -apple-system, sans-serif; pointer-events: none;">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"/>
                </svg>
                <div style="font-size: 16px; margin-top: 8px; opacity: 0.9;">Swipe for full screen</div>
            </div>
        `;

        this._hintEl.addEventListener("pointerup", this._onHintTap);
        document.body.appendChild(this._hintEl);
    }

    // --- Event handlers ---

    _onHintTap(e) {
        e.preventDefault();
        window.scrollBy(0, 1);
        this._scheduleCheck();
    }

    _onViewportChange() {
        // При смене ориентации пока overlay виден — обновляем baseline.
        // Иначе portrait innerHeight >> landscape _heightWhenShown → ложный fullscreen.
        const orientation = this._getOrientation();
        if (this._orientationWhenShown !== orientation) {
            this._orientationWhenShown = orientation;
            this._heightWhenShown = window.innerHeight;
            this._enableScroll();
        }
        this._scheduleCheck();
    }

    _scheduleCheck() {
        clearTimeout(this._checkTimer);
        this._checkTimer = setTimeout(() => this._tryTransition(), ENTRY_CHECK_DELAY);
    }

    _getOrientation() {
        return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }

    _tryTransition() {
        if (!this._visible) return false;
        const isFs = this.checkFullscreen();
        if (isFs && !this._isFullscreen) {
            this._isFullscreen = true;
            this.hide();
            this._onStateChange(true);
            return true;
        }
        return false;
    }
}
