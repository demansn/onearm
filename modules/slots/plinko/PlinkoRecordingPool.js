/**
 * Round-robin selector for pre-recorded Plinko ball trajectories.
 * Each pocket holds an array of recordings; `get()` cycles through them
 * so the same animation never plays twice in a row.
 */
export class PlinkoRecordingPool {
    constructor() {
        /** @type {Map<number, Array>} */
        this._pools = new Map();
    }

    /**
     * Load recordings for a pocket.
     * @param {number} pocketIndex
     * @param {Array} recordings — array of {pocket, duration, keyframes}
     */
    load(pocketIndex, recordings) {
        this._pools.set(pocketIndex, [...recordings]);
    }

    /**
     * Get next recording for pocket (round-robin).
     * @param {number} pocketIndex
     * @returns {{ pocket: number, duration: number, keyframes: Array }}
     */
    get(pocketIndex) {
        const pool = this._pools.get(pocketIndex);
        if (!pool || pool.length === 0) {
            throw new Error(`No recordings for pocket ${pocketIndex}`);
        }
        const recording = pool.shift();
        pool.push(recording);
        return recording;
    }

    /**
     * Bulk-load from a map: { pocketIndex: recordings[] }
     * @param {Object} map
     * @returns {PlinkoRecordingPool}
     */
    static fromMap(map) {
        const pool = new PlinkoRecordingPool();
        for (const [index, recordings] of Object.entries(map)) {
            pool.load(Number(index), recordings);
        }
        return pool;
    }
}
