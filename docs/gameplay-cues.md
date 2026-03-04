# Gameplay Cues — event-driven effects bus

## Принцип

Cues — шина событий, которая **отделяет игровую логику от эффектов**. Код стреляет тегом (что произошло), подписчики реагируют независимо (что показать/проиграть). Добавление нового эффекта не требует правок в игровой логике.

**Источники вдохновения:** UE Gameplay Cues, CryEngine Flow Graph, Godot Groups.call.

**Когда использовать Cues вместо прямых вызовов:**

| Прямой вызов | Cue |
|---|---|
| Один конкретный получатель | Несколько независимых получателей |
| Эффект привязан к позиции на timeline | Эффект мгновенный (fire-and-forget) |
| Вызов из акта синхронно с анимацией | Вызов из flow / game state |
| `timeline.playSfx("scatter_3", {}, "-=0.2")` | `cues.fire("freespins.start", { count: 10 })` |

---

## Где использовать, а где нет

### Cues подходят для (flow-уровень, ~20% вызовов эффектов):

- **Музыка** — переключение треков при смене режима (`freespins.start` → музыка фриспинов)
- **HUD-обновления** — баланс, выигрыш, счётчик фриспинов (`win.update`, `balance.update`)
- **Смена настроения сцены** — затемнение, цветовой фильтр (`scene.mood.dark`)
- **Аналитика / логирование** — единая точка подписки на все игровые события
- **Кросс-cutting эффекты** — частицы, оверлеи, вибрация — всё что реагирует на факт, а не на момент анимации

### Cues НЕ подходят для (timeline-уровень, ~80% вызовов):

- **Синхронизированные звуки** — `timeline.playSfx("cascade")` должен звучать в точный момент анимации. Оставить `timeline.playSfx()` через AudioGsapPlugin.
- **Хореография актов** — последовательность шагов в PaysAct, CascadeAct. Акты — это режиссёрские сценарии с точным таймингом.

**Правило:** если эффект привязан к позиции на GSAP timeline — используй `timeline.playSfx()`. Если эффект реагирует на факт (что-то произошло) — используй `cues.fire()`.

---

## Реализация

### CueSystem (~80 LOC)

```js
// modules/engine/services/CueSystem.js
import { Service } from "./Service.js";

export class CueSystem extends Service {
    #handlers = []; // { tag, handler, once }

    /**
     * Подписка на тег. Поддерживает parent matching:
     * on("win") сработает на fire("win"), fire("win.big"), fire("win.mega").
     *
     * @param {string} tag — тег или префикс тега
     * @param {Function} handler — (payload, firedTag) => void
     * @returns {Function} unsubscribe
     */
    on(tag, handler) {
        const entry = { tag, handler, once: false };
        this.#handlers.push(entry);
        return () => this.#remove(entry);
    }

    /**
     * Одноразовая подписка — автоматически отписывается после первого срабатывания.
     */
    once(tag, handler) {
        const entry = { tag, handler, once: true };
        this.#handlers.push(entry);
        return () => this.#remove(entry);
    }

    /**
     * Стрельнуть тегом. Все обработчики, чей tag является префиксом firedTag,
     * будут вызваны синхронно в порядке регистрации.
     *
     * @param {string} tag — полный тег события ("win.big", "freespins.start")
     * @param {Object} payload — данные события
     */
    fire(tag, payload = {}) {
        const toRemove = [];

        for (const entry of this.#handlers) {
            if (this.#matches(tag, entry.tag)) {
                entry.handler(payload, tag);
                if (entry.once) toRemove.push(entry);
            }
        }

        for (const entry of toRemove) {
            this.#remove(entry);
        }
    }

    /**
     * Удалить все обработчики для тега. Без аргументов — удалить всё.
     */
    off(tag) {
        if (!tag) {
            this.#handlers = [];
        } else {
            this.#handlers = this.#handlers.filter(h => h.tag !== tag);
        }
    }

    /** tag "win" матчит fired "win", "win.big", "win.mega" */
    #matches(firedTag, listenerTag) {
        return firedTag === listenerTag || firedTag.startsWith(listenerTag + ".");
    }

    #remove(entry) {
        const idx = this.#handlers.indexOf(entry);
        if (idx !== -1) this.#handlers.splice(idx, 1);
    }
}
```

### Регистрация как сервис

```js
// GameConfig.js (или services.config.js движка)
import { CueSystem } from "onearm";

services: {
    ...ServicesConfig,
    cues: { Service: CueSystem },
}
```

### Доступ

```js
// Во flow:
async function gameFlow(scope, ctx) {
    ctx.cues.fire("freespins.start", { count: 10 });
}

// В Scene:
class GameScene extends Scene {
    create() {
        const cues = this.services.get("cues");
        cues.on("win", ({ amount }) => this.flashEffect(amount));
    }
}

// В Behavior (LayoutController):
class WinCounterBehavior extends LayoutController {
    init() {
        const cues = getEngineContext().services.get("cues");
        this._unsub = cues.on("win.update", ({ amount }) => {
            this.layout.get("value").text = formatMoney(amount);
        });
    }
    destroy() {
        this._unsub?.();
    }
}
```

---

## Примеры использования

### 1. Переключение музыки при смене режима

```js
// Регистрация (один раз, при инициализации игры):
cues.on("freespins.start", () => audio.playMusic("freespins_theme"));
cues.on("freespins.end",   () => audio.playMusic("base_theme"));
cues.on("bonus.start",     () => audio.playMusic("bonus_theme"));

// В flow — чистая логика, без знания об аудио:
cues.fire("freespins.start", { count: totalFreeSpins });
// → музыка переключится, HUD покажет счётчик, сцена затемнится
```

