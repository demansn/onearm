import { TextBlockXMLParser } from "../../engine/index.js";
import gsap from "gsap";

const PAYS_TEXT = {
    WIN: '<TextBlock>{{symbols}}X<Sprite image="{{symbol}}" scale="0.5"/>PAYS {{win}}</TextBlock>',
    WIN_WITH_MULTIPLIER:
        '<TextBlock>{{symbols}}X<Sprite image="SK"  scale="0.5"/>{{one}} x {{multiplier}} = {{win}}</TextBlock>',
};

export class InfoTexts {
    constructor(roots, { currencyFormatter, gameConfig }) {
        this.roots = roots;
        this.currencyFormatter = currencyFormatter;
        this.gameConfig = gameConfig;
        this.infoPaysTexts = this.roots.map((root) => root.find("InfoPaysTextBlock"));
        this.winInfoTexts = this.roots.map((root) => root.find("WinInfoTexts"));
        this.infoTexts = this.roots.map((root) => root.find("InfoText"));
        this.winValues = this.roots.map((root) => root.find("WinValue"));

        this.infoPaysTexts.forEach((infoPaysText) => {
            infoPaysText.visible = false;
        });
        this.winInfoTexts.forEach((winInfoText) => winInfoText.visible = false);
        this.infoTexts.forEach((infoText) => infoText.visible = true);
    }

    setWinState({win = 0} = {}) {
        this.infoPaysTexts.forEach((infoPaysText) => infoPaysText.visible = true);
        this.winInfoTexts.forEach((winInfoText) => winInfoText.visible = true);
        this.infoTexts.forEach((infoText) => infoText.visible = false);
        this.setPaysText();
        this.winValues.forEach((winValue) => winValue.text = this.currencyFormatter.format(win));
    }

    setNormalState(text) {
        this.infoPaysTexts.forEach((infoPaysText) => infoPaysText.visible = false);
        this.winInfoTexts.forEach((winInfoText) => winInfoText.visible = false);
        this.infoTexts.forEach((infoText) => infoText.visible = true);
        this.setPaysText();
        if (text !== undefined) {
            this.infoTexts.forEach((infoText) => infoText.text = text);
        }
        this.winValues.forEach((winValue) => winValue.text = "0");
    }

    showPayInfo(pay) {
        const timeline = gsap.timeline();

        timeline.call(() => this.createPayInfo(pay));

        return timeline;
    }

    setWin(value) {
        this.winValues.forEach((winValue) => winValue.text = this.currencyFormatter.format(value));
    }

    setInfoText(text) {
        this.infoTexts.forEach((infoText) => infoText.text = text);
    }

    createPayInfo(pay) {
        const values = {
            win: this.currencyFormatter.format(pay.win),
            one: pay.multipliers ? this.currencyFormatter.format(pay.win / pay.multipliers) : 0,
            symbols: pay.symbols,
            symbol: pay.symbol,
            multiplier: pay.multipliers || 0,
        };
        const template = pay.multipliers > 0 ? PAYS_TEXT.WIN_WITH_MULTIPLIER : PAYS_TEXT.WIN;
        const config = TextBlockXMLParser.parse(template, values);

        this.infoPaysTexts.forEach((infoPaysText) => infoPaysText.updateConfig({
            elements: config.elements,
        }));
    }

    setPaysText(text) {
        this.infoPaysTexts.forEach((infoPaysText) => infoPaysText.updateConfig({
            elements: text ? [{ type: "Text",text }] : [],
        }));
    }
}
