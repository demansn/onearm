const kOrigTint = Symbol("origTint");

export function applyTintToChildren(container, colorHex, { includeMeshes = true } = {}) {
    container.children.forEach(child => {
        if ("tint" in child && (includeMeshes || !(child instanceof PIXI.Mesh))) {
            if (child[kOrigTint] === undefined) child[kOrigTint] = child.tint;
            child.tint = colorHex;
        }
        if ("children" in child && child.children?.length) {
            applyTintToChildren(child, colorHex, { includeMeshes });
        }
    });
}

export function restoreTints(container) {
    container.children.forEach(child => {
        if ("tint" in child && child[kOrigTint] !== undefined) {
            child.tint = child[kOrigTint];
            delete child[kOrigTint];
        }
        if ("children" in child && child.children?.length) {
            restoreTints(child);
        }
    });
}
