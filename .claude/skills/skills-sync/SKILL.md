---
name: skills-sync
description: "Synchronizes all project skills with the current engine state after releases. Use after major/minor engine releases, when skills reference outdated APIs, or when the user says: 'обнови скиллы', 'синхронизируй скиллы', 'update skills', 'skills outdated', 'sync skills after release'. Also trigger when the user mentions that a skill has wrong or outdated information about the engine, or after running the release skill for minor/major versions."
---

# Skills Sync

You maintain the accuracy of all project skills in `.claude/skills/` after engine changes. Skills contain hardcoded references to engine APIs, class methods, service names, and architectural patterns that become outdated when the engine evolves. Your job is to find and fix these inconsistencies.

**Use ultrathink for every sync task.** You need to carefully compare engine source code against skill content to catch subtle API drift — a renamed parameter, a changed return type, or a removed method can make skill examples silently wrong.

## Workflow

### Step 1: Determine What Changed

Figure out what changed in the engine since the skills were last accurate.

**If triggered after a release:**
```bash
# Find the two most recent tags
git tag --sort=-v:refname | head -2
# Diff between them, focusing on engine modules
git diff <old-tag> <new-tag> -- modules/engine/ modules/slots/
```

**If triggered manually (user says skills are outdated):**
```bash
# Check what changed since the last tagged release
git log --oneline --since="1 month ago" -- modules/engine/ modules/slots/
# Or diff against the last tag
git diff $(git tag --sort=-v:refname | head -1) HEAD -- modules/engine/ modules/slots/
```

**Focus your analysis on high-impact changes:**
1. **Public API exports** — `modules/engine/index.js`, `modules/slots/index.js`. Any added/removed/renamed export breaks skill import examples.
2. **Service names and init order** — `modules/engine/configs/services.config.js`. Skills reference services by name (`services.get("audio")`).
3. **Method signatures** — changed parameters, return types, or removed methods in key classes (Game, Scene, BaseContainer, GameLogic, Reels, PresentationAct, etc.)
4. **New patterns or deprecated ones** — new flow helpers, changed act composition, new reel strategies.
5. **Constructor changes** — especially in classes that skills show how to extend (Scene, PresentationAct, BaseGameState, ReelAnimationStrategy).

### Step 2: Audit All Skills

Read every skill and its reference files. For each file, check whether it references anything that changed.

**Read the skill quality guide first:** `references/skill-quality-guide.md` — it has the complete map of which skill documents what, so you know where to look.

For each skill file:
1. Read the full content
2. Search for mentions of changed APIs, methods, classes, services
3. Note the exact lines and what needs updating
4. Check code examples — do they still work with the current engine?

**Don't skip any skill.** Even `commit` and `release` skills may reference engine-specific paths or commands.

### Step 3: Update Skills

For each outdated reference found:

1. **Read the current engine source** to understand the new API/pattern
2. **Edit the skill file** with the corrected information
3. **Preserve the skill's style and format** — each skill has its own voice and structure, don't homogenize them
4. **Remove outdated content** rather than just adding new — skills should stay lean

**Rules for editing skills effectively:**

- **SKILL.md must stay under 500 lines.** If it's growing, move details to reference files.
- **Reference files should stay under 300 lines.** If they're growing, consider splitting by subsystem.
- **Don't duplicate information** between SKILL.md and its reference files. SKILL.md has the workflow and high-level concepts; references have the detailed API docs and examples.
- **Code examples must be real and working.** Don't show import paths or method calls that don't exist. When updating an example, read the actual source to verify every import, method name, and parameter.
- **Explain why, not just what.** Instead of "ALWAYS use scope.defer()", explain that scope.defer() is how flows clean up resources and without it you'll leak event handlers.
- **Delete, don't comment out.** If an API was removed, remove its documentation entirely. Don't leave "// removed in v0.6" comments.
- **Match existing style.** If a reference file uses ASCII diagrams, keep them. If it uses bullet lists for API docs, keep that format.
- **Keep descriptions accurate.** If a class gained new methods, add them. If parameters changed, update them. If behavior changed, update the explanation.

### Step 4: Report

After all updates, show the user a summary:

```
## Skills Sync Report

### Changes detected (vX.Y.Z → vA.B.C)
- [list key engine changes]

### Updated skills
- **game-dev/SKILL.md** — updated service access example (lines X-Y)
- **game-dev/references/acts-system.md** — added new FooAct, updated PaysAct signature
- **engine-dev/references/architecture.md** — updated ServicesConfig order, added new service
- ...

### No changes needed
- commit, release — no engine-specific references affected
```

## What NOT to Do

- **Don't rewrite skills from scratch.** Make targeted updates to the parts that are actually wrong.
- **Don't add information "while you're at it."** Only update what's actually outdated or incorrect.
- **Don't change skill frontmatter** (name, description, triggers) unless the skill's scope genuinely changed.
- **Don't update version numbers in tech stack** unless the user explicitly bumped them (e.g., PIXI 8.7 → 8.8).
- **Don't run the build or tests** — this skill only reads engine code and edits skill files.
