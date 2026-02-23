export class Timer {
    static wait(time) {
        const t = new Timer(time);
        t.start();
        return t.wait();
    }

    constructor(time) {
        this.time = time;
        this.currentTime = 0;
        this.completed = false;
    }

    start() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.timeout = setTimeout(this.complete.bind(this), this.time);
    }

    complete() {
        if (!this.isRunning) {
            return;
        }

        if (this.resolve) {
            this.resolve();
        }

        this.isRunning = false;
        this.completed = true;
        clearTimeout(this.timeout);
    }

    isDone() {
        return this.completed;
    }

    wait() {
        if (!this.isRunning) {
            return;
        }
        if (!this.promise) {
            this.promise = new Promise(resolve => {
                this.resolve = resolve;
            });
        }

        return this.promise;
    }
}
