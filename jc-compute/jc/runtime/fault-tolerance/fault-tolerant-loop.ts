export class FaultTolerantLoop {
  run(operation: Function) {
    try {
      operation();
    } catch (err) {
      console.error('Runtime recovered from failure:', err);
      this.run(operation);
    }
  }
}
