import gsap from "gsap";

/**
 * @description Cascade animation builder - moves symbols down and adds new symbols from top
 */
export class CascadeAnimation {
    static FALL_DELAY = 0.1;
    static DROP_ANIMATION_DURATION = 0.2;
    static DROP_ANIMATION_DELAY = 0.1;

    /**
     * @param {Object} reelsScene - Reels scene reference
     */
    constructor(reelsScene) {
        this.reelsScene = reelsScene;
    }

    /**
     * @description Builds complete cascade animation timeline
     * @param {Object} cascadeData - Cascade data with movements and new symbols
     * @param {Object.<number, Array<{fromRow: number, toRow: number}>>} cascadeData.movements - Symbol movements by column
     * @param {Object.<number, Array<{row: number, symbolData: Object}>>} cascadeData.newSymbols - New symbols by column
     * @param {Object} [options] - Animation options
     * @param {number} [options.sfxIndex=0] - Sound effect index for symbol_vanish
     * @returns {gsap.core.Timeline}
     */
    build({ movements, newSymbols }, options = {}) {
        const timeline = gsap.timeline();
        const columns = this.getAffectedColumns(movements, newSymbols);

        columns.forEach(column => {
            const columnMovements = movements[column] || [];
            const columnNewSymbols = newSymbols[column] || [];

            timeline.add(
                this.buildColumnTimeline(column, columnMovements, columnNewSymbols, options),
                0
            );
        });

        return timeline;
    }

    /**
     * @description Gets all columns that have movements or new symbols
     * @param {Object} movements - Movements by column
     * @param {Object} newSymbols - New symbols by column
     * @returns {number[]}
     */
    getAffectedColumns(movements, newSymbols) {
        const movementColumns = Object.keys(movements).map(Number);
        const newSymbolColumns = Object.keys(newSymbols).map(Number);
        return [...new Set([...movementColumns, ...newSymbolColumns])].sort((a, b) => a - b);
    }

    /**
     * @description Builds cascade animation for single column
     * @param {number} column - Column index
     * @param {Array<{fromRow: number, toRow: number}>} movements - Symbol movements
     * @param {Array<{row: number, symbolData: Object}>} newSymbols - New symbols to add
     * @param {Object} options - Animation options
     * @returns {gsap.core.Timeline}
     */
    buildColumnTimeline(column, movements, newSymbols, options) {
        const timeline = gsap.timeline();

        this.addMovementAnimations(timeline, column, movements, options);
        this.addNewSymbolAnimations(timeline, column, newSymbols, movements.length);

        return timeline;
    }

    /**
     * @description Adds movement animations for existing symbols
     * @param {gsap.core.Timeline} timeline - Timeline to add animations to
     * @param {number} column - Column index
     * @param {Array<{fromRow: number, toRow: number}>} movements - Symbol movements
     * @param {Object} options - Animation options
     */
    addMovementAnimations(timeline, column, movements, options = {}) {
        const sortedMovements = [...movements].sort((a, b) => b.toRow - a.toRow);
        const sfxIndex = Math.min(9, options.sfxIndex ?? 0);

        if (sortedMovements.length > 0) {
            timeline.playSfx(`symbol_vanish_${sfxIndex}`);
        }

        sortedMovements.forEach((move, i) => {
            const position = { row: move.fromRow, column };
            const symbol = this.reelsScene.getSymbolByPosition(position);

            if (!symbol) {
                console.warn(`CascadeAnimation: Symbol not found at row=${move.fromRow}, column=${column}`);
                return;
            }

            const targetY = move.toRow * symbol.data.symbolHeight;
            const distance = Math.abs(move.toRow - move.fromRow);
            const duration = CascadeAnimation.DROP_ANIMATION_DURATION + distance * 0.05;
            const delay = i * CascadeAnimation.FALL_DELAY;

            timeline.add(symbol.playDropAnimation(CascadeAnimation.DROP_ANIMATION_DELAY), delay);
            timeline.to(symbol, {
                y: targetY,
                duration,
                ease: "power1.in",
            }, delay);
        });
    }

    /**
     * @description Adds animations for new symbols falling from top
     * @param {gsap.core.Timeline} timeline - Timeline to add animations to
     * @param {number} column - Column index
     * @param {Array<{row: number, symbolData: Object}>} newSymbols - New symbols data
     * @param {number} movementsCount - Number of existing symbol movements
     */
    addNewSymbolAnimations(timeline, column, newSymbols, movementsCount) {
        const sortedNewSymbols = [...newSymbols].sort((a, b) => b.row - a.row);
        let startRow = -1;

        sortedNewSymbols.forEach((item, i) => {
            const position = { row: startRow, column };
            const symbol = this.reelsScene.addNewSymbol(position, item.symbolData);

            const targetY = item.row * symbol.data.symbolHeight;
            const distance = item.row - startRow;
            const duration = CascadeAnimation.DROP_ANIMATION_DURATION + distance * 0.05;
            const delay = (movementsCount + i) * CascadeAnimation.FALL_DELAY;

            startRow -= 1;

            timeline.add(symbol.playDropAnimation(CascadeAnimation.DROP_ANIMATION_DELAY), delay);
            timeline.to(symbol, {
                y: targetY,
                duration,
                ease: "power1.in",
            }, delay);
        });
    }
}
