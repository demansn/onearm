/**
 * Детекция iOS устройства и версии Safari.
 * Определяет доступность Fullscreen API и среду выполнения (iframe).
 */
export function detectiOS() {
    const ua = navigator.userAgent;

    // iOS: iPhone/iPad/iPod или десктопный Safari с тач-событиями (iPad в desktop mode)
    const isIOS =
        /iP[ao]d|iPhone/i.test(ua) ||
        (ua.includes("Macintosh") && "ontouchend" in document);

    // Mobile Safari (не Chrome/Firefox на iOS)
    const isSafari = isIOS && /AppleWebKit/.test(ua) && !/CriOS|FxiOS/.test(ua);

    // Версия iOS (0 если не iOS)
    let version = 0;
    if (isIOS) {
        const match = ua.match(/OS (\d+)[\._]/);
        if (match) version = parseInt(match[1], 10);
    }

    const hasFullscreenAPI = !!(
        document.documentElement.requestFullscreen ||
        document.documentElement.webkitRequestFullscreen
    );

    const isInIframe = window.self !== window.top;

    return { isIOS, isSafari, version, hasFullscreenAPI, isInIframe };
}
