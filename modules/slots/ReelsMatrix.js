export class ReelsMatrix {
    static fromJSON(string) {
        const data = JSON.parse(string);
        const matrix = new ReelsMatrix({ rows: data.length, columns: data[0].length });

        for (let row = 0; row < data.length; row++) {
            for (let column = 0; column < data[row].length; column++) {
                matrix.setCell(row, column, data[row][column]);
            }
        }

        return matrix;
    }

    /**
     * @param spinElements {string[][]}
     * @returns {ReelsMatrix}
     */
    static fromSpinElements(spinElements, symbols) {
        const rows = spinElements.length;
        const columns = spinElements[0].length;
        const matrix = new ReelsMatrix({ rows, columns, firstRow: 0, firsColumn: 0 });

        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                matrix.setCell(row, column, symbols.getByName(spinElements[row][column]));
            }
        }

        return matrix;
    }

    constructor({ firstRow = 0, firsColumn = 0, rows, columns }) {
        this.firstRow = firstRow;
        this.firsColumn = firsColumn;
        this.rows = rows;
        this.columns = columns;
        this.matrix = [];

        for (let row = firstRow; row < rows; row++) {
            for (let column = firsColumn; column < columns; column++) {
                this.matrix[row] = this.matrix[row] || {};

                this.matrix[row][column] = null;
            }
        }
    }

    fill(data) {
        this.forEach((row, column) => this.setCell(row, column, data));
    }

    setCell(row, column, data) {
        if (this.matrix[row] === undefined) {
            this.matrix[row] = {};
        }

        this.firstRow = Math.min(this.firstRow, row);

        this.matrix[row][column] = data;
    }

    getCell(row, column) {
        return this.matrix[row][column];
    }

    forEach(callback, invertedRows = false, invertedColumns = false) {
        for (
            let row = invertedRows ? this.rows - 1 : this.firstRow;
            invertedRows ? row >= this.firstRow : row < this.rows;
            invertedRows ? (row -= 1) : (row += 1)
        ) {
            for (
                let column = invertedColumns ? this.columns - 1 : this.firsColumn;
                invertedColumns ? column >= this.firsColumn : column < this.columns;
                invertedColumns ? (column -= 1) : (column += 1)
            ) {
                const result = callback(row, column, this.matrix[row][column]);

                if (result === false) {
                    return;
                }
            }
        }
    }

    canPlaceForSymbol(symbol, row, column) {
        const { width, height } = symbol.size;

        if (row + height > this.rows || column + width > this.columns) {
            return false;
        }

        for (let r = row; r < row + height; r++) {
            for (let c = column; c < column + width; c++) {
                if (this.matrix[r][c] !== null) {
                    return false;
                }
            }
        }

        return true;
    }

    placeSymbol(symbol, row, column) {
        const { width, height } = symbol.size;
        const isBig = width > 1 || height > 1;

        if (this.canPlaceForSymbol(symbol, row, column)) {
            if (isBig) {
                this.placeBigSymbol(symbol, row, column);
            } else {
                this.setCell(row, column, symbol);
            }
        }
    }

    placeBigSymbol(symbol, row, column) {
        const { width, height } = symbol.size;

        symbol.toHead = { row: 0, column: 0 };
        symbol.isHead = true;
        symbol.isBig = true;

        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                const toHead = { row: height - 1 - r, column: -c };
                const childSymbol = {
                    ...symbol,
                    toHead,
                    isChild: true,
                    isBlank: true,
                    isHead: false,
                };
                const childRow = row + r;
                const childColumn = column + c;

                this.setCell(childRow, childColumn, childSymbol);
            }
        }

        this.setCell(row + height - 1, column, symbol);
    }

    fillByPosition(positions, data) {
        positions.forEach(({ row, column }) => {
            this.setCell(row, column, data);
        });
    }

    getEmptyCellsAfterRow(row, column) {
        const emptyCells = [];

        for (let r = row + 1; r < this.rows; r++) {
            const symbol = this.getCell(r, column);

            if (!symbol) {
                emptyCells.push({ row: r, column });
            }
        }

        return emptyCells;
    }

    clone() {
        const clone = new ReelsMatrix({
            firstRow: this.firstRow,
            firsColumn: this.firsColumn,
            rows: this.rows,
            columns: this.columns,
        });

        this.forEach((row, column, data) => {
            clone.setCell(row, column, data);
        });

        return clone;
    }

    toString() {
        const matrix = [];

        this.forEach((row, column, data) => {
            matrix[row] = matrix[row] || [];
            matrix[row][column] = data ? data.id : null;
        });

        return JSON.stringify(matrix);
    }

    fromJSON(string) {
        this.matrix = data;
    }

    findSymbols(name) {
        const positions = [];

        this.forEach((row, column, data) => {
            if (data && data.name.includes(name)) {
                positions.push({ row, column });
            }
        });

        return positions;
    }

    getSymbolsCount(name) {
        let count = 0;
        for (let row = 0; row < this.rows - 1; row += 1) {
            for (let column = 0; column < this.columns; column += 1) {
                if (this.matrix[row][column] && this.matrix[row][column].name === name) {
                    count++;
                }
            }
        }

        return count;
    }

    forEachColumn(column, callback) {
        for (let row = this.firstRow; row < this.rows; row++) {
            const result = callback(row, column, this.matrix[row][column]);

            if (result === false) {
                return;
            }
        }
    }

    get length() {
        return this.rows * this.columns;
    }
}
