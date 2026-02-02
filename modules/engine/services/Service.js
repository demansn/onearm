export class Service {
    /***
     * @param {Object} params - The parameters for the service.
     * @param {Object} params.gameConfig - The game configuration object.
     * @param {Object} params.services - The services object.
     * @param {string} params.name - The name of the service.
     * @param {Object} params.options - Additional options for the service.
     */
    constructor({ gameConfig, services, name, options }) {
        this.gameConfig = gameConfig;
        this.services = services;
        this.name = name;
        this.options = options;
    }

    async init() {}
}
