import { Signal } from "typed-signals";
import { Service } from "./Service.js";

export class FullscreenService extends Service {
    constructor(params) {
        super(params);
        
        this.isFullscreen = false;
        this.onFullscreenChange = new Signal();
        
        this._handleFullscreenChange = this._handleFullscreenChange.bind(this);
        this._addEventListeners();
    }

    _addEventListeners() {
        document.addEventListener('fullscreenchange', this._handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this._handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', this._handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', this._handleFullscreenChange);
    }

    _handleFullscreenChange() {
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        
        if (this.isFullscreen !== isCurrentlyFullscreen) {
            this.isFullscreen = isCurrentlyFullscreen;
            this.onFullscreenChange.emit(this.isFullscreen);
        }
    }

    async enterFullscreen() {
        if (this.isFullscreen) return;

        const element = document.documentElement;

        try {
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }
        } catch (error) {
            console.warn('Failed to enter fullscreen:', error);
        }
    }

    async exitFullscreen() {
        if (!this.isFullscreen) return;

        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                await document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
        } catch (error) {
            console.warn('Failed to exit fullscreen:', error);
        }
    }

    async toggleFullscreen() {
        if (this.isFullscreen) {
            await this.exitFullscreen();
        } else {
            await this.enterFullscreen();
        }
    }

    get isSupported() {
        const element = document.documentElement;
        return !!(
            element.requestFullscreen ||
            element.webkitRequestFullscreen ||
            element.mozRequestFullScreen ||
            element.msRequestFullscreen
        );
    }

    destroy() {
        document.removeEventListener('fullscreenchange', this._handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this._handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', this._handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', this._handleFullscreenChange);
        
        this.onFullscreenChange.disconnectAll();
    }
}