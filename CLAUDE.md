# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Команды разработки

```bash
# Сборка и запуск (из директории игры, не из onearm!)
npm run build       # Development сборка
npm run build:prod  # Production сборка с минификацией
npm run serve       # Dev-сервер с hot reload
npm run dev         # Алиас для serve

# Экспорт ассетов
npm run fonts       # Экспорт шрифтов из Figma
npm run export      # Экспорт компонентов из Figma
npm run setup-oauth # Настройка OAuth для Figma API
```

**Важно:** Команды запускаются из директории игры (например `sweet-bonanza`), а не из onearm. Система определяет путь к игре через симлинк.

## Архитектура

### Структура модулей

```
onearm/
├── modules/
│   ├── engine/     # Core движок
│   │   ├── Game.js              # Главный класс инициализации
│   │   ├── ServiceLocator.js    # Паттерн Service Locator
│   │   ├── AsyncAction.js       # Обертка для асинхронных действий
│   │   ├── AsyncActionsScenario.js  # Управление последовательностью актов
│   │   ├── services/            # 22 сервиса (StateMachine, SceneManager, AudioManager...)
│   │   └── common/
│   │       ├── displayObjects/  # SuperContainer, SpineAnimation, FlexContainer...
│   │       └── UI/              # Button, Slider, CheckBox...
│   └── slots/      # Логика слотов
│       ├── BaseGameState.js     # Базовый класс игровых состояний
│       ├── GameLogic.js         # API взаимодействие, управление спинами
│       ├── GameMath.js          # Преобразование данных спина в матрицы
│       ├── GameStates.js        # Константы состояний
│       ├── BetsController.js    # Управление ставками
│       ├── AutoplayController.js
│       ├── acts/                # Система актов презентации
│       └── reels/               # Reels, Reel, ReelSymbol, ReelsMatrix
├── scripts/        # ESBuild сборка, экспорт Figma
└── static/         # HTML шаблон
```

### Импорты

```javascript
// Рекомендуемый импорт
import { Game, Scene, BaseGameState, Reels } from 'onearm';

// Или из конкретных модулей
import { Game } from 'onearm/engine';
import { BaseGameState } from 'onearm/slots';
```

### Ключевые паттерны

**Service Locator** - доступ к сервисам:
```javascript
this.services.get('serviceName')  // В классах с services
services.get('serviceName')       // Глобально
```

**State Machine** - состояния с enter/exit:
```javascript
class MyState extends BaseState {
    async enter(params) { /* инициализация, подписки */ }
    async exit() { /* очистка, отписки */ }
    update({ dt }) { /* каждый кадр */ }
}

// Автоматическая очистка сигналов
addSignalHandler(signal, handler)  // в enter()
// signals.disconnectAll() вызывается в exit() автоматически
```

**Acts (Presentation Logic)** - сценарии презентации результата:
```javascript
class MyAct extends PresentationAct {
    skipStep = true;                // Может быть пропущен
    get guard() { return true; }    // Условие выполнения
    action() {                      // Основное действие (возвращает GSAP Timeline)
        return gsap.timeline().to(obj, { duration: 1 });
    }
    skip() { }                      // Действие при пропуске
}
```

Порядок актов в спине: `StopReelsAct → PaysAct → CascadeAct → MultiplierAct → FreeSpinsTrigger → GoToNextStateAct`

**SuperContainer** - базовый контейнер для объектов:
```javascript
root.createObject('buttonName', { x: 100, y: 200 });
root.find('query');      // Поиск по названию
root.findAll('names');   // Все совпадения
```

### Система состояний

```
StateMachine
├── IDLE → SPINNING → WINNING → IDLE
├── FREE_SPIN_INTRO → FREE_SPIN_IDLE → FREE_SPIN_SPINNING → FREE_SPIN_WINNING → FREE_SPIN_OUTRO
└── ShopState, InfoPageState, ERROR, RESTORE
```

### AsyncAction и AsyncActionsScenario

```javascript
// AsyncAction - обертка для Promise, GSAP Timeline или синхронного действия
const action = new AsyncAction(gsap.timeline().to(...));
action.start();
await action.onComplete;

// AsyncActionsScenario - последовательность актов
scenario.start();       // Начать сценарий
scenario.toNext();      // Следующий акт (пропускает false-guard)
scenario.skipAllIfPossible();  // Пропустить все пропускаемые
```

### ReelsMatrix

Двумерная матрица символов с поддержкой больших символов:
```javascript
matrix.setCell(row, col, data);
matrix.getCell(row, col);
matrix.forEach(callback, invertedRows, invertedColumns);
matrix.findSymbols('scatter');
matrix.placeBigSymbol(row, col, symbol);  // Символы >1x1
```

### GameLogic API

```javascript
await gameLogic.spin();           // Запрос спина
await gameLogic.freeSpin();       // Свободная игра
await gameLogic.buyFreeSpins();   // Покупка фриспинов
await gameLogic.setBet(bet);
gameLogic.balance;                // Текущий баланс
gameLogic.freeSpins;              // Очередь свободных игр
```

## Разработка движка (npm link)

```bash
# 1. В директории onearm
npm link

# 2. В директории игры
npm link onearm
npm run start  # Запускать из игры, не из onearm!

# 3. Возврат к git-версии
npm unlink onearm && npm install --force
```

## Релиз новой версии

```bash
# Из директории onearm (после коммита изменений)
npm run release           # Patch версия (0.1.4 → 0.1.5)
npm run release minor     # Minor версия (0.1.4 → 0.2.0)
npm run release major     # Major версия (0.1.4 → 1.0.0)
npm run release 0.2.0     # Конкретная версия

# После релиза
git push origin main --tags

# В игровом проекте
npm install --force       # Подтянуть новую версию
```

## Технологии

- **PIXI.js 7.4.2** - 2D рендеринг
- **GSAP 3.13** - анимации
- **Spine** (@esotericsoftware/spine-pixi-v7) - скелетные анимации
- **ESBuild** - сборка
- **typed-signals** - событийная система
- **ES Modules** - формат модулей
