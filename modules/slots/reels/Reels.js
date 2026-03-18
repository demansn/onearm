import { Container } from "pixi.js";
import { Reel } from "./Reel.js";
import { CascadeStrategy } from "./strategies/CascadeStrategy.js";

export class Reels extends Container {
    constructor(data) {
        super();
        this.options = data;
        this.symbolWidth = data.symbolWidth;
        this.rows = data.rows;
        this.columns = data.columns.length;

        /**
         * @type {Reel[]}
         */
        this.reels = [];

        const { columns, symbolWidth, symbolHeight, rows, reelsSymbols } = data;

        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const colRows = col.rows ?? rows;

            const reel = new Reel({
                AnimationStrategy: CascadeStrategy,
                index: i,
                rows: colRows,
                symbolWidth,
                symbolHeight,
                reelWidth: col.width ?? symbolWidth,
                reelHeight: symbolHeight * colRows,
                reelsSymbols,
            });
            reel.x = col.x;
            this.reels.push(reel);
            this.addChild(reel);
        }
    }

    step({ dt }) {
        this.reels.forEach(reel => {
            reel.update(dt);
        });
    }

    goToIdle() {
        this.reels.forEach(reel => {
            reel.goToIdle();
        });
    }

    replaceSymbols(matrix, onlyNewSymbols = false) {
        for (let i = 0; i < this.reels.length; i++) {
            this.reels[i].replaceSymbols(matrix, onlyNewSymbols);
        }
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

    removeSymbolsByPositions(positions) {
        positions.forEach(({ row, column }) => {
            this.reels[column].removeSymbol(this.getSymbolByPosition({ row, column }));
        });
    }

    clearSymbolPool() {
        const symbolPool = SymbolPool.getInstance();
        symbolPool.clear();
    }

    getPoolStats() {
        const symbolPool = SymbolPool.getInstance();
        return symbolPool.getStats();
    }

    logPoolStats() {
        const symbolPool = SymbolPool.getInstance();
        symbolPool.logStats();
    }

    destroy(_options) {
        this.clearSymbolPool();
        super.destroy(_options);
    }
}
