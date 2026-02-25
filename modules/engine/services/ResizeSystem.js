import { Signal } from "typed-signals";
import { Service } from "./Service.js";

/**
 * ResizeSystem — адаптивное масштабирование PIXI.js игры под любой размер экрана.
 *
 * ## Три зоны — "без чёрных полос"
 *
 * Система решает задачу: сохранить aspect ratio игрового контента,
 * при этом заполнить весь экран без чёрных полос. Для этого вычисляются три
 * вложенные зоны (все координаты — в stage-пространстве):
 *
 * ```
 * Широкий экран (21:9):                 Узкий экран (4:3):
 * ┌─────────────────────────────┐       ┌──────────────────┐
 * │ fullScreen                  │       │ fullScreen       │
 * │  ┌───────────────────┐      │       │ ┌──────────────┐ │
 * │  │ game              │      │       │ │ game         │ │
 * │  │  ┌─────────────┐  │      │       │ │ ┌──────────┐ │ │
 * │  │  │ safe        │  │      │       │ │ │ safe     │ │ │
 * │  │  └─────────────┘  │      │       │ │ └──────────┘ │ │
 * │  └───────────────────┘      │       │ │              │ │
 * │  фон тянется →  нет полос   │       │ └──────────────┘ │
 * └─────────────────────────────┘       └──────────────────┘
 * ```
 *
 * - **fullScreen** — границы реального окна браузера, пересчитанные в stage-координаты.
 *   Используется для фонов и декоративных элементов, которые заполняют весь экран
 *   (FullScreenBackgroundFill, BottomPanelBackground). Именно за счёт этой зоны
 *   исчезают чёрные полосы: контент рисуется за пределами game-зоны.
 *
 * - **game** — видимая часть stage в пределах resolution (например 1920×1080).
 *   Пересечение resolution-прямоугольника с видимой областью экрана.
 *   Основная зона для игрового контента (барабаны, символы, панели).
 *   На идеальном aspect ratio совпадает с resolution.
 *
 * - **safe** — гарантированно видимая область на любом aspect ratio.
 *   Центрирована внутри game-зоны с фиксированными margins.
 *   Критический UI (кнопка спина, баланс, ставки) размещается здесь.
 *   Дизайнер проектирует игру под safe zone — всё что внутри, видно всегда.
 *
 * ## Режимы экрана
 *
 * - **DESKTOP** — десктопный браузер. Контейнер центрируется с сохранением aspect ratio.
 * - **LANDSCAPE** — мобильное устройство, альбомная ориентация. Контейнер на весь экран.
 * - **PORTRAIT** — мобильное устройство, портретная ориентация. Контейнер на весь экран.
 *
 * Режим определяется автоматически: десктоп всегда DESKTOP,
 * мобильные переключаются по ориентации.
 *
 * ## CSS-стратегии контейнера
 *
 * Контейнер (.canvas-box) управляется по-разному в зависимости от среды:
 * - Mobile: position:fixed, 100%×100% — полноэкранный
 * - Iframe: position:fixed, 100vw×100vh — заполняет iframe
 * - Desktop: position:fixed, вычисленные размеры с центрированием
 *   и сохранением aspect ratio resolution
 *
 * ## Конфигурация
 *
 * Статические constants (MODES, RESOLUTIONS, SAFE_AREAS) — defaults.
 * Переопределяются через options в конструкторе:
 * ```js
 * {
 *     options: {
 *         resolutions: { desktop: { width: 1920, height: 1080 }, ... },
 *         safeAreas: { desktop: { width: 1720, height: 880 }, ... },
 *     }
 * }
 * ```
 *
 * ## Context (результат расчёта)
 *
 * ```js
 * {
 *     mode: "desktop" | "landscape" | "portrait",
 *     scale: number,           // масштаб stage
 *     screen: { width, height },    // размеры окна браузера (CSS px)
 *     resolution: { width, height }, // целевое разрешение для текущего mode
 *     zone: {
 *         fullScreen: { left, top, right, bottom, width, height, center },
 *         game:       { left, top, right, bottom, width, height, center },
 *         safe:       { left, top, right, bottom, width, height, center },
 *     }
 * }
 * ```
 *
 * ## Подписка на изменения
 *
 * - `onResized` (Signal) — emit при каждом resize
 * - `onResize(callback)` — подписка через callback, возвращает unsubscribe
 * - `onScreenResize(context)` — метод на display objects, вызывается рекурсивно по дереву
 *
 * ## Update flow
 *
 * ```
 * window resize / ResizeObserver
 *   → _scheduleUpdate() (debounce 16ms)
 *     → _update()
 *       1. _applyContainerLayout() — CSS-позиционирование контейнера
 *       2. getBoundingClientRect()  — реальные размеры контейнера
 *       3. renderer.resize()        — обновление размера canvas
 *       4. _calculateContext()       — расчёт scale и трёх зон
 *       5. _applyStage()            — масштаб и позиция PIXI stage
 *       6. _notifyCallbacks()       — оповещение подписчиков
 * ```
 */
