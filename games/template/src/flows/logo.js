import { preloader } from "./preloader.js";

export async function logo(scope, ctx) {
    const { resources } = ctx;

    await resources.load("preloader");

    return preloader;
}
