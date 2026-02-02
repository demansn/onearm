import { Service } from "./Service.js";

export class Styles extends Service {
    constructor(params) {
        super(params);

        this.options = params.options;
    }

    get(name) {
        if (!this.options[name]) {
            console.error(`Style with name ${name} not found`);
            return {};
        }

        return this.options[name];
    }

    getAll() {
        return { ...this.options };
    }
}