export class ResizeSystem extends Service {
    static MODES = {
        PORTRAIT: "portrait",
        LANDSCAPE: "landscape",
        DESKTOP: "desktop",
    };

    /** Целевые разрешения stage для каждого режима (в game-координатах) */
    static RESOLUTIONS = {
        [ResizeSystem.MODES.PORTRAIT]: { width: 1080, height: 1920 },
        [ResizeSystem.MODES.LANDSCAPE]: { width: 1920, height: 1080 },
        [ResizeSystem.MODES.DESKTOP]: { width: 1920, height: 1080 },
    };

    /** Размеры safe zone для каждого режима (центрируется внутри game zone) */
    static SAFE_AREAS = {
        [ResizeSystem.MODES.PORTRAIT]: { width: 1080 - 100, height: 1920 - 100 },
        [ResizeSystem.MODES.LANDSCAPE]: { width: 1920 - 100, height: 1080 - 100 },
        [ResizeSystem.MODES.DESKTOP]: { width: 1920 - 200, height: 1080 - 200 },
    };

    constructor({ gameConfig, services, name, options = {} }) {
        super({ gameConfig, services, name, options });

        this._modes = options.modes ?? ResizeSystem.MODES;
        this._resolutions = options.resolutions ?? ResizeSystem.RESOLUTIONS;
        this._safeAreas = options.safeAreas ?? ResizeSystem.SAFE_AREAS;

        this._renderer = null;
        this._stage = null;
        this._canvas = null;
        this._resizeObserver = null;
        this._throttleTimer = null;
        this._context = {};
        this._callbacks = new Set();
        this.onResized = new Signal();
    }

    getResolution() {
        return this._context.resolution;
    }

    async init() {
        this.app = this.services.get("app");
        if (!this.app) {
            throw new Error("ResizeSystem: app service не найден");
        }

        this._renderer = this.app.renderer;
        this._stage = this.app.stage;
        this._canvas = this._renderer.canvas;
        this._canvasBox = document.querySelector(".canvas-box");

        if (!this._renderer || !this._stage || !this._canvas) {
            throw new Error("ResizeSystem: не удалось получить renderer, stage или canvas");
        }

        if (!this._canvasBox) {
            console.warn(
                "ResizeSystem: canvas-box контейнер не найден, будет использоваться прямое управление canvas",
            );
        }

        this._update();
        this._initObservers();
    }

    /**
     * Подключает ResizeObserver на контейнер и window resize как fallback.
     * Оба источника вызывают debounced _update().
     */
    _initObservers() {
        const target = this._canvasBox || this._canvas.parentElement;

        if (target && typeof ResizeObserver !== "undefined") {
            this._resizeObserver = new ResizeObserver(() => {
                this._scheduleUpdate();
            });
            this._resizeObserver.observe(target);
        }

        this._onResizeBound = () => this._scheduleUpdate();
        window.addEventListener("resize", this._onResizeBound);
    }

    /** Debounce ~16ms — не более одного пересчёта за кадр */
    _scheduleUpdate() {
        if (this._throttleTimer) return;
        this._throttleTimer = setTimeout(() => {
            this._throttleTimer = null;
            this._update();
        }, 16);
    }

    /** Возвращает shallow copy текущего context */
    getContext() {
        return { ...this._context };
    }

    /** Подписка на resize. Возвращает функцию отписки. */
    onResize(callback) {
        this._callbacks.add(callback);
        return () => this._callbacks.delete(callback);
    }

    /** Принудительный пересчёт (игнорирует debounce, но не игнорирует early return) */
    update() {
        this._update();
    }

    step() {
        // Resize обрабатывается через ResizeObserver / window resize event
    }

