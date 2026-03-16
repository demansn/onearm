import gsap from "gsap";

/**
 * @description Composes items sequentially into a single timeline.
 * Accepts Timeline | Tween | Function | number (delay) | null
 * @param {Array} items
 * @returns {gsap.core.Timeline}
 */
export function sequence(items) {
    const tl = gsap.timeline();
    for (const item of items) {
        if (item == null) continue;
        if (typeof item === "number") tl.add(() => {}, `+=${item}`);
        else tl.add(item);
    }
    return tl;
}

/**
 * @description Composes items in parallel — all start at position 0
 * @param {Array} items
 * @returns {gsap.core.Timeline}
 */
export function parallel(items) {
    const tl = gsap.timeline();
    for (const item of items) {
        if (item != null) tl.add(item, 0);
    }
    return tl;
}

/**
 * @description Calls factory for each item with staggered start times
 * @param {Array} items
 * @param {Function} factory - (item, index) => Timeline | Tween | null
 * @param {number} staggerTime - delay between each item
 * @returns {gsap.core.Timeline}
 */
export function stagger(items, factory, staggerTime) {
    const tl = gsap.timeline();
    items.forEach((item, i) => {
        const child = factory(item, i);
        if (child != null) tl.add(child, i * staggerTime);
    });
    return tl;
}
