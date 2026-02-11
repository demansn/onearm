import { Service } from "../services/Service.js";

/**
 * Service that manages background reactive controllers.
 *
 * Controllers handle local state mutations (bets, autoplay state),
 * UI subscriptions, and background tasks without blocking flows.
 *
 * Controllers should NOT block flow execution or trigger flow transitions.
 *
 * @extends Service
 */
export class ControllerStore extends Service {
    #controllers = new Map();

    /**
     * Add a controller. If a controller with the same id exists, it will be removed first.
     * @param {string} id
     * @param {Object} controller - Controller instance, may have destroy() method
     */
    add(id, controller) {
        if (this.#controllers.has(id)) {
            this.remove(id);
        }
        this.#controllers.set(id, controller);
    }

    /**
     * Remove a controller by id. Calls destroy() if available.
     * @param {string} id
     */
    remove(id) {
        const controller = this.#controllers.get(id);
        if (controller) {
            if (controller.destroy) {
                controller.destroy();
            }
            this.#controllers.delete(id);
        }
    }

    /**
     * Get a controller by id.
     * @param {string} id
     * @returns {Object|undefined}
     */
    get(id) {
        return this.#controllers.get(id);
    }

    /**
     * Remove and destroy all controllers.
     */
    clear() {
        this.#controllers.forEach(controller => {
            if (controller.destroy) {
                controller.destroy();
            }
        });
        this.#controllers.clear();
    }
}
