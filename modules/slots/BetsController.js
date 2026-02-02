import { Signal } from "typed-signals";

import { Service } from "../engine/index.js";

/**
 * @typedef {Object} BetLadderEntry
 * @property {number} bet - Bet multiplier value (1-10)
 * @property {number} coinValue - Coin value (0.01-0.50)
 * @property {number} totalBet - Total bet amount
 */

export class BetsController extends Service {
    init() {
        this.gameLogic = this.services.get("gameLogic");
        this.bets = this.gameLogic.bets;

        /** @type {BetLadderEntry[]} */
        this.betsLadder = this.gameConfig.betsLadder || [];

        this.betValues = [...new Set(this.betsLadder.map(e => e.bet))].sort((a, b) => a - b);
        this.coinValues = [...new Set(this.betsLadder.map(e => e.coinValue))].sort((a, b) => a - b);
        this.totalBets = [...new Set(this.betsLadder.map(e => e.totalBet))].sort((a, b) => a - b);

        const initialTotalBet = this.gameLogic.bet;
        const initialEntry = this.findClosestLadderEntry(initialTotalBet);

        this.bet = initialEntry?.bet ?? this.betValues[0];
        this.coinValue = initialEntry?.coinValue ?? this.coinValues[0];
        this.totalBet = initialEntry?.totalBet ?? this.totalBets[0];

        this.currentBetIndex = this.bets.findIndex(bet => bet === this.totalBet);

        this.onBetChanged = new Signal();
        this.onCoinValueChanged = new Signal();
        this.onTotalBetChanged = new Signal();
    }

    /**
     * @param {number} bet
     * @param {number} coinValue
     * @returns {BetLadderEntry|undefined}
     */
    findLadderEntry(bet, coinValue) {
        return this.betsLadder.find(e => e.bet === bet && e.coinValue === coinValue);
    }

    /**
     * @param {number} targetTotalBet
     * @returns {BetLadderEntry|undefined}
     */
    findClosestLadderEntry(targetTotalBet) {
        if (this.betsLadder.length === 0) return undefined;

        let closest = this.betsLadder[0];
        let minDiff = Math.abs(closest.totalBet - targetTotalBet);

        for (const entry of this.betsLadder) {
            const diff = Math.abs(entry.totalBet - targetTotalBet);
            if (diff < minDiff) {
                minDiff = diff;
                closest = entry;
            }
        }

        return closest;
    }

    /**
     * @param {number} currentTotalBet
     * @param {1|-1} direction
     * @returns {BetLadderEntry|undefined}
     */
    findNextTotalBet(currentTotalBet, direction) {
        const currentIndex = this.totalBets.indexOf(currentTotalBet);

        if (currentIndex === -1) {
            const closest = this.findClosestLadderEntry(currentTotalBet);
            return closest;
        }

        const newIndex = currentIndex + direction;

        if (newIndex < 0) {
            return this.findClosestLadderEntry(this.totalBets[0]);
        }
        if (newIndex >= this.totalBets.length) {
            return this.findClosestLadderEntry(this.totalBets[this.totalBets.length - 1]);
        }

        const newTotalBet = this.totalBets[newIndex];
        return this.findClosestLadderEntry(newTotalBet);
    }

    /**
     * @private
     */
    updateFromEntry(entry) {
        if (!entry) return;

        const betChanged = this.bet !== entry.bet;
        const coinValueChanged = this.coinValue !== entry.coinValue;
        const totalBetChanged = this.totalBet !== entry.totalBet;

        this.bet = entry.bet;
        this.coinValue = entry.coinValue;
        this.totalBet = entry.totalBet;
        this.gameLogic.bet = entry.totalBet;

        if (betChanged) {
            this.onBetChanged.emit(this.bet);
        }
        if (coinValueChanged) {
            this.onCoinValueChanged.emit(this.coinValue);
        }
        if (totalBetChanged) {
            this.onTotalBetChanged.emit(this.totalBet);
        }
    }

    nextBetValue() {
        const currentIndex = this.betValues.indexOf(this.bet);
        const newIndex = Math.min(currentIndex + 1, this.betValues.length - 1);
        const newBet = this.betValues[newIndex];

        const entry = this.findLadderEntry(newBet, this.coinValue);
        this.updateFromEntry(entry);
    }

    previousBetValue() {
        const currentIndex = this.betValues.indexOf(this.bet);
        const newIndex = Math.max(currentIndex - 1, 0);
        const newBet = this.betValues[newIndex];

        const entry = this.findLadderEntry(newBet, this.coinValue);
        this.updateFromEntry(entry);
    }

    nextCoinValue() {
        const currentIndex = this.coinValues.indexOf(this.coinValue);
        const newIndex = Math.min(currentIndex + 1, this.coinValues.length - 1);
        const newCoinValue = this.coinValues[newIndex];

        const entry = this.findLadderEntry(this.bet, newCoinValue);
        this.updateFromEntry(entry);
    }

    previousCoinValue() {
        const currentIndex = this.coinValues.indexOf(this.coinValue);
        const newIndex = Math.max(currentIndex - 1, 0);
        const newCoinValue = this.coinValues[newIndex];

        const entry = this.findLadderEntry(this.bet, newCoinValue);
        this.updateFromEntry(entry);
    }

    nextTotalBet() {
        const entry = this.findNextTotalBet(this.totalBet, 1);
        this.updateFromEntry(entry);
    }

    previousTotalBet() {
        const entry = this.findNextTotalBet(this.totalBet, -1);
        this.updateFromEntry(entry);
    }

    setBetMax() {
        const maxEntry = this.betsLadder[this.betsLadder.length - 1];
        this.updateFromEntry(maxEntry);
    }

    nextBet() {
        this.nextTotalBet();
    }

    previousBet() {
        this.previousTotalBet();
    }

    /**
     * @param {number} bet
     */
    setBet(bet) {
        const entry = this.findClosestLadderEntry(bet);
        this.updateFromEntry(entry);
    }

    /**
     * @deprecated Use updateFromEntry instead
     */
    setBetByCurrentIndex() {
        this.bet = this.bets[this.currentBetIndex];
        this.gameLogic.bet = this.bet;
        this.onBetChanged.emit(this.bet);
    }
}
