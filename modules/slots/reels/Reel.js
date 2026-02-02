import { Container } from "pixi.js";
import gsap from "gsap";
import { services } from "@slot/engine";
import { ReelSymbol } from "./ReelSymbol.js";
import { SymbolPool } from "../SymbolPool.js";
import { SpinStrategy } from "./strategies/SpinStrategy.js";

/**
 * @description Single reel container that manages symbols and animation.
 * Supports different animation strategies via Strategy pattern.
 * @extends Container
 */
export class Reel extends Container {
    /**
     * @param {Object} data - Reel configuration
     * @param {number} data.index - Column index of this reel
     * @param {Object} data.reelsSymbols - Symbol generator
     * @param {number} data.symbolHeight - Height of each symbol
     * @param {number} data.symbolWidth - Width of each symbol
     * @param {number} data.reelHeight - Total reel height
     * @param {number} data.reelWidth - Total reel width
     * @param {number} data.rows - Number of visible rows
     * @param {import('./strategies/ReelAnimationStrategy.js').ReelAnimationStrategy} [data.AnimationStrategy] - Animation strategy instance
     */
    constructor(data) {
        super();

        this.column = data.index;
        this.reelsSymbols = data.reelsSymbols;
        this.symbolHeight = data.symbolHeight;
        this.symbolWidth = data.symbolWidth;
        this.reelHeight = data.reelHeight;
        this.reelWidth = data.reelWidth;
        this.rows = data.rows;
        this.data = data;
        this.symbols = [];
        this.symbolPool = SymbolPool.getInstance();

        const {
            AnimationStrategy = SpinStrategy,
        } = data;

        this.animationStrategy = new AnimationStrategy(this);

        for (let row = this.rows - 1; row >= 0; row -= 1) {
            this.createNextSymbol(row);
        }
    }

    /**
     * @description Sets the animation strategy for this reel
     * @param {import('./strategies/ReelAnimationStrategy.js').ReelAnimationStrategy} strategy - New animation strategy
     */
    setAnimationStrategy(strategy) {
        if (this.animationStrategy) {
            this.animationStrategy.destroy();
        }
        this.animationStrategy = strategy;
    }

    /**
     * @description Starts the reel animation using current strategy
     * @returns {gsap.core.Timeline}
     */
    startSpin(instant = false) {
        return this.animationStrategy.start(instant);
    }

    /**
     * @description Stops the reel animation using current strategy
     * @param {Object} matrix - Symbol matrix with final positions
     * @param {boolean} [force=false] - Immediate stop without animation
     * @param {string} [spinType="normal"] - Spin type: "normal", "turbo", "quick"
     * @returns {gsap.core.Timeline|void}
     */
    stop(matrix, force = false, spinType = "normal") {
        return this.animationStrategy.stop(matrix, force, spinType);
    }

    /**
     * @description Quick stop - drops symbols simultaneously with minimal delay
     * @param {Object} matrix - Symbol matrix with final positions
     * @param {number} [delay=0] - Delay before starting animation
     * @param {string} [spinType="normal"] - Spin type: "normal", "turbo", "quick"
     * @returns {gsap.core.Timeline}
     */
    quickStop(matrix, delay = 0, spinType = "normal") {
        return this.animationStrategy.quickStop(matrix, delay, spinType);
    }

    /**
     * @description Resets all symbols to idle state
     */
    goToIdle() {
        this.children.forEach(symbol => {
            gsap.killTweensOf(symbol);
            symbol.gotToIdle();

            if (this.symbolIsSticky(symbol)) {
                symbol.parentLayer = services.layers.symbolsAnimationLayer;
            }
        });
    }

    /**
     * @description Called every frame to update animation
     * @param {number} dt - Delta time
     */
    update(dt) {
        this.animationStrategy.update(dt);
    }

    /**
     * @description Creates next symbol from reel strip
     * @param {number} row - Row position for new symbol
     */
    createNextSymbol(row) {
        const symbolData = this.reelsSymbols.next(this.column, this.onlyLowSymbols);
        this.addNewSymbol(symbolData, row);
    }

    /**
     * @description Adds symbol to reel display list
     * @param {ReelSymbol} symbol - Symbol to add
     */
    addSymbol(symbol) {
        this.addChild(symbol);
    }

