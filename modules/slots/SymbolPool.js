/**
 * Глобальный пул для переиспользования ReelSymbol объектов
 * Предотвращает утечки памяти spine анимаций
 */
export class SymbolPool {
    static instance = null;

    constructor() {
        if (SymbolPool.instance) {
            return SymbolPool.instance;
        }

        this.pools = {}; // pools[symbolName] = [symbol1, symbol2, ...]
        this.maxPoolSize = 5;
        SymbolPool.instance = this;
    }

    /**
     * Получить экземпляр singleton
     */
    static getInstance() {
        if (!SymbolPool.instance) {
            SymbolPool.instance = new SymbolPool();
        }
        return SymbolPool.instance;
    }

    /**
     * Получить символ из пула или создать новый
     */
    getSymbol(symbolName, createSymbolFn) {
        const pool = this.pools[symbolName] || [];

        if (pool.length > 0) {
            const symbol = pool.shift();
            return symbol;
        } else {
            const symbol = createSymbolFn();
            return symbol;
        }
    }

    /**
     * Вернуть символ в пул
     */
    returnSymbol(symbol) {
        const symbolName = symbol.label;

        if (!this.pools[symbolName]) {
            this.pools[symbolName] = [];
        }

        const pool = this.pools[symbolName];

        // Ограничить размер пула
        if (pool.length >= this.maxPoolSize) {
            const oldSymbol = pool.shift();
            oldSymbol.destroy();
        }

        symbol.gotToIdle();
        if (symbol.parent) {
            symbol.parent.removeChild(symbol);
        }

        pool.push(symbol);
    }

    /**
     * Очистить весь пул
     */
    clear() {
        Object.entries(this.pools).forEach(([symbolName, pool]) => {
            pool.forEach(symbol => {
                symbol.destroy();
            });
        });
        this.pools = {};
    }

    /**
     * Получить статистику пула
     */
    getStats() {
        const stats = {};
        let totalSymbols = 0;

        Object.entries(this.pools).forEach(([symbolName, pool]) => {
            stats[symbolName] = pool.length;
            totalSymbols += pool.length;
        });

        return { pools: stats, total: totalSymbols };
    }

    /**
     * Вывести статистику в консоль
     */
    logStats() {
        return this.getStats();
    }
}
