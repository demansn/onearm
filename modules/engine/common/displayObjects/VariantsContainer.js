import { BaseContainer } from "../core/BaseContainer.js";

export class VariantsContainer extends BaseContainer {
    constructor({ variants, variant, ...rest }) {
        super(rest);

        this.variants = variants;
        this.variant = variant || variants[0].name;
    }

    set variant(variant) {
        if (variant === this.variant || this.variants.findIndex(v => v.name === variant) === -1) {
            return;
        };
        this._variant = variant;
        this.updateVariant();
    }

    get variant() {
        return this._variant;
    }

    updateVariant() {
        this.removeChildren();
        this.addChild(...this.variants[this.variantIndex].children);
    }

    setVariantByIndex(index) {
        this.variant = this.variants[index].name;
    }

    get variantsCount() {
        return this.variants.length;
    }

    get variantIndex() {
        return this.variants.findIndex(variant => variant.name === this.variant);
    }
}
