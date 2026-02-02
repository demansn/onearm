export class CurrencyFormatter {
    constructor() {
        const kUrlParams = new URLSearchParams(window.location.search);
        const currencyName = kUrlParams.has("currency") ? kUrlParams.get("currency") : "USD";

        this.currencyName = currencyName;
        this.currency = "";

        if (currencyName) {
            switch (currencyName) {
                case "USD":
                    this.currency = "$";
                    break;
                case "EUR":
                    this.currency = "€";
                    break;
                default:
                    this.currency = currencyName;
            }
        }
    }

    format(value, options = {}) {
        let { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;

        // показывать дробуную чать только если ес
        if (value % 1 !== 0) {
            minimumFractionDigits = 2;
            maximumFractionDigits = 2;
        }

        const number = value.toLocaleString("en-US", {
            minimumFractionDigits,
            maximumFractionDigits,
        });

        return `${this.currency}${number}`;
    }
}
