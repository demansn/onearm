/**
 * Find first object by name in children tree
 * @param {string} name
 * @param {Array} children
 * @returns {*}
 */
export function findObjectByName(name, children = []) {
    for (const child of children) {
        if (child.name === name) {
            return child;
        }

        if (child.children && child.children.length > 0) {
            const found = findObjectByName(name, child.children);
            if (found) {
                return found;
            }
        }
    }

    return null;
}

/**
 * Find all objects by name in children tree
 * @param {string} name
 * @param {Array} children
 * @returns {Array}
 */
export function findObjectsByName(name, children = []) {
    let results = [];

    for (const child of children) {
        if (child.name === name) {
            results.push(child);
        }

        if (child.children && child.children.length > 0) {
            results = results.concat(findObjectsByName(name, child.children));
        }
    }

    return results;
}

/**
 * Find first object by dot notation query (e.g. "Container.Button")
 * @param {string} query
 * @param {Array} children
 * @returns {*}
 */
export function findByQuery(query, children = []) {
    const parts = query.split(".");

    if (parts.length === 1) {
        return findObjectByName(parts[0], children);
    }

    const [first, ...rest] = parts;
    const container = findObjectByName(first, children);

    if (!container || !container.children) {
        return null;
    }

    return findByQuery(rest.join("."), container.children);
}

/**
 * Find all objects by dot notation query (e.g. "Container.Button")
 * Returns all matching objects at the final path segment
 * @param {string} query
 * @param {Array} children
 * @returns {Array}
 */
export function findAllByQuery(query, children = []) {
    const parts = query.split(".");

    if (parts.length === 1) {
        return findObjectsByName(parts[0], children);
    }

    const [first, ...rest] = parts;
    const containers = findObjectsByName(first, children);
    const restQuery = rest.join(".");
    let results = [];

    for (const container of containers) {
        if (container.children) {
            results = results.concat(findAllByQuery(restQuery, container.children));
        }
    }

    return results;
}

