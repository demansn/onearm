import gsap from "gsap";
import { ReelAnimationStrategy } from "./ReelAnimationStrategy.js";

/**
 * @description Cascade/Tumble animation strategy for reels.
 * Symbols fall down sequentially and new symbols drop from top with bounce effect.
 * @extends ReelAnimationStrategy
 */
export class CascadeStrategy extends ReelAnimationStrategy {
    constructor(reel) {
        super(reel);
        this.fallDelay = 0.1;
        this.fallDuration = 0.25;
        this.dropDuration = 0.2;
        this.isAnimating = false;
    }

    /**
     * @description Starts cascade animation - symbols fall down and disappear
     * @param {boolean} [instant=false] - If true, all symbols fall simultaneously
     * @returns {gsap.core.Timeline}
     */
    start(instant = false) {
        this.isAnimating = true;
        const timeline = gsap.timeline();
        const symbols = [...this.reel.children];

        symbols.sort((a, b) => b.y - a.y);

        symbols.forEach((symbol, i) => {
            timeline.to(
                symbol,
                {
                    y: symbol.y + this.reel.reelHeight,
                    duration: this.fallDuration,
                    ease: "power1.in",
                    onComplete: () => {
                        this.reel.removeSymbol(symbol);
                    },
                },
                instant ? 0 : i * this.fallDelay
            );
        });

        return timeline;
    }

    /**
     * @description Stops cascade and fills reel with new symbols from matrix
     * @param {Object} matrix - Symbol matrix with final positions
     * @param {boolean} [force=false] - Immediate stop without animation
     * @param {string} [spinType="normal"] - Spin type: "normal", "turbo", "quick"
     * @returns {gsap.core.Timeline|void}
     */
    stop(matrix, force = false, spinType = "normal") {
        if (force) {
            this.forceStop(matrix);
            return;
        }

        const timeline = gsap.timeline();

        timeline.add(this.fillFromTop(matrix, spinType));

        return timeline;
    }

    /**
     * @description Quick stop - all symbols drop simultaneously with minimal delay and faster speed
     * @param {Object} matrix - Symbol matrix with final positions
     * @param {number} [delay=0] - Delay before starting animation
     * @param {string} [spinType="normal"] - Spin type: "normal", "turbo", "quick"
     * @returns {gsap.core.Timeline}
     */
    quickStop(matrix, delay = 0, spinType = "normal") {
        this.clearRemainingSymbols();

        const timeline = gsap.timeline();
        const symbolsData = [];

        matrix.forEachColumn(this.reel.column, (row, column, symbolData) => {
            if (symbolData) {
                symbolsData.push({ row, symbolData });
            }
        });

        symbolsData.sort((a, b) => b.row - a.row);

        let startRow = 0;
        const quickFallDelay = 0.02;
        const quickDropDuration = 0.25;

        symbolsData.forEach(({ row, symbolData }, i) => {
            startRow -= 1;

            const symbol = this.reel.addNewSymbol(symbolData, startRow);
            const targetY = row * this.reel.symbolHeight;

            const tl = gsap.timeline();

            if (spinType !== "turbo") {
                tl.add(symbol.playDropAnimation(0.2), 0.3);
            }
            tl.to(
                symbol,
                {
                    y: targetY,
                    duration: quickDropDuration,
                    ease: "power2.in",
                },
            0);

            timeline.add(tl, delay + i * quickFallDelay);
        });

        return timeline;
    }

    /**
     * @description Creates new symbols above reel and drops them to positions
     * @param {Object} matrix - Symbol matrix with final positions
     * @returns {gsap.core.Timeline}
     * @private
     */
    fillFromTop(matrix, spinType = "normal") {
        const timeline = gsap.timeline();
        const symbolsData = [];

        matrix.forEachColumn(this.reel.column, (row, column, symbolData) => {
            if (symbolData) {
                symbolsData.push({ row, symbolData });
            }
        });

        symbolsData.sort((a, b) => b.row - a.row);

        let startRow = 0;

        symbolsData.forEach(({ row, symbolData }, i) => {
            startRow -= 1;

            const symbol = this.reel.addNewSymbol(symbolData, startRow);
            const targetY = row * this.reel.symbolHeight;
            const delay = i * this.fallDelay;
            const distance = targetY - symbol.y;
            const dropAnimationDuration = 0.35;
            const duration = dropAnimationDuration + (distance / this.reel.symbolHeight) * 0.05;

            const tl = gsap.timeline();

            if (spinType !== "turbo") {
                tl.add(symbol.playDropAnimation(), 0);
            }
            tl.to(
                symbol,
                {
                    y: targetY,
                    duration: duration,
                    ease: "power1.in",
                },
            0);

            timeline.add(tl, delay);
        });

        return timeline;
    }

    /**
     * @description Forces immediate stop without animations
     * @param {Object} matrix - Symbol matrix with final positions
     * @private
     */
    forceStop(matrix) {
        gsap.killTweensOf(this.reel.children);
        this.clearRemainingSymbols();
        this.reel.replaceSymbols(matrix);
        this.reel.goToIdle();
        this.isAnimating = false;
    }

    /**
     * @description Clears remaining symbols from reel
     * @private
     */
    clearRemainingSymbols() {
        const symbols = [...this.reel.children];
        symbols.forEach(symbol => {
            this.reel.removeSymbol(symbol);
        });
    }

    update(dt) {}

    destroy() {
        this.isAnimating = false;
        gsap.killTweensOf(this.reel.children);
    }
}