    /**
     * Единый update flow — от определения размеров до нотификации подписчиков.
     * Early return если размеры окна и mode не изменились.
     */
    _update() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const { screen = { width: 0, height: 0 } } = this._context || {};
        const mode = this.getScreenMode({ width: windowWidth, height: windowHeight });
        const isUnchanged =
            screen.width === windowWidth && screen.height === windowHeight && this._context.mode === mode;

        if (isUnchanged) {
            return;
        }

        this._applyContainerLayout(mode, windowWidth, windowHeight);

        const container = this._canvasBox || this._canvas;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        this._renderer.resize(containerWidth, containerHeight);
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.style.left = "0";
        this._canvas.style.top = "0";

        this._calculateContext(mode, windowWidth, windowHeight, containerWidth, containerHeight);
        this._applyStage(containerWidth, containerHeight);
        this._notifyCallbacks();
    }

    // ── CSS-стратегии контейнера ──────────────────────────────────────

    /** Выбирает CSS-стратегию по среде: mobile / iframe / desktop */
    _applyContainerLayout(mode, screenWidth, screenHeight) {
        if (this.app.isMobileDevice) {
            this._applyMobileLayout();
        } else if (window.self !== window.top) {
            this._applyIframeLayout();
        } else {
            this._applyDesktopLayout(mode, screenWidth, screenHeight);
        }
    }

    /** Mobile: контейнер занимает весь экран */
    _applyMobileLayout() {
        if (!this._canvasBox) return;
        this._canvasBox.style.width = "100%";
        this._canvasBox.style.height = "100%";
        this._canvasBox.style.left = "0";
        this._canvasBox.style.top = "0";
        this._canvasBox.style.position = "fixed";
    }

    /** Iframe: контейнер заполняет весь viewport */
    _applyIframeLayout() {
        if (!this._canvasBox) return;
        this._canvasBox.style.width = "100vw";
        this._canvasBox.style.height = "100vh";
        this._canvasBox.style.left = "0";
        this._canvasBox.style.top = "0";
        this._canvasBox.style.position = "fixed";
    }

    /**
     * Desktop: контейнер центрирован с сохранением aspect ratio resolution.
     * Логика object-fit:contain — вписываем resolution в экран.
     */
    _applyDesktopLayout(mode, screenWidth, screenHeight) {
        if (!this._canvasBox) return;
        this._canvasBox.style.position = "fixed";

        const resolution = this._resolutions[mode];
        const containerScale = Math.min(screenWidth / resolution.width, screenHeight / resolution.height);
        const gameWidth = resolution.width * containerScale;
        const gameHeight = resolution.height * containerScale;
        const offsetX = (screenWidth - gameWidth) / 2;
        const offsetY = (screenHeight - gameHeight) / 2;

        this._canvasBox.style.width = `${gameWidth}px`;
        this._canvasBox.style.height = `${gameHeight}px`;
        this._canvasBox.style.left = `${offsetX}px`;
        this._canvasBox.style.top = `${offsetY}px`;
    }

    // ── Расчёт context и зон ──────────────────────────────────────────

    /**
     * Рассчитывает scale и три зоны, записывает в this._context.
     * Чистый расчёт — без побочных эффектов на DOM или PIXI.
     */
    _calculateContext(mode, windowWidth, windowHeight, containerWidth, containerHeight) {
        const resolution = this._resolutions[mode];
        const safeArea = this._safeAreas[mode];

        const scale = Math.min(
            containerWidth / resolution.width,
            containerHeight / resolution.height,
        );

        const fullScreen = this.getFullScreenArea(containerWidth, containerHeight, resolution, scale);
        const game = this.getGameArea(containerWidth, containerHeight, resolution, scale);
        const safe = this.getSafeArea(containerWidth, containerHeight, resolution, safeArea, scale);

        this._context = {
            mode,
            zone: {
                fullScreen,
                game,
                safe,
            },
            screen: {
                width: windowWidth,
                height: windowHeight,
            },
            resolution: {
                width: resolution.width,
                height: resolution.height,
            },
            scale,
        };
    }

    /** Применяет масштаб и центрирование к PIXI stage */
    _applyStage(containerWidth, containerHeight) {
        const { resolution, scale } = this._context;

        this._stage.scale.set(scale);

        const stageX = (containerWidth - resolution.width * scale) / 2;
        const stageY = (containerHeight - resolution.height * scale) / 2;
        this._stage.position.set(stageX, stageY);
    }

    // ── Определение режима ────────────────────────────────────────────

    /**
     * Определяет режим экрана.
     * Desktop → всегда DESKTOP. Mobile → LANDSCAPE/PORTRAIT по ориентации.
     */
    getScreenMode(size) {
        if (!this.app.isMobileDevice) {
            return this._modes.DESKTOP;
        } else {
            return size.width >= size.height
                ? this._modes.LANDSCAPE
                : this._modes.PORTRAIT;
        }
    }

    // ── Расчёт зон (все координаты в stage-пространстве) ─────────────

    /**
     * fullScreen — вся видимая область окна в stage-координатах.
     * Может быть шире/выше resolution. Используется для фонов,
     * заполняющих весь экран (нет чёрных полос).
     */
    getFullScreenArea(windowWidth, windowHeight, resolution, scale) {
        const stageX = (windowWidth - resolution.width * scale) / 2;
        const stageY = (windowHeight - resolution.height * scale) / 2;

        const left = -stageX / scale;
        const top = -stageY / scale;
        const right = (windowWidth - stageX) / scale;
        const bottom = (windowHeight - stageY) / scale;

        return {
            left,
            top,
            right,
            bottom,
            width: right - left,
            height: bottom - top,
            center: {
                x: (left + right) / 2,
                y: (top + bottom) / 2,
            },
        };
    }

    /**
     * safe — гарантированно видимая область на любом aspect ratio.
     * Центрирована внутри game zone с фиксированными margins.
     * Критический UI размещается здесь.
     */
    getSafeArea(windowWidth, windowHeight, resolution, safeArea, scale) {
        const gameArea = this.getGameArea(windowWidth, windowHeight, resolution, scale);

        const safeWidth = safeArea.width;
        const safeHeight = safeArea.height;

        const left = gameArea.left + (gameArea.width - safeWidth) / 2;
        const top = gameArea.top + (gameArea.height - safeHeight) / 2;
        const right = left + safeWidth;
        const bottom = top + safeHeight;

        return {
            left,
            top,
            right,
            bottom,
            width: safeWidth,
            height: safeHeight,
            center: {
                x: (left + right) / 2,
                y: (top + bottom) / 2,
            },
        };
    }

    /**
     * game — видимая часть stage в пределах resolution.
     * Пересечение resolution-прямоугольника (0,0 → width,height)
     * с видимой областью экрана. На идеальном aspect ratio
     * совпадает с resolution целиком.
     */
    getGameArea(windowWidth, windowHeight, resolution, scale) {
        const stageWidth = resolution.width;
        const stageHeight = resolution.height;

        const stageX = windowWidth / 2 - (stageWidth * scale) / 2;
        const stageY = windowHeight / 2 - (stageHeight * scale) / 2;

        const left = Math.max(0, -stageX / scale);
        const top = Math.max(0, -stageY / scale);
        const right = Math.min(stageWidth, (windowWidth - stageX) / scale);
        const bottom = Math.min(stageHeight, (windowHeight - stageY) / scale);

        const center = {
            x: (left + right) / 2,
            y: (top + bottom) / 2,
        };

        const width = right - left;
        const height = bottom - top;

        return {
            left,
            top,
            right,
            bottom,
            width,
            height,
            center,
        };
    }

    // ── Нотификация ───────────────────────────────────────────────────

    /**
     * Оповещает всех подписчиков: Signal, callbacks, рекурсивный обход display tree.
     */
    _notifyCallbacks() {
        const context = this.getContext();
        this.onResized.emit(context);
        this._callbacks.forEach(callback => {
            try {
                callback(context);
            } catch (error) {
                console.error("ResizeSystem callback error:", error);
            }
        });

        this.callOnContainerResize(this._stage, context);
    }

    /**
     * Рекурсивно вызывает onScreenResize(context) на всех объектах display tree,
     * у которых определён этот метод.
     */
    callOnContainerResize(object, context) {
        if (object.onScreenResize && context) {
            try {
                object.onScreenResize(context);
            } catch (error) {
                console.error("ResizeSystem callOnContainerResize error:", error);
            }
        }

        if (object.children) {
            object.children.forEach(child => {
                this.callOnContainerResize(child, context);
            });
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────

    dispose() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        if (this._onResizeBound) {
            window.removeEventListener("resize", this._onResizeBound);
            this._onResizeBound = null;
        }

        if (this._throttleTimer) {
            clearTimeout(this._throttleTimer);
            this._throttleTimer = null;
        }

        this._callbacks.clear();
    }

    getState() {
        return this._context;
    }
}
