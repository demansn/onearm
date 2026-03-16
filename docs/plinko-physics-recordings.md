# Plinko: Pre-Recorded Physics Animations

## Overview

Instead of running real-time physics in the browser, Plinko uses pre-recorded ball trajectories:

1. **Offline** — `plinko-recorder.js` runs matter.js simulations and saves keyframe data
2. **JSON files** — one file per pocket, each containing 5–10 trajectory recordings
3. **Runtime** — server says "ball → pocket X" → engine picks a recording from the pool → plays it back via GSAP

**Benefits:** realistic physics, predictable results, variety (multiple recordings per pocket), themed physics (water, heavy gravity, etc.)

## Board Config

Create `src/configs/plinko-board.js` in your game:

```js
import { PlinkoPhysicsPresets } from "onearm/slots";

export const PlinkoBoard = {
    rows: 12,           // number of peg rows
    pegRadius: 6,       // peg circle radius (px)
    pegSpacing: 40,     // horizontal distance between pegs (px)
    rowSpacing: 35,     // vertical distance between rows (px)
    ballRadius: 10,     // ball radius (px)
    pockets: 13,        // number of pockets (rows + 1)

    spawn: {
        x: 0.5,         // normalised horizontal position (0..1, 0.5 = centre)
        y: -20,         // vertical offset above first peg row (px)
        variance: 0.4,  // random spread (fraction of pegSpacing) for recording variety
    },

    physics: PlinkoPhysicsPresets.classic,
};
```

Board geometry is derived from the config:
- Width = `(pockets - 1) * pegSpacing`
- Height = `rows * rowSpacing`

## Physics Presets

### classic
Pachinko-style: crisp bounces, standard gravity.

### water
Slow descent, dampened bounces, floating feel — lower gravity, higher friction, lower restitution.

### Custom preset
Override any field in the physics object:

```js
physics: {
    ...PlinkoPhysicsPresets.classic,
    restitution: 0.7,  // bouncier
    gravity: { x: 0, y: 1.5 },  // heavier
},
```

## Generating Recordings

```bash
node scripts/plinko-recorder.js \
    --board=games/my-game/src/configs/plinko-board.js \
    --recordings=5 \
    --theme=classic \
    --output=games/my-game/assets/plinko/classic
```

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--board` | (required) | Path to board config JS file |
| `--recordings` | 5 | Number of recordings per pocket |
| `--theme` | default | Theme name (used in output path) |
| `--output` | `assets/plinko/<theme>/` | Output directory |

The recorder tries multiple simulations per pocket, discarding any that don't land in the target pocket. Output: `pocket-00.json` through `pocket-12.json`.

## Data Format

Each `pocket-XX.json` contains an array of recordings:

```json
[
  {
    "pocket": 5,
    "duration": 2.1,
    "keyframes": [
      { "t": 0,    "x": 0,    "y": -20 },
      { "t": 0.05, "x": -2,   "y": 15,  "bounce": true },
      { "t": 0.12, "x": -15,  "y": 52 },
      { "t": 2.1,  "x": -40,  "y": 465 }
    ]
  }
]
```

- `t` — time in seconds
- `x, y` — position in board coordinates (0,0 = top centre)
- `bounce` — collision marker (for SFX triggers)
- Keyframe reduction keeps ~30–50 keyframes per recording (direction changes + anchors)
- Typical size: ~1–2 KB per recording, ~78 KB total for 13 pockets × 5 recordings

## Playback API

### PlinkoRecordingPool

Round-robin selector — ensures animations don't repeat consecutively.

```js
import { PlinkoRecordingPool } from "onearm/slots";

const pool = new PlinkoRecordingPool();

// Load from asset pipeline
await resources.load("plinko-classic");
for (let i = 0; i < board.pockets; i++) {
    pool.load(i, resources.get(`pocket-${String(i).padStart(2, "0")}`));
}

// Get next recording for a pocket
const recording = pool.get(5);
```

### plinkoBall clip

Animates a display object along a recorded trajectory:

```js
const anim = services.get("animations");
const tl = anim.get("plinkoBall")(ball, {
    recording,
    timeScale: 1,    // 1.5 for turbo mode
    sfx: true,       // play bounce sounds
});
```

### PlinkoDropAct integration

```js
class PlinkoDropAct extends PresentationAct {
    action() {
        const recording = this.recordingPool.get(this.pocketIndex);
        const ball = this.plinkoScene.acquireBall();
        const tl = this.anim.get("plinkoBall")(ball, {
            recording,
            timeScale: this.data.turbo ? 1.5 : 1,
        });
        tl.add(() => this.plinkoScene.onBallLanded(ball, this.pocketIndex));
        return tl;
    }
}
```

## Customisation

### Override clip in GameConfig

```js
// GameConfig.js
animations: {
    plinkoBall: myCustomPlinkoBall,
},
```

### Multiple balls with stagger

```js
import { stagger } from "onearm/slots";

const tl = stagger(
    ballDrops,
    (drop) => anim.get("plinkoBall")(drop.ball, { recording: drop.recording }),
    0.3,  // 300ms between drops
);
```

## Asset Pipeline Integration

Plinko recordings are auto-discovered by `generate-manifest.js`:
- `assets/plinko/<theme>/pocket-*.json` → bundle `plinko-<theme>`
- Load at runtime: `await resources.load("plinko-classic")`

## Troubleshooting

**Recordings don't match the board visually** — Re-generate after changing any board config values (`rows`, `pegSpacing`, etc.). The recorder and game must use the same config.

**Too few recordings landing in edge pockets** — Increase `--recordings` or raise `spawn.variance`. Edge pockets are naturally harder to hit from the centre.

**Ball animation looks jerky** — The keyframe reduction may be too aggressive. Lower `ANCHOR_INTERVAL` in the recorder (default: 6) for smoother paths at the cost of slightly larger files.
