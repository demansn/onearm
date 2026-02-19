import { Signal } from "typed-signals";
import { Service } from "./Service.js";

/**
 * ResizeSystem - система масштабирования для PIXI.js игр
 * Автоматически адаптирует игру под различные размеры экрана
 *
 * Поддерживаемые режимы:
 * - PORTRAIT: портретная ориентация для мобильных устройств
 * - LANDSCAPE: альбомная ориентация для мобильных устройств
 * - DESKTOP: фиксированный режим для десктопных браузеров (не переключается по ориентации)
 */
export class ResizeSystem extends Service {
    static MODES = {
        PORTRAIT: "portrait",
        LANDSCAPE: "landscape",
        DESKTOP: "desktop",
    };

    static RESOLUTIONS = {
        [ResizeSystem.MODES.PORTRAIT]: { width: 1080, height: 1920 },
        [ResizeSystem.MODES.LANDSCAPE]: { width: 1920, height: 1080 },
        [ResizeSystem.MODES.DESKTOP]: { width: 1920, height: 1080 },
    };

    static SAFE_AREAS = {
        [ResizeSystem.MODES.PORTRAIT]: { width: 1080 - 100, height: 1920 - 100 },
        [ResizeSystem.MODES.LANDSCAPE]: { width: 1920 - 100, height: 1080 - 100 },
        [ResizeSystem.MODES.DESKTOP]: { width: 1920 - 200, height: 1080 - 200 },
    };

    constructor({ gameConfig, services, name, options = {} }) {
        super({ gameConfig, services, name, options });

        this._renderer = null;
        this._stage = null;
        this._canvas = null;
        this._resizeObserver = null;
        this._throttleTimer = null;
        this._context = {};
        this._lastContext = null;
        this._callbacks = new Set();
        this.onResized = new Signal();
    }

    getResolution() {
        return this._context.resolution;
    }

