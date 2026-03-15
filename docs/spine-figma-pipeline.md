# Spine Assets → Figma Components Pipeline

## Overview

Инструмент для автоматического создания Figma-компонентов из Spine-ассетов. Пайплайн:

1. **CLI** сканирует Spine-ассеты игры, вычисляет размеры каждой анимации
2. Генерирует **spine-manifest.json** с информацией о скелетах, анимациях и их размерах
3. **Figma plugin** читает манифест и создаёт ComponentSet для каждого скелета — по варианту на анимацию

Это позволяет дизайнерам размещать Spine-компоненты в layout с правильными размерами, а `export-components` автоматически подхватывает их как `SpineAnimation`.

## CLI: `onearm-figma generate-spine`

```bash
node bin/onearm-figma.js generate-spine --game=<game-name> [--output=<path>]
```

**Флаги:**

| Флаг | Описание | Default |
|------|----------|---------|
| `--game` | Имя игры (папка в `games/`) | обязательный |
| `--output` | Путь для выходного файла | `spine-manifest.json` в текущей директории |

**Что делает:**

1. Сканирует `games/<game>/assets/spine/` — находит `.json` и `.skel` скелеты
2. Парсит каждый скелет, извлекает список анимаций и skins
3. Вычисляет bounds каждой анимации по размерам attachment-ов
4. Записывает результат в `spine-manifest.json`

**Ключевые файлы:**
- `tools/figma/src/commands/generate-spine.ts` — реализация CLI-команды
- `tools/figma/src/spine/scanSpineAssets.ts` — сканер и парсер Spine-ассетов

## Формат манифеста

**Типы** (из `tools/figma/src/spine/types.ts`):

```typescript
interface SpineManifest {
    skeletons: SpineEntry[];
}

interface SpineEntry {
    name: string;           // имя скелета (имя папки или файла)
    path: string;           // относительный путь к skeleton-файлу
    skins: string[];        // список skins
    animations: AnimationInfo[];
}

interface AnimationInfo {
    name: string;           // имя анимации
    width: number;          // вычисленная ширина (px)
    height: number;         // вычисленная высота (px)
}
```

**Пример `spine-manifest.json`:**

```json
{
    "skeletons": [
        {
            "name": "zeus",
            "path": "assets/spine/characters/zeus/zeus.skel",
            "skins": ["default", "golden"],
            "animations": [
                { "name": "idle", "width": 320, "height": 480 },
                { "name": "win", "width": 400, "height": 520 },
                { "name": "appear", "width": 350, "height": 500 }
            ]
        }
    ]
}
```

## Figma Plugin

### Установка

1. В Figma: **Plugins → Development → Import plugin from manifest...**
2. Указать путь к `tools/figma/plugin/manifest.json`

**Файлы плагина:**
- `tools/figma/plugin/manifest.json` — манифест плагина для Figma
- `tools/figma/plugin/code.ts` — логика создания компонентов
- `tools/figma/plugin/ui.html` — UI плагина

### Workflow

1. Запустить плагин в Figma
2. Выбрать файл `spine-manifest.json` (сгенерированный CLI)
3. Нажать **Create Components**
4. Плагин создаст ComponentSet для каждого скелета

## Что создаётся в Figma

Для каждого скелета из манифеста создаётся **ComponentSet**:

- **Имя ComponentSet** = имя скелета (например, `zeus`)
- **Варианты** — по одному Component на каждую анимацию
- **Размер каждого варианта** соответствует вычисленным bounds анимации (у разных анимаций разные размеры)

**Component properties на каждом варианте:**

| Property | Тип | Описание |
|----------|-----|----------|
| `spine` | string | Имя скелета |
| `animation` | string | Имя анимации |
| `autoPlay` | boolean | Автозапуск анимации |
| `loop` | boolean | Зациклить анимацию |
| `skin` | string | Skin скелета |

Дизайнеры используют instance этих компонентов в layout-сценах. Каждый instance несёт в себе все параметры для воспроизведения Spine-анимации.

## Интеграция с export pipeline

При экспорте компонентов (`export-components`) Spine-instance обрабатываются автоматически:

1. `export-components` обнаруживает instance Spine-компонента в layout
2. Срабатывает `postProcessSpine` в `specialProcessors.ts`
3. Instance преобразуется в конфиг:

```json
{
    "type": "SpineAnimation",
    "params": {
        "spine": "zeus",
        "animation": "idle",
        "autoPlay": true,
        "loop": true,
        "skin": "default"
    }
}
```

4. `LayoutBuilder` при build создаёт `SpineAnimation` display object с указанными параметрами

## Вычисление размеров анимаций

Размеры (bounds) каждой анимации вычисляются по attachment-ам в skins скелета:

1. Парсится skeleton-файл (`.json` или `.skel`)
2. Для каждого skin извлекаются attachment-ы (region, mesh и т.д.)
3. Из attachment-ов берутся `width`/`height` и позиция
4. Вычисляется bounding box, покрывающий все attachment-ы анимации

**Поддержка форматов:**
- **Spine 3.x** — skins как dictionary (`{ "skinName": { "slotName": { ... } } }`)
- **Spine 4.x** — skins как array (`[ { "name": "skinName", "attachments": { ... } } ]`)

Оба формата обрабатываются прозрачно в `scanSpineAssets.ts`.
