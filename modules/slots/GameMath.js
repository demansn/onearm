import { ReelsMatrix } from "./ReelsMatrix.js";
import { ReelsSymbols } from "./reels/ReelsSymbols.js";
import { Service } from "../engine/index.js";

export class GameMath extends Service {
    constructor(parameters) {
        super(parameters);
        this.gameConfig = parameters.gameConfig;
        this.rows = this.gameConfig.rows;
        this.columns = this.gameConfig.columns;

        this.symbols = new ReelsSymbols(this.gameConfig.symbols);
    }

    spinElementsToMatrix(spinElements) {
        return ReelsMatrix.fromSpinElements(spinElements, this.symbols);
    }

    /**
     * @description Gets symbol data from ID or object with multiplier
     * @param {number|Object} symbolValue - Symbol ID or object {id, multiplier}
     * @returns {Object} Symbol data with optional multiplier
     */
    getSymbolData(symbolValue) {
        if (typeof symbolValue === "object" && symbolValue !== null && symbolValue.id !== undefined) {
            return {
                ...this.symbols.getByID(symbolValue.id),
                multiplier: symbolValue.multiplier,
            };
        }
        return this.symbols.getByID(symbolValue);
    }

    /**
     * @description Creates matrix from reels data (columns with symbol IDs)
     * @param {number[][]} reels - Reels data in format [column][row] with symbol IDs
     * @returns {ReelsMatrix}
     */
    reelsToMatrix(reels) {
        const columns = reels.length;
        const rows = reels[0].length;
        const matrix = new ReelsMatrix({ rows, columns, firstRow: 0, firsColumn: 0 });

        for (let column = 0; column < columns; column++) {
            for (let row = 0; row < rows; row++) {
                const symbolValue = reels[column][row];
                const symbol = this.getSymbolData(symbolValue);
                matrix.setCell(row, column, symbol);
            }
        }

        return matrix;
    }

    spinDataToResults(spinData) {
        const { spin, total_win: totalWin } = spinData;
        const firstSpin = spin[0];

        if (Array.isArray(firstSpin) && firstSpin[0]?.type) {
            return this.cascadeSpinDataToResults(spinData);
        }

        const firstSpinMatrix = this.spinElementsToMatrix(firstSpin.spin_elements, this.symbols);
        const results = [];

        results.push({ type: "stop", matrix: firstSpinMatrix });

        for (let i = 0; i < spin.length; i++) {
            const { spin_elements, pays, freeSpinsAward, stickySymbols } = spin[i];
            const matrixForResult = this.spinElementsToMatrix(spin_elements, this.symbols);

            if (pays && pays.length) {
                results.push({
                    beforeMatrix: matrixForResult,
                    totalWin: totalWin,
                    pays,
                    type: "pays",
                });
            }

            if (freeSpinsAward) {
                const { type, award } = freeSpinsAward;
                if (type === "scatter") {
                    debugger;
                    results.push({
                        beforeMatrix: matrixForResult,
                        totalWin: totalWin,
                        ...freeSpinsAward,
                        type: "symbols",
                    });

                    results.push({
                        award,
                        ...freeSpinsAward,
                        type: "freeSpinsWin",
                    });
                }
            }
        }

        return { results, totalWin };
    }

    /**
     * @description Converts cascade spin data to animation results sequence
     * @param {Object} spinData - Spin data with cascade steps from betToSpin
     * @returns {Object} Results object with animation steps and total win
     */
    cascadeSpinDataToResults(spinData) {
        const { spin, total_win: totalWin, freespins } = spinData;
        const steps = spin[0];
        const results = [];
        const isFreeSpins = freespins && freespins.current > 0;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const { type } = step;

            if (type === "stop") {
                const matrix = this.reelsToMatrix(step.reels);
                results.push({
                    type: "stop",
                    matrix,
                });
            } else if (type === "pay") {
                results.push({
                    ...step,
                    type: "pays",
                    totalWin,
                });
            } else if (type === "destroy") {
                // results.push({
                //     type: "destroy",
                //     positions: step.positions,
                // });
            }  else {
                results.push({
                    ...step,
                    type: type,
                });
            }
        }

        return { results, totalWin };
    }

    rowsToData(rows) {
        const data = [];

        rows.forEach((row, rowIndex) => {
            data.push([]);
            row.forEach((symbolID, columnIndex) => {
                if (typeof symbolID === "object") {
                    if (symbolID.id === 12) {
                        switch (symbolID.multiplier) {
                            case 2:
                                symbolID = 12;
                                break;
                            case 3:
                                symbolID = 13;
                                break;
                            case 5:
                                symbolID = 14;
                                break;
                            case 10:
                                symbolID = 15;
                                break;
                        }
                    } else {
                        debugger;
                        symbolID = symbolID.id;
                    }
                }

                const symbol = this.symbolIdToName(symbolID);

                data[rowIndex].push(symbol);
            });
        });

        return data;
    }

    symbolIdToName(symbolID) {
        return this.symbols.getByID(symbolID).name;
    }

    generateReelsWithAllSymbols() {
        const reels = [];
        const symbolsIDs = this.symbols.getAllSymbolsIDs();
        let symbolIndex = 0;

        for (let i = 0; i < this.columns; i++) {
            reels.push([]);

            for (let j = 0; j < this.rows; j++) {
                reels[i].push(symbolsIDs[symbolIndex]);
                symbolIndex++;

                if (symbolIndex >= symbolsIDs.length) {
                    symbolIndex = 0;
                }
            }
        }

        return reels;
    }

    /*
    * @description Gets all positions from pay lines
    * @param {Object[]} payLines - Pay lines
    * @returns {Object[]} - All positions from pay lines
    */
    getAllPositionsFromPayLines(reels) {
        const positions = [];

        payLines.forEach(({ pattern }) => {
            pattern.forEach((row, column) => {
                if (!positions.find(p => p.row === row && p.column === column)) {
                    positions.push({ row, column });
                }
            });
        });

        return positions;
    }
}
