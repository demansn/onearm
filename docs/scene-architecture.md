# Архитектура сцен

## Принцип

Каждая сцена состоит из двух слоёв:

- **Layout** — визуальная структура, создаётся из конфига (JSON). Только расположение, размеры, текстуры. Не содержит логики.
- **Контроллеры** — маленькие классы, каждый в отдельном файле. Получают layout, прячут детали работы с элементами за публичным API.

Бизнес-логика (что делать, в каком порядке, какие данные запросить) живёт во **flow-функциях**, не в сценах. Сцена отвечает только на вопрос «как показать» и «какие действия пользователя произошли».

---

## Организация файлов

### Простая сцена (без контроллеров)

Если сцена не требует контроллеров — это один файл в папке `scenes/`:

```
scenes/
├── BackgroundScene.js
└── ...
```

### Сцена с контроллерами

Если сцене нужны контроллеры, для неё создаётся **папка с именем сцены**. Каждый контроллер — отдельный файл. Это упрощает чтение: открыл файл — видишь один небольшой класс, а не стену кода.

```
scenes/
├── BackgroundScene.js           — простая сцена, без контроллеров
├── hud/                         — папка для сцены с контроллерами
│   ├── HUDScene.js              — сцена, собирает контроллеры
│   ├── InfoDisplay.js           — контроллер зоны информации
│   ├── SpinButton.js            — контроллер кнопки спина
│   ├── SoundControl.js          — контроллер звука
│   └── index.js                 — реэкспорт сцены
└── reels/
    ├── ReelsScene.js
    ├── ReelsAnimation.js
    └── index.js
```

Файл `index.js` реэкспортирует только сцену — контроллеры остаются внутренней деталью папки:

```javascript
// scenes/hud/index.js
export { HUDScene } from "./HUDScene.js";
```

### Контроллер, используемый в нескольких сценах

Выносится в общую папку `controllers/`:

```
scenes/
├── hud/
│   ├── HUDScene.js
│   └── ...
├── freeSpins/
│   ├── FreeSpinsScene.js
│   └── ...
controllers/
└── SoundControl.js              — общий для нескольких сцен
```

---

## Правила для контроллера

**Контроллер — это класс, который:**

1. Принимает `layout` в конструкторе
2. Находит нужные элементы через `layout.find()` и сохраняет в приватные поля (`#`)
3. Публикует **сигналы** для событий от пользователя (`onSpin`, `onBetChange`)
4. Публикует **методы** для управления отображением (`showWin(value)`, `setIdle()`)
5. Не знает про GameLogic, серверные запросы, состояние игры

**Публичный API контроллера должен говорить на языке намерений, не элементов:**

```javascript
// Хорошо — что сделать
info.showWin(500)
spin.setIdle()

// Плохо — как сделать (детали layout)
layout.find("winText").visible = true
layout.find("spinButton").enabled = true
```

---

## Пример: полная сцена

### Контроллеры (каждый в своём файле)

```javascript
// scenes/hud/InfoDisplay.js
import { Signal } from "typed-signals";

export class InfoDisplay {
    #winText;
    #totalWinText;
    #infoText;

    constructor(layout) {
        this.#winText = layout.find("winText");
        this.#totalWinText = layout.find("totalWinText");
        this.#infoText = layout.find("infoText");
    }

    showWin(value) {
        this.#winText.text = formatCurrency(value);
        this.#winText.visible = true;
        this.#infoText.visible = false;
    }

    showTotalWin(value) {
        this.#totalWinText.text = formatCurrency(value);
        this.#totalWinText.visible = true;
    }

    showInfoText(text) {
        this.#infoText.text = text;
        this.#infoText.visible = true;
        this.#winText.visible = false;
    }

    clear() {
        this.#winText.visible = false;
        this.#totalWinText.visible = false;
        this.#infoText.visible = false;
    }
}
```

```javascript
// scenes/hud/SpinButton.js
import { Signal } from "typed-signals";

export class SpinButton {
    #spinBtn;
    #stopBtn;

    onSpin = new Signal();
    onStop = new Signal();

    constructor(layout) {
        this.#spinBtn = layout.find("spinButton");
        this.#stopBtn = layout.find("stopButton");
        this.#spinBtn.onPress.connect(() => this.onSpin.emit());
        this.#stopBtn.onPress.connect(() => this.onStop.emit());
    }

    setIdle() {
        this.#spinBtn.visible = true;
        this.#spinBtn.enabled = true;
        this.#stopBtn.visible = false;
    }

    setSpinning() {
        this.#spinBtn.visible = false;
        this.#stopBtn.visible = true;
    }

    setDisabled() {
        this.#spinBtn.enabled = false;
        this.#stopBtn.visible = false;
    }
}
```

```javascript
// scenes/hud/SoundControl.js
import { Signal } from "typed-signals";

export class SoundControl {
    #button;
    #popup;
    #slider;

    onVolumeChange = new Signal();

    constructor(layout) {
        this.#button = layout.find("soundButton");
        this.#popup = layout.find("soundPopup");
        this.#slider = layout.find("volumeSlider");

        this.#button.onPress.connect(() => this.#togglePopup());
        this.#slider.onChange.connect((v) => this.onVolumeChange.emit(v));
    }

    setVolume(value) {
        this.#slider.value = value;
    }

    setMuted(muted) {
        this.#button.tint = muted ? 0xff0000 : 0xffffff;
    }

    #togglePopup() {
        this.#popup.visible = !this.#popup.visible;
    }
}
```

