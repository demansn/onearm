export class AlignLayout {
    constructor(params) {
        this.params = params;
    }

    updateZone(zone, objects) {
        this.zone = zone;
        this.align(objects);
    }

    align(objects) {
        objects.forEach(object => {
            //align = {x: left | top | bottom | center, y: left | top | bottom | center, offset: {left, top, bottom, right} | pixels | precent }
            const { metaData = {} } = object;
            const align = metaData.align || {};
            if (align) {
                const position = this.positionObject(this.zone, object, align);

                object.x = position.x;
                object.y = position.y;
            }
        });
    }

    /**
     * Positions an object within a given area, considering align, offset, pivot, and anchor.
     * @param {Object} area - Area to position in. {left|x, top|y, right|width, bottom|height}
     * @param {Object} object - Object to position. {width, height, pivot, anchor}
     * @param {Object} align - Alignment config. {x: 'left'|'center'|'right', y: 'top'|'center'|'bottom', offset: {left, right, top, bottom, x, y}}
     * @returns {{x: number, y: number}} - Calculated position
     */
    positionObject(area, object, align) {
        // area: {left|x, top|y, right|width, bottom|height}
        // object: {width, height, pivot, anchor}
        // align: {x, y, offset}
        const left = area.left !== undefined ? area.left : area.x;
        const top = area.top !== undefined ? area.top : area.y;
        const width = area.right !== undefined ? area.right : area.width;
        const height = area.bottom !== undefined ? area.bottom : area.height;

        let objWidth = object.width;
        let objHeight = object.height;
        let pivot = object.pivot || { x: 0, y: 0 };
        let anchor = object.anchor || { x: 0, y: 0 };
        let offset = align.offset || {};

        if (typeof offset === "number") {
            offset = {
                left: offset,
                right: offset,
                top: offset,
                bottom: offset,
            };
        }

        let x = left;
        let y = top;

        // Horizontal alignment
        if (align.x === "left") {
            x += offset.left || 0;
        } else if (align.x === "right") {
            x += width - objWidth - (offset.right || 0);
        } else {
            // center or default
            x += (width - objWidth) / 2 + (offset.x || 0);
        }

        // Vertical alignment
        if (align.y === "top") {
            y += offset.top || 0;
        } else if (align.y === "bottom") {
            y += height - objHeight - (offset.bottom || 0);
        } else {
            // center or default
            y += (height - objHeight) / 2 + (offset.y || 0);
        }

        // Apply anchor and pivot
        x -= objWidth * (anchor.x || 0) - objWidth * (pivot.x || 0);
        y -= objHeight * (anchor.y || 0) - objHeight * (pivot.y || 0);

        return { x, y };
    }
}
