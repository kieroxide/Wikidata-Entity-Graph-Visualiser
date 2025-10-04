export class FrameQueue {
    private static queue: Array<() => void> = [];
    private static started = false;

    static push(task: () => void) {
        this.queue.push(task);
        if (!this.started) {
            this.started = true;
            this.process();
        }
    }

    private static process() {
        if (this.queue.length > 0) {
            const task = this.queue.shift();
            task && task();
        }
        requestAnimationFrame(() => this.process());
    }
}
