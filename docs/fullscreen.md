# Fullscreen

## Обзор

`FullscreenService` — сервис для управления полноэкранным режимом с автоматическим fallback для iOS Safari.

Сервис уже зарегистрирован в `ServicesConfig` — ничего подключать не нужно.

### Стратегии (выбирается автоматически)

| Платформа | Метод | Как работает |
|-----------|-------|--------------|
| Desktop, Android, iOS 26+ | Native Fullscreen API | `requestFullscreen()` / `exitFullscreen()` |
| iOS Safari < 26 | Scroll-to-hide | Скролл страницы → Safari прячет toolbar |
| Chrome на iOS, iframe | Не поддерживается | `isSupported = false` |

---

## Быстрый старт

### Из flow

```javascript
export async function main(scope, ctx) {
    const fullscreen = ctx.fullscreen;

    // Войти в fullscreen (нужен user gesture)
    await fullscreen.enterFullscreen();

    // Выйти
    await fullscreen.exitFullscreen();

    // Toggle
    await fullscreen.toggleFullscreen();
}
```

### Из Scene

```javascript
class MyScene extends Scene {
    create() {
        const fullscreen = this.services.get("fullscreen");

        if (fullscreen.isSupported) {
            // Подписка на изменения
            fullscreen.onFullscreenChange.connect(isFs => {
                console.log("Fullscreen:", isFs);
            });
        }
    }
}
```

---

## API

```javascript
const fs = services.get("fullscreen");
```

| Свойство / Метод | Тип | Описание |
|---|---|---|
| `isSupported` | `boolean` | Есть ли способ войти в fullscreen |
| `isFullscreen` | `boolean` | Текущее состояние |
| `enterFullscreen()` | `async` | Войти в fullscreen. На iOS < 26 показывает scroll overlay |
| `exitFullscreen()` | `async` | Выйти из fullscreen |
| `toggleFullscreen()` | `async` | Переключить |
| `onFullscreenChange` | `Signal<boolean>` | Сигнал при изменении состояния |

---

## Паттерн: Toggle кнопка в HUD

Типичная реализация fullscreen toggle в HUD сцене:

```javascript
class HUDScene extends Scene {
    create() {
        this._fullscreen = this.services.get("fullscreen");
        this._wireFullscreen();
    }

    _wireFullscreen() {
        this.layout.forAll("FullScreenToggle", toggle => {
            // Скрыть кнопку если fullscreen не поддерживается
            if (!this._fullscreen.isSupported) {
                toggle.visible = false;
                return;
            }

            toggle.onChange.connect(checked => {
                if (this._togglingState) return; // guard от feedback loop
                if (checked) {
                    this._fullscreen.enterFullscreen();
                } else {
                    this._fullscreen.exitFullscreen();
                }
            });
        });

        // Синхронизация toggle при внешнем изменении (Esc, rotation, etc.)
        this._fullscreen.onFullscreenChange.connect(isFs => {
            this._togglingState = true;
            this.layout.forAll("FullScreenToggle", t => t.setState?.(isFs));
            this._togglingState = false;
        });
    }
}
```

### Зачем guard `_togglingState`?

Без guard'а возникает feedback loop:
1. Fullscreen изменился → signal → `setState(true)` на toggle
2. `setState` стреляет `onChange` → `enterFullscreen()` → early return (уже fullscreen)
3. Но попутно играет лишний звук и вызывает лишний код

---

## Паттерн: Простая кнопка (без layout)

Если UI создаётся кодом, а не через Figma layout:

```javascript
class HUDScene extends Scene {
    create() {
        const fullscreen = this.services.get("fullscreen");

        if (fullscreen.isSupported) {
            const btn = new PIXI.Text({ text: "⛶", style: { fontSize: 40, fill: 0xffffff } });
            btn.eventMode = "static";
            btn.cursor = "pointer";
            btn.position.set(1920 - 60, 30);
            btn.on("pointerup", () => fullscreen.toggleFullscreen());
            this.addChild(btn);
        }
    }
}
```

> **Важно**: на iOS используй `pointerup`, не `pointerdown` — `requestFullscreen()` требует завершённый user gesture.

---

## iOS scroll-to-hide: как это работает

На iOS Safari < 26 нет Fullscreen API. Вместо этого:

1. `enterFullscreen()` показывает overlay "Swipe for full screen"
2. При тапе/свайпе — `window.scrollBy(0, 1)` триггерит скрытие toolbar
3. Safari прячет address bar и toolbar → `innerHeight` растёт
4. Сервис детектирует увеличение viewport → убирает overlay → `onFullscreenChange(true)`
5. Мониторинг отслеживает потерю fullscreen (rotation, tap на address bar)

### Что знать разработчику

- **Overlay автоматический** — не нужно его создавать или управлять
- **Rotation ломает fullscreen** — при повороте телефона fullscreen теряется, `onFullscreenChange(false)` стреляет автоматически
- **Exit работает** — `exitFullscreen()` восстанавливает body styles, Safari показывает toolbar
- **Re-entry** — после выхода можно снова войти через `enterFullscreen()`

---

## Gotchas

1. **`isSupported = false` на Chrome iOS** — Chrome на iOS использует WebKit, но не поддерживает ни Fullscreen API, ни scroll-to-hide. Скрывай кнопку.

2. **User gesture обязателен** — `enterFullscreen()` работает только из обработчика user event (click, tap, pointerup). Вызов из `setTimeout` или `requestAnimationFrame` не сработает.

3. **Iframe** — в iframe fullscreen часто заблокирован. `isSupported` учитывает это.

4. **Не вызывай enterFullscreen() в create()** — нет user gesture, не сработает. Привяжи к кнопке.
