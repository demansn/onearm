# ReelsLayout — Column-Based Configuration

## Figma Structure

```
ReelsLayout (component)
├── ReelConfig (FRAME, column 0)
│   ├── SymbolConfig (cell 0)
│   ├── SymbolConfig (cell 1)
│   └── ...
├── ReelConfig (FRAME, column 1)
│   └── ...
├── shadow (optional)
├── mask (optional)
└── frame (optional)
```

The exporter looks for a child named `"reels"` (FRAME) inside `ReelsLayout`. If not found, it uses the `ReelsLayout` node itself as the reels container. Column children are FRAMEs with children, sorted by x position.

## JSON Config Format

```json
{
  "name": "ReelsLayout",
  "type": "ReelsLayoutConfig",
  "reels": {
    "x": 8,
    "y": 0,
    "symbolWidth": 104,
    "symbolHeight": 104,
    "rows": 5,
    "columns": [
      { "x": 0, "rows": 5, "width": 104 },
      { "x": 139, "rows": 5, "width": 104 },
      { "x": 278, "rows": 5, "width": 104 },
      { "x": 417, "rows": 5, "width": 104 },
      { "x": 556, "rows": 5, "width": 104 },
      { "x": 695, "rows": 5, "width": 104 }
    ]
  }
}
```

### Fields

| Field | Description |
|-------|-------------|
| `reels.x`, `reels.y` | Offset of the reels container (from padding or child position) |
| `reels.symbolWidth` | Symbol width from first cell of first column |
| `reels.symbolHeight` | Symbol height from first cell of first column |
| `reels.rows` | Default row count (from first column) |
| `reels.columns[].x` | X position of the column within the reels container |
| `reels.columns[].rows` | Number of rows in this column (can differ per column) |
| `reels.columns[].width` | Width of the column |

There is no `gap` field — gaps are implicit from per-column `x` positions.

## Engine Usage

### ReelsScene.js

```js
const config = this.layouts.getConfig("ReelsLayout");
const reelsConfig = config.reels;

const params = {
    ...reelsConfig,
    reelsSymbols: new ReelsSymbols(this.options.symbols),
};

this.reels = this.createObject(Reels, { params, x: reelsConfig.x, y: reelsConfig.y });
```

### Reels.js

`Reels` iterates over `columns` array. Each column creates a `Reel` instance positioned at `col.x` with per-column `rows` and `width`.

```js
for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const reel = new Reel({
        AnimationStrategy: CascadeStrategy,
        index: i,
        rows: col.rows ?? rows,
        symbolWidth,
        symbolHeight,
        reelWidth: col.width ?? symbolWidth,
        reelHeight: symbolHeight * (col.rows ?? rows),
        reelsSymbols,
    });
    reel.x = col.x;
}
```

## Diamond-Shaped Grids

For non-rectangular grids (e.g., 3-4-5-4-3 rows), each column can have a different `rows` value. The top-level `rows` field is a convenience default from the first column.
