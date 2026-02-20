---
name: release
description: Create a new engine release — bump version, update changelog, tag and push
argument-hint: "[patch|minor|major|x.y.z]"
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion
---

# Release Skill

Создание нового релиза движка onearm. Принимает необязательный аргумент типа версии: `patch`, `minor`, `major` или конкретную версию (например `1.0.0`).

Аргумент доступен как `$ARGUMENTS`.

## Шаги

### 1. Анализ изменений

- Определи текущую версию из `package.json`.
- Найди последний git-тег (`git tag --sort=-v:refname | head -1`).
- Получи список коммитов с последнего тега: `git log <last-tag>..HEAD --oneline --no-merges`.
- Если коммитов нет — сообщи пользователю и останови.

### 2. Определение типа версии

Если тип версии передан как аргумент — используй его. Иначе:

- Проанализируй коммиты по conventional commits:
  - `feat!:` или `BREAKING CHANGE` → предложи **major**
  - `feat:` → предложи **minor**
  - `fix:`, `chore:`, `docs:`, `refactor:` → предложи **patch**
- Покажи пользователю список изменений и предложенный тип.
- Спроси подтверждение через AskUserQuestion.

### 3. Генерация release message

На основе коммитов сгенерируй:
- Краткое описание релиза (1-2 предложения).
- Категоризированный список изменений в формате Keep a Changelog (Added/Changed/Fixed/Removed).

### 4. Обновление CHANGELOG.md

- Прочитай текущий `CHANGELOG.md`.
- Добавь новую секцию в начало (после заголовка), формат:
  ```
  ## [X.Y.Z] - YYYY-MM-DD

  ### Added
  - ...

  ### Changed
  - ...

  ### Fixed
  - ...
  ```
- Добавь ссылку на релиз в конец файла: `[X.Y.Z]: https://github.com/demansn/onearm/releases/tag/vX.Y.Z`
- Покажи пользователю итоговый changelog-блок и спроси подтверждение.

### 5. Обновление MIGRATION.md (только для minor/major)

Если релиз minor или major:
- Спроси пользователя: «Есть ли breaking changes или важные миграции для этой версии?»
- Если да — попроси описать или предложи сгенерировать на основе коммитов.
- Добавь новую секцию в `MIGRATION.md`.

### 6. Коммит, тег и пуш

- Закоммить изменённые файлы (`CHANGELOG.md`, `MIGRATION.md` если менялся): `git add CHANGELOG.md MIGRATION.md && git commit -m "<version>"`.
- Выполни `npm version <type> --no-git-tag-version` для обновления package.json.
- Закоммить: `git add package.json package-lock.json && git commit -m "<version>"`.
- Создай тег: `git tag v<version>`.
- Покажи итог и спроси подтверждение перед пушем.
- Выполни: `git push origin main --tags`.