    /**
     * @description Creates a symbol instance from pool
     * @param {Object} data - Symbol data
     * @param {number} row - Row position
     * @returns {ReelSymbol}
     */
    createSymbol(data, row) {
        const symbol = this.symbolPool.getSymbol(data.name, () => {
            return new ReelSymbol({ ...this.data, ...data }, this);
        });

        symbol.gotToIdle();
        symbol.y = row * this.symbolHeight;

        return symbol;
    }

    /**
     * @description Creates and adds a new symbol to reel
     * @param {Object} data - Symbol data
     * @param {number} row - Row position
     * @returns {ReelSymbol}
     */
    addNewSymbol(data, row) {
        const symbol = this.createSymbol(data, row)
        this.addSymbol(symbol);
        symbol.reset();
        symbol.gotToIdle();

        return symbol;
    }

    /**
     * @description Removes symbol from reel and returns to pool
     * @param {ReelSymbol} symbol - Symbol to remove
     */
    removeSymbol(symbol) {
        this.removeChild(symbol);
        this.symbolPool.returnSymbol(symbol);
    }

    /**
     * @description Replaces all symbols with new ones from matrix
     * @param {Object} matrix - Symbol matrix
     * @param {boolean} [onlyNewSymbols=false] - Only add new symbols
     */
    replaceSymbols(matrix, onlyNewSymbols = false) {
        const symbolsToRemove = [...this.children];

        symbolsToRemove.forEach(symbol => {
            this.removeSymbol(symbol);
        });

        matrix.forEachColumn(this.column, (row, column, symbol) => {
            if (symbol) {
                this.addNewSymbol(symbol, row);
            }
        });
    }

    /**
     * @description Checks if symbol is in sticky position
     * @param {ReelSymbol} symbol - Symbol to check
     * @returns {boolean}
     */
    symbolIsSticky(symbol) {
        return (
            this.stickySymbolsPositions &&
            this.stickySymbolsPositions.some(position => this.isSymbolInPosition(symbol, position))
        );
    }

    /**
     * @description Sets sticky symbol positions
     * @param {Array<{row: number}>} symbolsPositions - Positions to make sticky
     */
    setStickySymbols(symbolsPositions) {
        this.stickySymbolsPositions = symbolsPositions;

        this.children.forEach(symbol => {
            symbol.parentLayer = null;

            if (this.symbolIsSticky(symbol)) {
                symbol.parentLayer = services.layers.stickySymbols;
                symbol.isSticky = true;
            } else {
                symbol.isSticky = false;
            }
        });
    }

    /**
     * @description Gets symbol at specific row
     * @param {number} row - Row index
     * @returns {ReelSymbol|undefined}
     */
    getSymbolByRow(row) {
        const symbol = this.children.find(symbol => symbol.y === row * this.symbolHeight);


        if (!symbol) {
            console.log("Symbol not found (for getSymbolByRow) row =" + row + " column=" + this.column);
            debugger;
        }

        return symbol;
    }

    /**
     * @description Checks if symbol is at given position
     * @param {ReelSymbol} symbol - Symbol to check
     * @param {{row: number}} position - Position to check
     * @returns {boolean}
     */
    isSymbolInPosition(symbol, position) {
        return this.getSymbolByRow(position.row) === symbol;
    }

    /**
     * @description Moves specified symbols down by given distances
     * @param {Array<{distance: number, position: {row: number, column: number}}>} symbolsToMove - Symbols to move
     * @returns {Array<gsap.core.Timeline>}
     */
    moveSymbolsDown(symbolsToMove) {
        const timeline = gsap.timeline();
        const timelines = [];

        for (let i = 0; i < symbolsToMove.length; i++) {
            const { distance, position, destinationPosition } = symbolsToMove[i];
            const symbol = this.getSymbolByRow(position.row);

            if (!symbol) {
                console.log(
                    "Symbol not found (for move) row =" +
                        position.row +
                        " column=" +
                        position.column,
                );
                continue;
            }

            const distanceBySymbol = distance * this.symbolHeight;
            const durationByDistance = Math.abs((distanceBySymbol / this.symbolHeight) * 0.05);

            timelines.push(
                gsap
                    .timeline()
                    .to(symbol, { y: `+=${distanceBySymbol}`, duration: durationByDistance }),
            );
        }

        timeline.add(timelines);

        return timelines;
    }

    /**
     * @description Returns random symbol from reel
     * @returns {ReelSymbol}
     */
    getRandomSymbol() {
        return this.children[Math.floor(Math.random() * this.children.length)];
    }

}
