export class ServiceLocator {
    #services = {};

    constructor() {
        this.#services = {};
    }

    set(name, service) {
        if (this.#services[name]) {
            throw new Error(`Service with name ${name} already exists`);
        }

        if (this[name]) {
            throw new Error(`Service with name ${name} already exists`);
        }

        this[name] = service;
        this.#services[name] = service;
    }

    get(name) {
        if (!this.#services[name]) {
            throw new Error(`Service with name ${name} not found`);
        }

        return this.#services[name];
    }
}

export const services = new ServiceLocator();
export default services;
