import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import { Reel } from "./Reel.js";
import { CascadeStrategy } from "./strategies/CascadeStrategy.js";

export class Reels extends Container {
    constructor(data) {
        super();
        this.options = data;
        this.symbolWidth = data.symbolWidth;
        this.reelWidth = data.reelWidth;
        this.rows = data.rows;
        this.columns = data.columns;
        this.onlyLowSymbols = false;

        /**
         *
         * @type {Reel[]}
         */
        this.reels = [];

        for (let column = 0; column < this.columns; column++) {
            const reel = new Reel({ AnimationStrategy: CascadeStrategy, index: column, ...data });

            reel.x = (this.reelWidth + this.options.gap.betweenColumns) * column;

            this.reels.push(reel);
            this.addChild(reel);
        }
    }


    /**
     * @param {boolean} [instant=false] - If true, all columns fall simultaneously
     * @returns {gsap.core.Timeline}
     */
    spin(instant = false) {
        const timeline = gsap.timeline();

        for (let column = 0; column < this.columns; column++) {
            const delay = instant ? 0 : 0.1 * column;

            timeline.add(this.reels[column].startSpin(instant), delay);
        }

        return timeline;
    }

    stop(matrix, force = false, spinType = "normal") {
        if (force) {
            gsap.killTweensOf(this);
            this.reels.forEach(reel => reel.stop(matrix, force, spinType));
            return;
        }

        const timeline = gsap.timeline();

        this.reels.forEach((reel, i) => {
            const delay = 0.1 * i;

            timeline.add(reel.stop(matrix, force, spinType), delay);
            timeline.playSfx("reel_stop");
        });

        return timeline;
    }

    /**
     * @description Quick stop - all reels drop simultaneously with minimal delay
     * @param {Object} matrix - Symbol matrix with final positions
     * @param {string} [spinType="normal"] - Spin type: "normal", "turbo", "quick"
     * @returns {gsap.core.Timeline}
     */
    quickStop(matrix, spinType = "normal") {
        gsap.killTweensOf(this);

        const timeline = gsap.timeline();
        const quickReelDelay = 0.02;

        this.reels.forEach((reel, i) => {
            gsap.killTweensOf(reel.children);
            timeline.add(reel.quickStop(matrix, i * quickReelDelay, spinType), 0);
        });

        timeline.playSfx("reel_stop");

        return timeline;
    }

    step({ dt }) {
        this.reels.forEach(reel => {
            reel.update(dt);
        });
    }

    setStickySymbols(stickyPostions) {
        const stickySymbolsByColumn = {};

        stickyPostions.forEach(({ column, row }) => {
            if (!stickySymbolsByColumn[column]) {
                stickySymbolsByColumn[column] = [];
            }

            stickySymbolsByColumn[column].push({ row });
        });

        this.reels.forEach((reel, index) => {
            reel.setStickySymbols(stickySymbolsByColumn[index]);
        });
    }

    replaceSymbols(matrix, onlyNewSymbols = false) {
        for (let i = 0; i < this.reels.length; i++) {
            this.reels[i].replaceSymbols(matrix, onlyNewSymbols);
        }
    }

    /**
     * @param {Array<{row: number, column: number}>} positions - Symbol positions
     * @param {boolean} [turboMode=false] - Turbo mode for instant animations
     * @returns {gsap.core.Timeline}
     */
    playWinAnimationsByPositions(positions, turboMode = false) {
        const timeline = gsap.timeline();
        const getSymbolWinAnimation = ({ row, column }) => {
            const symbol = this.getSymbolByPosition({ row, column });
            return symbol.playWinAnimation(turboMode);
        };
        timeline.add(positions.map(getSymbolWinAnimation));

        return timeline;
    }

    removeSymbolsByPositions(positions) {
        positions.forEach(({ row, column }) => {
            this.reels[column].removeSymbol(this.getSymbolByPosition({ row, column }));
        });
    }

    /**
     * @description Gets fly animation for a single multiplier symbol
     * @param {number} row - Symbol row
     * @param {number} column - Symbol column
     * @param {{x: number, y: number}} targetGlobalPos - Target global position
     * @returns {gsap.core.Timeline}
     */
    getMultiplierFlyAnimation(row, column, targetGlobalPos) {
        const reel = this.reels[column];
        if (!reel) {
            return gsap.timeline();
        }

        const symbol = reel.getSymbolByRow(row);
        if (!symbol || !symbol.getMultiplierFlyAnimation) {
            return gsap.timeline();
        }

        return symbol.getMultiplierFlyAnimation(targetGlobalPos);
    }

    goToIdle() {
        this.reels.forEach(reel => {
            reel.goToIdle();
        });
    }

    /**
     * @param {{row: number, column: number}} position - Symbol position
     * @returns {ReelSymbol}
     */
    getSymbolByPosition({ row, column }) {
        return this.reels[column].getSymbolByRow(row);
    }

    /**
     * @description Adds new symbol at specified position
     * @param {{row: number, column: number}} position - Position to add symbol at
     * @param {Object} data - Symbol data
     * @returns {ReelSymbol}
     */
    addNewSymbol({ row, column }, data) {
        return this.reels[column].addNewSymbol(data, row);
    }

    /**
     * Очистить глобальный пул символов
     */
    clearSymbolPool() {
        const symbolPool = SymbolPool.getInstance();
        symbolPool.clear();
    }

    /**
     * Получить статистику глобального пула
     */
    getPoolStats() {
        const symbolPool = SymbolPool.getInstance();
        return symbolPool.getStats();
    }

    /**
     * Вывести статистику пула в консоль
     */
    logPoolStats() {
        const symbolPool = SymbolPool.getInstance();
        symbolPool.logStats();
    }

    destroy(_options) {
        // Очистить глобальный пул при уничтожении
        this.clearSymbolPool();
        super.destroy(_options);
    }
}


const reels = [
    [

    ]
]
