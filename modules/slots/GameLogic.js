import { Service } from "../engine/index.js";

export const ERROR_CODES = {
    NOT_ENOUGH_BALANCE: "not_enough_balance",
    INTERNAL_ERROR: "internal_error",
    SESSION_EXPIRED: "session_expired",
};

export class GameLogic extends Service {
    constructor(parameters) {
        super(parameters);
        const { symbols, rows, columns, bets } = parameters.gameConfig;

        this.api = parameters.services.get("api");
        this.math = parameters.services.get("gameMath");
        this.bets = bets;
        this.symbols = symbols;
        this.rows = rows;
        this.cols = columns;
        this.parameters = parameters;
        this.freeSpins = [];
        this.bet = -1;
        this.balance = 0;
        this.bonuses = [];
        this.feature = null;
        this.currentFreeSpins = null;
    }

    hasError() {
        return this.error;
    }

    async init() {
        try {
            const response = await this.api.player();
            const {
                error,
                balance,
                lastSpin = [],
                freespins = null,
                bet,
                feature,
                bonuses = [],
                ...rest
            } = response;

            if (error) {
                this.error = response;
            }

            this.bonuses = bonuses;
            this.balance = balance;
            this.freeSpins = freespins ? [freespins] : [];
            this.lastSpin = lastSpin.length > 0 ? this.math.spinElementsToMatrix(lastSpin) : [];
            this.bet = bet;
            this.currentFreeSpins = null;
            this.feature = feature;
        } catch (error) {
            this.error = error;
        }
    }

    async spin() {
        if (this.bet > this.balance) {
            throw { code: "noFunds", message: "Not enough balance" };
        }

        this.balance -= this.bet;
        this.currentFreeSpins = null;

        if (this.balance < 0) {
            this.balance = 0;
        }

        const response = await this.api.spin({ bet: this.bet });

        this.checkError(response);
        this.checkUpdateBalance(response);
        this.checkFreeSpins(response);

        const result = this.math.spinDataToResults(response);
        this.setLastSpinFromResults(result);

        return result;
    }

    async buyFreeSpins(betAmount, index) {
        const id = this.bonuses[index].id;
        const price = this.bonuses[index].multiplier * betAmount;

        if (price > this.balance) {
            return { error: { code: ERROR_CODES.NOT_ENOUGH_BALANCE, message: "Not enough balance" } };
        }

        this.balance -= price;

        const response = await this.api.buyFreeSpins(betAmount, id);

        this.checkError(response);
        this.checkFreeSpins(response);

        return this.math.spinDataToResults(response);
    }

    async freeSpin() {
        const response = await this.api.freeSpin(this.currentFreeSpins);

        this.checkError(response);
        this.checkUpdateBalance(response);

        this.currentFreeSpins.left = response.freespins.left;
        this.currentFreeSpins.totalWin = response.freespins.totalWin;
        this.currentFreeSpins.current = response.freespins.current;

        const result = this.math.spinDataToResults(response);
        this.setLastSpinFromResults(result);

        return result;
    }

    async setDoubleChanceFeature(isEnabled) {
        const response = await this.api.setDoubleChanceFeature({isEnabled});

        this.checkError(response);

        return response;
    }


    async setBet(bet) {
        const response = await this.api.setBet(bet);

        this.checkError(response);

        return response;
    }

    checkUpdateBalance(response) {
        if (response.after_balance !== undefined) {
            this.balance = response.after_balance;
        }

        if (response.total_win !== undefined) {
            this.totalWin = response.total_win;
        }
    }

    checkFreeSpins(response) {
        if (response.freespins) {
            this.freeSpins.push(response.freespins);
        }
    }

    setLastSpinFromResults(result) {
        if (result.results) {
            const lastResult = result.results[result.results.length - 1];
            if (lastResult && lastResult.matrix) {
                this.lastSpin = lastResult.matrix.clone();
            }
        }
    }

    hasRestore() {
        return this.hasFreeSpins();
    }

    canBet() {
        return this.balance >= this.bet;
    }

    hasFreeSpins() {
        return this.freeSpins && this.freeSpins.length > 0;
    }

    getFreeSpinsLeft() {
        return this.currentFreeSpins ? this.currentFreeSpins.left : 0;
    }

    getFreeSpinsBet() {
        return this.currentFreeSpins ? this.currentFreeSpins.betLevel : 0;
    }

    freeSpinsIsStarted() {
        return this.currentFreeSpins
            ? this.currentFreeSpins.left !== this.currentFreeSpins.total
            : false;
    }

    hasFreeSpinsGames() {
        return (this.currentFreeSpins && this.currentFreeSpins.left > 0) || this.hasFreeSpins();
    }

    freeSpinsDone() {
        return this.currentFreeSpins ? this.currentFreeSpins.left === 0 : false;
    }

    nextFreeSpins() {
        this.currentFreeSpins = this.hasFreeSpins() ? this.freeSpins.shift() : null;

        return { ...this.currentFreeSpins };
    }

    getFreeSpinsTotalWin() {
        return this.currentFreeSpins ? this.currentFreeSpins.totalWin : 0;
    }

    getCurrentFreeSpins() {
        return this.currentFreeSpins ? { ...this.currentFreeSpins } : null;
    }

    getTotalWin() {
        return this.totalWin;
    }

    getFreeSpinsItems() {
        const items = this.bonuses.map(bonus => ({
            ...bonus,
            price: bonus.multiplier * this.bet,
        }));

        return items.sort((a, b) => a.price - b.price);
    }

    getBuyBonusItems() {
        return this.getFreeSpinsItems();
    }

    checkError(response) {
        // {"error":{"message":"Not enough balance to spin"}}
        if (response.custom_message === "-1") {
            this.balance += this.bet;
            throw {
                custom_message: response.custom_message,
                message: "Server error",
                code: "reject",
            };
        }

        if (response.custom_message) {
            throw {
                custom_message: response.custom_message,
                message: "Server error",
                code: "internal_error",
            };
        }

        if (response.error || response.status === "error") {
            if (response.error.message === "Not enough balance to spin") {
                this.balance += this.bet;
                throw {
                    custom_message: response.error.message,
                    message: "Not enough balance to spin",
                    code: ERROR_CODES.NOT_ENOUGH_BALANCE,
                };
            }

            throw {
                message: "Server error",
                code: "internal_error",
            };
        }
    }
}