### Сцена (собирает контроллеры)

```javascript
// scenes/hud/HUDScene.js
import { Scene } from "engine/services/sceneManager/Scene";
import { InfoDisplay } from "./InfoDisplay.js";
import { SpinButton } from "./SpinButton.js";
import { SoundControl } from "./SoundControl.js";

export class HUDScene extends Scene {
    create() {
        this.buildLayout("HUD");

        this.info  = new InfoDisplay(this);
        this.spin  = new SpinButton(this);
        this.sound = new SoundControl(this);
    }
}
```

### Реэкспорт

```javascript
// scenes/hud/index.js
export { HUDScene } from "./HUDScene.js";
```

---

## Использование во flow

Flow — это бизнес-логика. Flow решает **что** и **когда**, сцена решает **как**.

```javascript
async function idle(scope, ctx) {
    const hud = ctx.scenes.get("hud");

    hud.spin.setIdle();
    hud.info.showInfoText("Place your bet");

    await scope.wait(hud.spin.onSpin);
    return spinRound;
}

async function spinRound(scope, ctx) {
    const hud = ctx.scenes.get("hud");
    const reels = ctx.scenes.get("reels");
    const gameLogic = ctx.services.get("gameLogic");

    hud.spin.setSpinning();
    reels.spin();

    const result = await gameLogic.requestSpin();
    await reels.stop(result.matrix);

    hud.info.showWin(result.win);
    hud.info.showTotalWin(result.totalWin);

    return idle;
}
```

---

## Мокирование для тестов

Мок сцены — plain object с тем же публичным API. Приватные поля и layout не нужны.

```javascript
function createMockHUD() {
    return {
        info: {
            showWin() {},
            showTotalWin() {},
            showInfoText() {},
            clear() {},
        },
        spin: {
            onSpin: new Signal(),
            onStop: new Signal(),
            setIdle() {},
            setSpinning() {},
            setDisabled() {},
        },
        sound: {
            onVolumeChange: new Signal(),
            setVolume() {},
            setMuted() {},
        },
    };
}

// Тест без рендеринга
const hud = createMockHUD();
ctx.scenes.set("hud", hud);
// Симулируем клик пользователя
hud.spin.onSpin.emit();
```

---

## Правила организации файлов

| Ситуация | Решение |
|---|---|
| Сцена без контроллеров | Один файл `SomethingScene.js` в `scenes/` |
| Сцена с контроллерами | Папка `scenes/something/` с отдельным файлом на каждый контроллер |
| Контроллер используется в нескольких сценах | Вынести в общую папку `controllers/` |

**Каждый контроллер — всегда отдельный файл.** Это упрощает чтение: открыл файл — видишь один небольшой класс с понятной ответственностью, а не стену кода на 500 строк.

---

## Чеклист: создание новой сцены

1. **Определи, нужны ли контроллеры.** Если сцена — просто фон или статичный элемент, контроллеры не нужны → один файл.
2. **Определи зоны.** Какие логические части есть? (info-дисплей, кнопки, панели)
3. **Создай папку** `scenes/имя-сцены/` для сцены с контроллерами.
4. **Для каждой зоны — контроллер-класс в отдельном файле.** Приватные поля для элементов, публичные методы для действий, сигналы для событий пользователя.
5. **Сцена собирает контроллеры** в `create()`. Каждый контроллер — публичное свойство сцены.
6. **Добавь `index.js`** с реэкспортом сцены.
7. **Flow использует API сцены.** `hud.info.showWin(500)`, `await scope.wait(hud.spin.onSpin)`.
8. **Бизнес-логика — только во flow.** Сцена не импортирует GameLogic, не делает запросы, не принимает решения.

---

## Чеклист: рефакторинг существующей сцены

1. **Прочитай текущую сцену.** Выпиши все публичные методы и сигналы.
2. **Сгруппируй по зонам.** Методы balance/win/infoText → InfoDisplay. Методы spin/stop → SpinButton. И т.д.
3. **Для каждой группы создай контроллер-класс в отдельном файле** внутри папки сцены. Перенеси логику, элементы layout — в приватные поля.
4. **Сцена создаёт контроллеры** и выставляет как свойства.
5. **Обнови flow** — замени `hud.setBalance(x)` на `hud.info.setBalance(x)`.
6. **Удали старые контроллер-файлы** (HUDController, под-контроллеры), если они больше не нужны.

---

## Анти-паттерны

- **Фасад-контроллер, который прокидывает 20+ сигналов** → сигналы живут в контроллерах зон, flow подписывается напрямую
- **Базовый класс для контроллеров** → контроллеры маленькие, им не нужно наследование
- **Контроллер без сцены «для тестируемости»** → мокируй plain object-ом
- **Бизнес-логику в сцене** → переноси во flow
- **Все контроллеры в одном файле** → каждый контроллер в отдельном файле, сцена с контроллерами — всегда папка
