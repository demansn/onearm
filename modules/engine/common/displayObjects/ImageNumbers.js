import { Container, Sprite, Point } from "pixi.js";

/**
 * ImageNumbers — renders a number/string as a row of bitmap glyph sprites.
 *
 * Each character is mapped (via textureMap) to a texture alias resolved from
 * the "resources" service, instantiated as a Sprite, and laid out left-to-right.
 * Useful for multipliers/counters that need pixel-art glyphs instead of a font
 * (e.g. slot wild badges "2X".."10X").
 *
 * Config (ObjectFactory type "ImageNumbers"):
 *   size       number   target glyph height in px (null = natural texture size)
 *   anchor     [x, y]   group anchor along both axes, applied at the child level
 *   textureMap object   char → alias map (defaults to 0-9, ".", "x"/"X")
 *
 * The default textureMap assumes aliases "0".."9", "dot", "x" exist game-side;
 * override via the textureMap option for other glyph sets.
 */

const DEFAULT_TEXTURE_MAP = {
    "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
    "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
    ".": "dot",
    "x": "x",
    "X": "x",
};

export class ImageNumbers extends Container {
    constructor({ resources, textureMap, size = null }) {
        super();
        this._resources = resources;
        this._textureMap = textureMap ?? DEFAULT_TEXTURE_MAP;
        this._size = size;      // целевая высота глифа или null (натуральный размер)
        // anchor строки [0..1, 0..1]: 0 — левый/верхний край у origin, 0.5 — центр,
        // 1 — правый/нижний. Public Point с .set/.x/.y — onearm applyDisplayProperties
        // применяет сюда `anchor` из конфига (anchor !== undefined && object.anchor !== undefined).
        this.anchor = new Point(0.5, 0.5);
        this._value = null;     // последнее значение для перерисовки в setSize
        this._decimals = 2;
    }

    setSize(size) {
        this._size = size;
        if (this._value !== null) this.setValue(this._value, this._decimals);
    }

    setValue(value, decimals = 2) {
        this._value = value;
        this._decimals = decimals;

        const str = typeof value === "number"
            ? value.toFixed(decimals)
            : String(value);

        // Уничтожаем старые спрайты, а не просто отвязываем: символы пулятся и
        // reset() дёргает setValue() многократно — иначе осиротевшие Sprite
        // копятся. destroy() по умолчанию НЕ трогает texture (она шарится).
        this.removeChildren().forEach((c) => c.destroy());

        let x = 0;
        let maxH = 0;
        for (const ch of str) {
            const alias = this._textureMap[ch];
            if (!alias) continue;
            const tex = this._resources.get(alias);
            if (!tex) {
                console.warn(`[ImageNumbers] texture not found for alias "${alias}"`);
                continue;
            }
            const sprite = new Sprite(tex);
            if (this._size != null && tex.height > 0) {
                sprite.scale.set(this._size / tex.height);
            }
            sprite.x = x;
            x += sprite.width;
            if (sprite.height > maxH) maxH = sprite.height;
            this.addChild(sprite);
        }

        // Смещаем содержимое относительно origin (0,0) по anchor — НА УРОВНЕ ДЕТЕЙ.
        // pivot/position самого контейнера здесь бесполезны: ImageNumbers крепится к
        // slot спайна через addSlotObject, и спайн каждый кадр (Spine._updateAndApplyState
        // → updateSlotObjects → setFromMatrix) задаёт transform контейнера по кости.
        // setFromMatrix→decompose ЧИТАЕТ pivot и пересчитывает position так, что итоговая
        // матрица == матрице кости — pivot и position контейнера нейтрализуются, локальный
        // (0,0) жёстко привязан к кости. Влияют только позиции дочерних спрайтов.
        // anchor.x=0 → строка справа от кости, 0.5 → по центру, 1 → слева.
        const dx = -x * this.anchor.x;
        const dy = -maxH * this.anchor.y;
        for (const sprite of this.children) {
            sprite.x += dx;
            sprite.y += dy;
        }
    }
}