### 2. HUD-обновления без зависимости актов от HUD

```js
// Регистрация в HUD-сцене:
cues.on("win.update",     ({ amount }) => winLabel.text = formatMoney(amount));
cues.on("balance.update", ({ amount }) => balanceLabel.text = formatMoney(amount));
cues.on("pay.show",       ({ pay }) => payInfo.show(pay));
cues.on("pay.clear",      () => payInfo.hide());

// В PaysAct — стреляет фактами, не знает про HUD:
cues.fire("pay.show", { pay });
cues.fire("win.update", { amount: totalWin });
cues.fire("balance.update", { amount: newBalance });
```

### 3. Аналитика — одна точка подписки

```js
// Подписка на всё через parent matching:
cues.on("win",       (p, tag) => analytics.track("win", { tag, ...p }));
cues.on("freespins", (p, tag) => analytics.track("feature", { tag, ...p }));
cues.on("bet",       (p, tag) => analytics.track("bet", { tag, ...p }));
cues.on("error",     (p, tag) => analytics.track("error", { tag, ...p }));
```

### 4. Per-game кастомизация эффектов

```js
// Игра A — простая:
cues.on("win.big", () => sceneEffects.shake(0.3));

// Игра B — с частицами и оверлеем:
cues.on("win.big", () => sceneEffects.shake(0.5, 12));
cues.on("win.big", () => particles.burst("coins", { count: 200 }));
cues.on("win.big", ({ amount }) => bigWinOverlay.show(amount));

// В обоих случаях flow идентичен:
cues.fire(totalWin > threshold ? "win.big" : "win", { amount: totalWin });
```

---

## Рекомендуемая таксономия тегов

```
win                          — любой выигрыш
win.small                    — малый выигрыш
win.big                      — большой выигрыш
win.mega                     — мега-выигрыш
win.update                   — обновить отображение выигрыша

balance.update               — обновить баланс

pay.show                     — показать линию выплаты
pay.clear                    — скрыть линию выплаты

freespins.start              — старт фриспинов
freespins.end                — конец фриспинов
freespins.retrigger          — ретриггер фриспинов

bonus.start                  — старт бонуса
bonus.end                    — конец бонуса

scene.mood.dark              — затемнение сцены
scene.mood.normal            — нормальный режим
scene.transition             — переход между сценами

bet.change                   — изменение ставки

error                        — ошибка
error.network                — сетевая ошибка
error.balance                — недостаточно средств
```

Тег `"win"` через parent matching автоматически матчит `"win.big"`, `"win.mega"` и т.д. Новые подтеги не требуют изменений в подписчиках на родительский тег.

---

## Взаимодействие с существующими системами

### С AudioGsapPlugin (timeline.playSfx)

**Сосуществуют, не конфликтуют.** Разные уровни:

```
timeline.playSfx("scatter_3")     — звук синхронизирован с анимацией (акт)
cues.fire("freespins.start")      — событие запускает музыку (flow)
```

AudioGsapPlugin остаётся для timeline-синхронизированных звуков. CueSystem — для flow-level событий.

### С Behaviors

Behavior подписывается на cues в `init()`, отписывается в `destroy()`:

```js
class MyBehavior extends LayoutController {
    init() {
        const cues = getEngineContext().services.get("cues");
        this._unsubs = [
            cues.on("win.update", ({ amount }) => this.updateWin(amount)),
            cues.on("balance.update", ({ amount }) => this.updateBalance(amount)),
        ];
    }
    destroy() {
        this._unsubs.forEach(fn => fn());
    }
}
```

### С Flow system

Flow получает cues через ctx и стреляет событиями в ключевых точках:

```js
async function freespinsFlow(scope, ctx) {
    ctx.cues.fire("freespins.start", { count });

    scope.defer(() => ctx.cues.fire("freespins.end"));

    while (remaining > 0) {
        await scope.run(spinFlow, ctx);
        remaining--;
    }
    // scope.defer сработает → fire("freespins.end")
}
```

---

## Что даёт и чего стоит

### Выгоды

| Выгода | Значимость |
|--------|------------|
| Новые эффекты без правки flow/актов | Высокая — ключевое для мульти-игрового движка |
| Каждая игра настраивает свои реакции на теги | Высокая — разные игры, разные эффекты |
| Единая точка аналитики/логирования | Средняя |
| Акты не зависят от HUD API | Средняя — упрощает переиспользование актов |

### Стоимость

| Стоимость | Значимость |
|-----------|------------|
| ~80 строк нового кода | Низкая |
| Два механизма звука (timeline.playSfx + cues) | Средняя — нужна чёткая конвенция |
| Сложнее трейсить "что произойдёт при fire" | Средняя — решается dev-логированием |

### Объём кода

Cues **не уменьшают** общий объём кода. Они **перераспределяют** его: убирают прямые зависимости из flow/актов, добавляют регистрацию обработчиков в отдельном месте. Чистый эффект — лучшая организация, не меньше строк.

---

## Когда внедрять

Cues стоит внедрять когда:
1. В игре появляются **звуки и музыка** на flow-уровне (переключение треков)
2. Нужно **несколько эффектов** на одно событие (win → звук + частицы + shake + HUD)
3. Движок обслуживает **несколько игр** с разными реакциями на одни события
4. Появляется **аналитика** которая должна подписаться на игровые события

До этого момента прямые вызовы проще и прозрачнее.
