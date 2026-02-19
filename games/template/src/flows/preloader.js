import { main } from "./main.js";

export async function preloader(scope, ctx) {
    const { scenes, resources } = ctx;

    const scene = scenes.show("PreloaderScene");

    scope.defer(() => scenes.remove("PreloaderScene"));

    await resources.load("main", {
        onProgress(progress) {
            scene.setProgress(progress * 100);
        },
    });

    scene.setProgress(100);

    return main;
}
