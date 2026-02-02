/**
 * @abstract
 * @description Base class for reel animation strategies. Implements Strategy pattern for different reel animations.
 */
export class ReelAnimationStrategy {
    /**
     * @param {import('../Reel.js').Reel} reel - The reel instance this strategy controls
     */
    constructor(reel) {
        this.reel = reel;
    }

    /**
     * @description Starts the animation sequence
     * @returns {gsap.core.Timeline} GSAP timeline for the animation
     */
    start() {
        throw new Error("Method 'start' must be implemented");
    }

    /**
     * @description Stops the animation and sets final symbols from matrix
     * @param {Object} matrix - Symbol matrix with final positions
     * @param {boolean} [force=false] - If true, stops immediately without animation
     * @returns {gsap.core.Timeline|void} GSAP timeline or void if force stop
     */
    stop(matrix, force = false) {
        throw new Error("Method 'stop' must be implemented");
    }

    /**
     * @description Quick stop with minimal delay - all symbols drop simultaneously
     * @param {Object} matrix - Symbol matrix with final positions
     * @param {number} [delay=0] - Delay before starting animation
     * @returns {gsap.core.Timeline}
     */
    quickStop(matrix, delay = 0) {
        return this.stop(matrix);
    }

    /**
     * @description Called every frame during animation
     * @param {number} dt - Delta time since last frame
     */
    update(dt) {}

    /**
     * @description Cleans up resources when strategy is changed or destroyed
     */
    destroy() {}
}

