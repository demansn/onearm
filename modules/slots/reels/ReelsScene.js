import gsap from "gsap";
import { Text } from "pixi.js";
import { Scene } from "../../engine/index.js";
import { Reels } from "./Reels.js";
import { ReelsSymbols } from "./ReelsSymbols.js";
import services from "../../engine/index.js";

export class ReelsScene extends Scene {
    constructor({ gameConfig, lastSpin,  }) {
        super({ name: "ReelsScene", "layer": "reels" });

        this.options = {
            ...gameConfig,
        };

        const reelsLayout = this.layouts.getConfig("ReelsLayout");
        const reelsConfig = reelsLayout.reels;

        const params = {
            columns: reelsConfig.columns,
            rows: reelsConfig.rows,
            symbolWidth: reelsConfig.symbolWidth,
            symbolHeight: reelsConfig.symbolHeight,
            gap: reelsConfig.gap,
            reelWidth: reelsConfig.symbolWidth,
            reelHeight: reelsConfig.symbolHeight * reelsConfig.rows,
            // reelsWidth: (reelsConfig.symbolWidth + gap) * reelsConfig.columns,
            // reelsHeight: reelsConfig.symbolHeight * reelsConfig.rows,
            reelsSymbols: new ReelsSymbols(this.options.symbols),
        };

        // this.frame = this.buildLayout(reelsLayout.frame);
        this.reels = this.createObject(Reels, { params, x: reelsLayout.reels.x, y: reelsLayout.reels.y });

        // this.reels.shadow = this.buildLayout(reelsLayout.shadow);
        // // this.reels.addChild(this.reels.shadow);
        // this.reels.shadow.visible = true;
        // this.reels.shadow.zIndex = 100;
        // this.reels.shadow.zOrder = 100;
        // this.reels.shadow.alpha = 0;
        // this.reels.shadow.layer =  services.layers.paylineLayer;

        this.reels.mask = this.buildLayout(reelsLayout.mask);
        this.reels.mask.visible = true;

        // this.pivot.x = this.width / 2;
        // this.pivot.y = this.height / 2;

        // if (lastSpin && lastSpin.length > 0) {
        //     this.reels.replaceSymbols(lastSpin);
        // }
    }

    /**
     * @param {boolean} [instant=false] - If true, all columns fall simultaneously
     * @returns {gsap.core.Timeline}
     */
    spin(instant = false) {
        const tl = gsap.timeline();

        this.reels.goToIdle();

        tl.playSfx("reel_spin");
        tl.add(this.reels.spin(instant), "<=+0.05");

        return tl;
    }

    stop(result, force = false, spinType = "normal") {
        if (force) {
            this.reels.stop(result.matrix, force, spinType);
            return;
        }
        const tl = gsap.timeline();

        tl.stopSfx("reel_spin");
        tl.add(this.reels.stop(result.matrix, force, spinType), "<=+0.05");

        return tl;
    }

    /**
     * @description Quick stop - all reels drop simultaneously with minimal delay
     * @param {Object} result - Spin result containing matrix
     * @param {string} [spinType="normal"] - Spin type: "normal", "turbo", "quick"
     * @returns {gsap.core.Timeline}
     */
    quickStop(result, spinType = "normal") {
        const tl = gsap.timeline();

        tl.stopSfx("reel_spin");
        tl.add(this.reels.quickStop(result.matrix, spinType), 0);

        return tl;
    }

    update(dt) {
        if (!this.reels) {
            return;
        }
        this.reels.update(dt);
    }

    playWinAnimation(result) {
        this.resultAnimationTimeLine = this.getWinAnimationTimeline(result);

        return this.resultAnimationTimeLine;
    }


    goToIdle() {
        this.reels.goToIdle();
    }

    removeSymbolsByPositions(positions) {
        this.reels.removeSymbolsByPositions(positions);
    }

    removeSymbol(position) {
        this.reels.removeSymbolsByPositions([position]);
    }

    playWinAnimationsByPositions(positions) {
        const timeline = gsap.timeline({ paused: false });

        timeline.add([this.reels.playWinAnimationsByPositions(positions)]);

        return timeline;
    }

    getWinAnimationTimeline(result) {
        const timeline = gsap.timeline({ paused: false });
        const { pays, beforeMatrix } = result;

        this.reels.replaceSymbols(beforeMatrix, true);

        for (let i = 0; i < pays.length; i++) {
            const { positions, win, multiplier } = pays[i];
            timeline.add([this.reels.playWinAnimationsByPositions(positions)]);
        }

        return timeline;
    }

