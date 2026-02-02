export class ReelsSymbols {
    constructor(symbols) {
        this.symbolsConfigsByName = {};
        this.symbolsConfigsByID = {};
        this.symbols = symbols;

        symbols.forEach(symbol => {
            this.symbolsConfigsByID[symbol.id] = symbol;
            this.symbolsConfigsByName[symbol.name] = symbol;
        });

        this.cumulativeWeights = [];
        this.totalWeight = 0;

        this.symbols.forEach(({ name }) => {
            this.totalWeight += this.symbolsConfigsByName[name].weight;
            this.cumulativeWeights.push(this.totalWeight);
        });
    }

    next() {
        let symbol;

        while (!symbol) {
            symbol = this.getRandom();
        }

        return symbol;
    }

    getRandom() {
        const random = Math.random() * this.totalWeight;
        for (let i = 0; i < this.cumulativeWeights.length; i++) {
            if (random < this.cumulativeWeights[i]) {
                let name = this.symbols[i].name;

                return { ...this.symbolsConfigsByName[name]};
            }
        }
    }

    getByID(id) {
        return this.symbolsConfigsByID[id];
    }

    getByName(name) {
        return this.symbolsConfigsByName[name];
    }

    isWild(symbolName) {
        return symbolName === "wild";
    }

    isNotPay(symbol) {
        return this.symbolsConfigsByName[symbol].notPay;
    }

    compareSymbols(symbol, name) {
        return symbol.id === this.symbolsConfigsByName[name].id;
    }

    getMaxSymbolsOnReels(id) {
        return this.symbolsConfigsByID[id].maxSymbolsOnReels || Math.POSITIVE_INFINITY;
    }

    getAllSymbolsIDs() {
        return this.symbols.map(symbol => symbol.id);
    }
}
