export class RuntimeScheduler {
  private queue: Function[] = [];

  schedule(task: Function) {
    this.queue.push(task);
  }

  execute() {
    while (this.queue.length) {
      const task = this.queue.shift();
      task?.();
    }
  }
}