    /**
     * @param {Array<{row: number, column: number}>} positions - Symbol positions
     * @param {boolean} [turboMode=false] - Turbo mode for instant animations
     * @returns {gsap.core.Timeline}
     */
    getWinAnimationByPositions(positions, turboMode = false) {
        return this.reels.playWinAnimationsByPositions(positions, turboMode);
    }

    getSymbolsByPositions(positions) {
        return positions.map(position => this.reels.getSymbolByPosition(position));
    }

    skipWin(result) {
        const { beforeMatrix } = result;

        this.reels.replaceSymbols(beforeMatrix, true);
        this.reels.goToIdle();
    }

    /**
     * @description Gets fly animation for a single multiplier symbol
     * @param {number} row - Symbol row
     * @param {number} column - Symbol column
     * @param {{x: number, y: number}} targetGlobalPos - Target global position
     * @returns {gsap.core.Timeline}
     */
    getMultiplierFlyAnimation(row, column, targetGlobalPos) {
        return this.reels.getMultiplierFlyAnimation(row, column, targetGlobalPos);
    }

    /**
     * @description Plays pay animation - shows win amount flying up from center of winning symbols
     * @param {Object} params - Animation parameters
     * @param {Array<{row: number, column: number}>} params.positions - Symbol positions
     * @param {number} params.win - Win amount to display
     * @returns {void}
     */
    playPayAnimation({ positions, win }) {
        if (!positions || positions.length === 0 || win <= 0) {
            return;
        }

        const centerPosition = this.getCenterPosition(positions);
        const symbol = this.reels.getSymbolByPosition(centerPosition);

        if (!symbol) {
            return;
        }

        const globalPos = symbol.toGlobal({ x: symbol.data.symbolWidth / 2, y: symbol.data.symbolHeight / 2 });
        const localPos = this.toLocal(globalPos);

        const formattedWin = services.currencyFormatter
            ? services.currencyFormatter.format(win)
            : win.toFixed(2);

        const text = new Text(formattedWin, {
            "fontFamily": "HelveticaRounded LT Bolde85e07b4add49b94b8726c01d794a93c",
            "fontSize": 70,
            "fontWeight": "bold",
            "align": "center",
            "fill": "rgba(255,255,255,1)",
            "stroke": "rgba(0,0,0,1)",
            "strokeThickness": 2
        });

        text.anchor.set(0.5);
        text.x = localPos.x;
        text.y = localPos.y;
        text.alpha = 0;
        text.scale.set(0.3);
        text.zIndex = 1000;
        text.parentLayer = services.layers.symbolsAnimationLayer;

        this.addChild(text);

        const tl = gsap.timeline({
            onComplete: () => {
                this.removeChild(text);
                text.destroy();
            },
        });

        tl.to(text, { alpha: 1, duration: 0.1, ease: "power2.out" }, 0);
        tl.to(text.scale, { x: 1, y: 1, duration: 0.5, ease: "back.out(3)" }, 0);
        tl.to(text, { y: text.y - 150, duration: 2, ease: "power1.in" }, 0);
        tl.to(text, { alpha: 0, duration: 1, ease: "power1.in" }, 1);
        tl.to(text.scale, { x: 0.8, y: 0.8, duration: 1, ease: "power1.in" }, 1);
    }

    /**
     * @description Gets center position from array of positions (finds median column, then median row within that column)
     * @param {Array<{row: number, column: number}>} positions - Symbol positions
     * @returns {{row: number, column: number}} Center position
     */
    getCenterPosition(positions) {
        const columns = [...new Set(positions.map(p => p.column))].sort((a, b) => a - b);
        const colCount = columns.length;
        const centerColIndex = colCount % 2 === 0 ? colCount / 2 : Math.floor(colCount / 2);
        const centerColumn = columns[centerColIndex];

        const rowsInCenterColumn = positions
            .filter(p => p.column === centerColumn)
            .map(p => p.row)
            .sort((a, b) => a - b);

        const rowCount = rowsInCenterColumn.length;
        const centerRowIndex = Math.floor((rowCount - 1) / 2);

        return {
            column: centerColumn,
            row: rowsInCenterColumn[centerRowIndex],
        };
    }

    /**
     * @description Gets symbol at specified position
     * @param {{row: number, column: number}} position - Symbol position
     * @returns {import('./ReelSymbol.js').ReelSymbol|undefined}
     */
    getSymbolByPosition(position) {
        return this.reels.getSymbolByPosition(position);
    }

    /**
     * @description Adds new symbol at specified position
     * @param {{row: number, column: number}} position - Position to add symbol at
     * @param {Object} data - Symbol data
     * @returns {import('./ReelSymbol.js').ReelSymbol}
     */
    addNewSymbol(position, data) {
        return this.reels.addNewSymbol(position, data);
    }
}
