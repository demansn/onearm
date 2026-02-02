export const isClass = func => {
    return (
        typeof func === "function" &&
        func.prototype &&
        func.prototype.constructor === func &&
        Object.getOwnPropertyNames(func.prototype).includes("constructor")
    );
};