    /**
     * Инициализация системы
     */
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
    }

    /**
     * Получение текущего контекста масштабирования
     */
    getContext() {
        return { ...this._context };
    }

    /**
     * Подписка на изменения размеров
     */
    onResize(callback) {
        this._callbacks.add(callback);
        return () => this._callbacks.delete(callback);
    }

    /**
     * Принудительное обновление размеров
     */
    update() {
        this._update();
    }


    step() {
        this._update();
    }

    /**
     * Основной метод обновления размеров
     */
    _update() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const {screen = {width: 0, height: 0}} = this._context || {};
        const mode = this.getScreenMode({width: windowWidth, height: windowHeight});
        const isSameContext =
            screen.width === windowWidth && screen.height === windowHeight && this._context.mode === mode;
        const isSameMode = this._context.mode === mode;

        if  (isSameContext) {
            return;
        }

        this._calculate(windowWidth, windowHeight);
        this._apply();
        this._notifyCallbacks(isSameMode);
    }

    /**
     * Определение текущего режима экрана
     * @param size
     * @returns {string|string}
     */
    getScreenMode(size) {
        if (!this.app.isMobileDevice) {
           return ResizeSystem.MODES.DESKTOP;
        } else {
            // Для мобильных устройств выбираем по ориентации
           return size.width >= size.height
                    ? ResizeSystem.MODES.LANDSCAPE
                    : ResizeSystem.MODES.PORTRAIT;
        }
    }

    /**
     * Расчет всех параметров масштабирования
     *
     * Логика выбора режима:
     * - Для десктопных браузеров: всегда используется DESKTOP режим
     * - Для мобильных устройств: PORTRAIT/LANDSCAPE в зависимости от ориентации
     *
     * @param {number} windowWidth - ширина окна браузера
     * @param {number} windowHeight - высота окна браузера
     */
    _calculate(windowWidth, windowHeight) {
        const mode = this.getScreenMode({width: windowWidth, height: windowHeight});
        const resolution = ResizeSystem.RESOLUTIONS[mode];
        const safeArea = ResizeSystem.SAFE_AREAS[mode];

        // Расчет масштаба для помещения всего stage
        const fillScaleX = windowWidth / resolution.width;
        const fillScaleY = windowHeight / resolution.height;
        const fillScale = Math.min(fillScaleX, fillScaleY); // Масштаб чтобы весь stage помещался

        // Максимально допустимый масштаб в пределах safe zone
        const maxScaleX = windowWidth / safeArea.width;
        const maxScaleY = windowHeight / safeArea.height;
        const maxScale = Math.min(maxScaleX, maxScaleY);
        // Используем меньший из масштабов (это базовый расчет для экрана)
        const scale = Math.min(fillScale, maxScale);

        // Инициализируем context без областей - они будут вычислены в _apply()
        this._context = {
            mode,
            zone: {
                fullScreen: null,
                game: null,
                save: null,
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

    getFullScreenArea(windowWidth, windowHeight, resolution, scale) {
        // Вычисляем смещение stage относительно экрана
        const stageX = (windowWidth - resolution.width * scale) / 2;
        const stageY = (windowHeight - resolution.height * scale) / 2;

        // Координаты экрана в stage coordinates
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
     * Returns the inscribed safe area (always fully visible part within game area)
     * in stage (game) coordinates.
     * @param {number} windowWidth - window.innerWidth
     * @param {number} windowHeight - window.innerHeight
     * @param {object} resolution - {width, height} of stage
     * @param {object} safeArea - {width, height} of safe zone
     * @param {number} scale - current scale
     * @returns {object} area {left, top, right, bottom, width, height, center}
     */
    getSafeArea(windowWidth, windowHeight, resolution, safeArea, scale) {
        // Сначала получаем gameArea (видимую область stage)
        const gameArea = this.getGameArea(windowWidth, windowHeight, resolution, scale);

        // Центрируем safeArea внутри gameArea
        const safeWidth = safeArea.width;
        const safeHeight = safeArea.height;

        // Позиция safeArea относительно gameArea (центрирование)
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
     * Returns the inscribed game area (always fully visible part of the stage)
     * in stage (game) coordinates.
     * @param {number} windowWidth - window.innerWidth
     * @param {number} windowHeight - window.innerHeight
     * @param {object} resolution - {width, height} of stage
     * @returns {object} area {left, top, right, bottom, width, height, center}
     */
    getGameArea(windowWidth, windowHeight, resolution, scale) {
        const stageWidth = resolution.width;
        const stageHeight = resolution.height;

        const screenWidth = windowWidth;
        const screenHeight = windowHeight;

        // Масштаб
        // scale

        // Смещение stage (в пикселях канваса)
        const stageX = screenWidth / 2 - (stageWidth * scale) / 2;
        const stageY = screenHeight / 2 - (stageHeight * scale) / 2;

        // Левая и верхняя граница видимой области в игровых координатах
        const left = Math.max(0, -stageX / scale);
        const top = Math.max(0, -stageY / scale);

        // Правая и нижняя граница
        const right = Math.min(stageWidth, (screenWidth - stageX) / scale);
        const bottom = Math.min(stageHeight, (screenHeight - stageY) / scale);

        // Центр видимой области
        const center = {
            x: (left + right) / 2,
            y: (top + bottom) / 2,
        };

        // Ширина и высота видимой области
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

    /**
     * Применение расчетов к canvas и stage
     */
    _apply() {
        const { screen, resolution } = this._context;
        const pixelRatio = this.pixelRatio;
        const aspectRatio = resolution.width / resolution.height;
        const screenAspectRatio = screen.width / screen.height;

        // Canvas всегда занимает 100% своего контейнера
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.style.left = "0";
        this._canvas.style.top = "0";

        // Определяем контейнер для управления размерами
        const container = this._canvasBox || this._canvas;

        if (this.app.isMobileDevice) {
            // Для мобильных устройств контейнер занимает весь экран
            if (this._canvasBox) {
                this._canvasBox.style.width = "100%";
                this._canvasBox.style.height = "100%";
                this._canvasBox.style.left = "0";
                this._canvasBox.style.top = "0";
                this._canvasBox.style.position = "fixed";
            }
        } else {
            // Для десктопа проверяем, находится ли игра в iframe
            const isInIframe = window.self !== window.top;

            if (isInIframe) {
                // В iframe контейнер заполняет весь доступный экран
                if (this._canvasBox) {
                    this._canvasBox.style.width = "100vw";
                    this._canvasBox.style.height = "100vh";
                    this._canvasBox.style.left = "0";
                    this._canvasBox.style.top = "0";
                    this._canvasBox.style.position = "fixed";
                }
            } else {
                // В обычном браузере сохраняем соотношение сторон и центрируем


                if (this._canvasBox) {
                    this._canvasBox.style.position = "fixed";

                    // Максимальный размер игры для десктопа - фиксированный размер в CSS пикселях
                    const maxDesktopWidth = 9999999;  // Максимальная ширина в CSS пикселях
                    const maxDesktopHeight = 9999999;  // Максимальная высота в CSS пикселях
                    let  offsetX = 0;
                    let  offsetY = 0;
                    let  gameWidth = 0;
                    let  gameHeight = 0;

                    if (screenAspectRatio > aspectRatio) {
                        // Экран шире игры - масштабируем по высоте, центрируем по горизонтали
                         gameHeight = Math.min(screen.height, maxDesktopHeight);
                         gameWidth = gameHeight * screenAspectRatio;

                        // Проверяем максимальную ширину
                        if (gameWidth > maxDesktopWidth) {
                            gameWidth = maxDesktopWidth;
                            gameHeight = gameWidth / aspectRatio;
                        }

                         offsetX = (screen.width - gameWidth) / 2;
                         offsetY = (screen.height - gameHeight) / 2;
                    } else {


                        // Экран выше игры - масштабируем по ширине, центрируем по вертикали
                         gameWidth = Math.min(screen.width, maxDesktopWidth);
                         gameHeight = gameWidth / aspectRatio;

                        // Проверяем максимальную высоту
                        if (gameHeight > maxDesktopHeight) {
                            gameHeight = maxDesktopHeight;
                            gameWidth = gameHeight * aspectRatio;
                        }

                         offsetX = (screen.width - gameWidth) / 2;
                         offsetY = (screen.height - gameHeight) / 2;
                    }

                    this._canvasBox.style.width = `${gameWidth}px`;
                    this._canvasBox.style.height = `${gameHeight}px`;
                    this._canvasBox.style.left = `${offsetX}px`;
                    this._canvasBox.style.top = `${offsetY}px`;
                }
            }
        }

        // Получаем актуальные размеры контейнера
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        // Renderer с учетом pixel ratio для четкости, но без изменения canvas размеров
        this._renderer.resize(containerWidth * pixelRatio, containerHeight * pixelRatio);

        // Принудительно устанавливаем CSS размеры canvas после resize
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";

        // Пересчитываем области с учетом внутренних размеров canvas (с pixelRatio)
        const safeArea = ResizeSystem.SAFE_AREAS[this._context.mode];
        const canvasInternalWidth = containerWidth * pixelRatio;
        const canvasInternalHeight = containerHeight * pixelRatio;
        const containerScale = Math.min(
            canvasInternalWidth / resolution.width,
            canvasInternalHeight / resolution.height,
        );

        // Обновляем context с правильными областями (используем внутренние размеры canvas)
        const fullScreen = this.getFullScreenArea(
            canvasInternalWidth,
            canvasInternalHeight,
            resolution,
            containerScale,
        );
        const game = this.getGameArea(
            canvasInternalWidth,
            canvasInternalHeight,
            resolution,
            containerScale,
        );
        const save = this.getSafeArea(
            canvasInternalWidth,
            canvasInternalHeight,
            resolution,
            safeArea,
            containerScale,
        );

        this._context.zone = {
            fullScreen: fullScreen,
            game: game,
            save: save,
        };
        this._context.scale = containerScale;

        // Применяем масштаб и позицию stage
        this._stage.scale.set(containerScale);

        // Центрируем stage внутри canvas (используем внутренние размеры с pixelRatio)
        const stageX = (canvasInternalWidth - resolution.width * containerScale) / 2;
        const stageY = (canvasInternalHeight - resolution.height * containerScale) / 2;

        this._stage.position.set(stageX, stageY);
    }

    get pixelRatio() {
        return 1;
    }

    /**
     * Уведомление подписчиков об изменениях
     */
    _notifyCallbacks(isSameMode) {
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

        if (!isSameMode) {
            this.callOnContainerResize(this._stage, context);
        }
    }

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

    callOnContainerChangeScreenLayout(object, context) {
        if (object.onChangeScreenLayout && context) {
            object.onChangeScreenLayout(context);
        }

        if (object.children) {
            object.children.forEach(child => this.callOnContainerChangeScreenLayout(child, context));
        }
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
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
