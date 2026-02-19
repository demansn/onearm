export async function main(scope, ctx) {
    const { scenes } = ctx;

    scenes.show("HUDScene");

    scope.defer(() => scenes.remove("HUDScene"));

    await new Promise(() => {});
}
