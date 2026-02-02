import { BlurFilter } from "pixi.js";
import gsap from "gsap";
import { ReelAnimationStrategy } from "./ReelAnimationStrategy.js";

/**
 * @description Classic slot reel spinning animation strategy.
 * Symbols move continuously downward during spin, then stop with final matrix symbols.
 * @extends ReelAnimationStrategy
 */
export class SpinStrategy extends ReelAnimationStrategy {
    constructor(reel) {
        super(reel);
        this.speed = 0;
        this.targetSpeed = 4000;
        this.blur = new BlurFilter();
        this.reelStep = 0;
    }

    /**
     * @description Starts the spinning animation with acceleration
     * @returns {gsap.core.Timeline}
     */
    start() {
        this.blur.blurX = 0;
        this.blur.blurY = 0;
        gsap.killTweensOf(this);

        const timeline = gsap.timeline();

        this.reel.goToIdle();

        timeline
            .to(this, {
                speed: this.targetSpeed,
                duration: 0.5,
                ease: "back.in",
            })
            .call(() => {
                this.reel.filters = [this.blur];
            });

        return timeline;
    }

    /**
     * @description Stops the spin and replaces symbols with final matrix
     * @param {Object} matrix - Symbol matrix with final positions
     * @param {boolean} [force=false] - Immediate stop without animation
     * @returns {gsap.core.Timeline|void}
     */
    stop(matrix, force = false) {
        if (force) {
            gsap.killTweensOf(this);
            this.speed = 0;
            this.reelStep = 0;
            this.reel.filters = [];
            this.reel.replaceSymbols(matrix);
            this.reel.goToIdle();
            return;
        }

        this.reel.filters = [];

        const timeline = gsap.timeline();

        timeline.call(() => {
            gsap.killTweensOf(this);
            this.reel.filters = [];
            this.speed = 0;

            this.reel.replaceSymbols(matrix);
            this.reel.goToIdle();
        });

        return timeline;
    }

    /**
     * @description Updates symbol positions each frame during spin
     * @param {number} dt - Delta time
     */
    update(dt) {
        this.moveSymbols(dt);
    }

    /**
     * @description Moves symbols downward and handles recycling
     * @param {number} dt - Delta time
     * @private
     */
    moveSymbols(dt) {
        if (this.speed === 0) {
            return;
        }

        const symbolsToRemove = [];
        const step = dt * this.speed;
        this.blur.blurY = (this.speed / 3000) * 10;
        this.reelStep += step;

        this.reel.children.forEach(symbol => {
            if (this.reel.symbolIsSticky(symbol)) {
                return;
            }

            symbol.y += step;

            if (symbol.getTopBounds() > this.reel.reelHeight) {
                symbolsToRemove.push(symbol);
            }
        });

        symbolsToRemove.forEach(symbol => {
            this.reel.removeSymbol(symbol);
        });

        if (this.reelStep > this.reel.symbolHeight) {
            this.reelStep = 0;
            this.reel.createNextSymbol(-1);
        }
    }

    destroy() {
        gsap.killTweensOf(this);
        this.speed = 0;
        this.reelStep = 0;
    }
}

