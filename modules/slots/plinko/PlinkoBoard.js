/**
 * Computes peg and pocket positions from a PlinkoBoard config.
 * Shared between recorder (Node) and runtime (browser).
 */
export class PlinkoBoard {
    constructor(config) {
        this.rows = config.rows;
        this.pegRadius = config.pegRadius;
        this.pegSpacing = config.pegSpacing;
        this.rowSpacing = config.rowSpacing;
        this.ballRadius = config.ballRadius;
        this.pockets = config.pockets;
        this.spawn = config.spawn;
        this.physics = config.physics;

        this.width = (this.pockets - 1) * this.pegSpacing;
        this.height = this.rows * this.rowSpacing;
    }

    /**
     * Returns peg positions as [{x, y}, ...].
     * Row 0 has 1 peg centred, row 1 has 2, etc. (triangle grid).
     * Origin (0, 0) = top-centre of the board.
     */
    getPegPositions() {
        const pegs = [];
        for (let row = 0; row < this.rows; row++) {
            const count = row + 1;
            const offsetX = -(count - 1) * this.pegSpacing * 0.5;
            const y = row * this.rowSpacing;
            for (let col = 0; col < count; col++) {
                pegs.push({ x: offsetX + col * this.pegSpacing, y });
            }
        }
        return pegs;
    }

    /**
     * Returns pocket centre X positions (origin = board centre).
     * Pockets sit below the last row.
     */
    getPocketPositions() {
        const positions = [];
        const count = this.pockets;
        const offsetX = -(count - 1) * this.pegSpacing * 0.5;
        for (let i = 0; i < count; i++) {
            positions.push(offsetX + i * this.pegSpacing);
        }
        return positions;
    }

    /**
     * Compute real spawn X from normalised config + optional random variance.
     * @param {function} [rng] — returns float in [-1, 1]. Defaults to 0 (centre).
     */
    getSpawnX(rng) {
        const baseX = (this.spawn.x - 0.5) * this.width;
        const variance = rng ? rng() * this.spawn.variance * this.pegSpacing : 0;
        return baseX + variance;
    }

    getSpawnY() {
        return this.spawn.y;
    }
}
