
class DeterministicAIWorkflow {
  constructor(history = []) {
    this.history = history;
  }

  step(input, output) {
    const event = {
      input,
      output,
      timestamp: this.history.length
    };

    this.history.push(event);
    return event;
  }

  replay() {
    return this.history.map(e => ({
      input: e.input,
      output: e.output
    }));
  }

  lineage() {
    return this.history.map((e, i) => ({
      step: i,
      parent: i - 1
    }));
  }
}

const workflow = new DeterministicAIWorkflow();

workflow.step("prompt-1", "response-1");
workflow.step("prompt-2", "response-2");

console.log(workflow.replay());
console.log(workflow.lineage());
