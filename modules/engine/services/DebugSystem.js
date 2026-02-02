import * as PIXI from "pixi.js";

import { Service } from "./Service.js";

/**
 * DebugSystem - система отладки для визуализации различных параметров
 * Использует данные из ResizeSystem для отображения debug информации
 */
export class DebugSystem extends Service {
    constructor({ gameConfig, services, name, options = {} }) {
        super({ gameConfig, services, name, options });

        this._resizeSystem = null;
        this._appService = null;
        this._debugContainer = null;
        this._debugEnabled = false;
        this._debugCallbacks = new Set();
        this._debugGraphics = null;
        this._debugText = null;
    }

    /**
     * Инициализация системы
     */
    async init() {
        this._resizeSystem = this.services.get("resizeSystem");
        this._appService = this.services.get("app");

        if (!this._resizeSystem) {
            throw new Error("DebugSystem: resizeSystem не найден");
        }

        if (!this._appService) {
            throw new Error("DebugSystem: app service не найден");
        }

        // Создаем контейнер для debug элементов
        this._debugContainer = new PIXI.Container();
        this._debugContainer.name = "debugContainer";

        this.fullScreenGraphics = new PIXI.Graphics();
        this._debugContainer.addChild(this.fullScreenGraphics);

        // Создаем графику для рамок
        this._debugGraphics = new PIXI.Graphics();
        this._debugContainer.addChild(this._debugGraphics);

        // Создаем текст для информации
        this._debugText = new PIXI.Text("", {
            fontFamily: "monospace",
            fontSize: 12,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 2,
        });
        this._debugText.name = "debugText";
        this._debugText.resolution = 2;
        this._debugContainer.addChild(this._debugText);

        // Добавляем контейнер в stage, но компенсируем масштабирование
        this._appService.stage.addChild(this._debugContainer);

        // Устанавливаем высокий z-index для отображения поверх всего
        this._debugContainer.zIndex = 1000;

        // Подписка на изменения ResizeSystem
        this._resizeSystem.onResize(context => {
            this._updateDebug(context);
        });

        // Включение debug по умолчанию в development режиме
        if (process.env.NODE_ENV === "development") {
            // this.enableDebug(true);
        }
    }

    /**
     * Включение/выключение debug режима
     */
    enableDebug(enabled = true) {
        this._debugEnabled = enabled;

        if (this._debugContainer) {
            this._debugContainer.visible = enabled;
        }

        if (enabled) {
            const context = this._resizeSystem.getContext();
            if (context) {
                this._updateDebug(context);
            }
        }
    }

    /**
     * Подписка на debug события
     */
    onDebugUpdate(callback) {
        this._debugCallbacks.add(callback);
        return () => this._debugCallbacks.delete(callback);
    }

    /**
     * Обновление debug отображения
     */
    _updateDebug(context) {
        if (!this._debugEnabled || !this._debugContainer) return;

        const { mode, scale, screen, resolution, zone } = context;
        const { fullScreen, game, save } = zone;

        // Очищаем графику
        this._debugGraphics.clear();
        this.fullScreenGraphics.clear();

        this.fullScreenGraphics.clear();
        // Рисуем рамку экрана (синяя) - в координатах stage
        this.fullScreenGraphics.lineStyle(2, 0x0000ff);
        this.fullScreenGraphics.drawRect(0, 0, fullScreen.width, fullScreen.height);
        this.fullScreenGraphics.x = fullScreen.left;
        this.fullScreenGraphics.y = fullScreen.top;
        this.fullScreenGraphics.endFill();

        // Рисуем рамку stage (красная) - в координатах stage
        this._debugGraphics.lineStyle(2, 0xff0000);
        this._debugGraphics.drawRect(game.left, game.top, game.width, game.height);

        // Рисуем рамку safe area (зеленая) - в координатах stage
        this._debugGraphics.lineStyle(2, 0x00ff00);
        this._debugGraphics.drawRect(save.left, save.top, save.width, save.height);

        this._debugGraphics.endFill();

        // Обновляем текст
        const textInfo = `DebugSystem
Mode: ${mode}
Scale: ${scale.toFixed(2)}
Screen: ${screen.width}x${screen.height}
Resolution: ${resolution.width}x${resolution.height}
Blue: Screen | Red: Stage | Green: Safe Area`;

        this._debugText.text = textInfo;
        this._debugText.position.set(fullScreen.left, fullScreen.top);

        // Уведомляем подписчиков
        this._debugCallbacks.forEach(callback => {
            try {
                callback(context);
            } catch (error) {
                console.error("DebugSystem callback error:", error);
            }
        });
    }

    /**
     * Добавление кастомной debug информации
     */
    addCustomDebugInfo(info) {
        if (!this._debugEnabled || !this._debugContainer) return;

        const customText = new PIXI.Text(info, {
            fontFamily: "monospace",
            fontSize: 12,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 2,
        });
        customText.position.set(10, 200);
        customText.name = "customDebugText";
        this._debugContainer.addChild(customText);
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this._debugContainer && this._appService && this._appService.stage) {
            this._appService.stage.removeChild(this._debugContainer);
        }
        this._debugCallbacks.clear();
    }
}
