# Async Primitives

Утилиты для асинхронных flow. Standalone-функции (без scope) + scope-aware методы.

## Standalone functions

Импортируются из `onearm`:

```js
import { delay, waitForSignal, waitForAny, waitUntil } from "onearm";
```

| Function | Description |
|---|---|
| `delay(ms)` | Ждёт N миллисекунд |
| `waitForSignal(signal)` | Ждёт первый emit typed-signal. Возвращает первый аргумент |
| `waitForAny(...signals)` | Ждёт первый из N signals. Возвращает `{ index, args }` |
| `waitUntil(predicate)` | Ждёт пока `predicate()` вернёт true (проверка каждый кадр через rAF) |

## Scope-aware methods

Доступны через `scope` в flows. Автоматически отключают подписки при dispose:

| Method | Description |
|---|---|
| `scope.wait(signal)` | То же что `waitForSignal`, но auto-cleanup |
| `scope.waitForAny(...signals)` | То же что `waitForAny`, но auto-cleanup |

## Когда использовать standalone vs scope

- **`scope.wait(signal)`** — в flows, где нужен auto-cleanup при dispose
- **`waitForSignal(signal)`** — вне flows (в сценах, behaviors, утилитах)
- **`scope.waitForAny(...signals)`** — race между signals с cleanup
- **`waitForAny(...signals)`** — race вне scope

## Примеры

### Ожидание нажатия кнопки в flow

```js
async function idle(scope, ctx) {
    const hud = ctx.scenes.get("HUDScene");
    const action = await scope.wait(hud.onBet);
}
```

### Race между сигналами

```js
const event = await scope.waitForAny(hud.onBet, hud.onStartAutoplay);
if (event.index === 0) {
    // onBet fired
} else {
    // onStartAutoplay fired, event.args[0] = number of games
}
```

### Задержка между анимациями

```js
for (const ball of balls) {
    launchBall(ball);
    await delay(300);
}
```

### Ожидание условия

```js
await waitUntil(() => activeBalls === 0);
showResults();
```

### Standalone use вне flow (в сцене)

```js
import { waitForSignal } from "onearm";

class MyScene extends Scene {
    async playIntro() {
        await waitForSignal(this.introAnimation.onComplete);
        this.showUI();
    }
}
```
