export interface Agent {
  id: string;
  memory: string[];
}

export class AISwarmRuntime {
  private agents: Agent[] = [];

  register(agent: Agent) {
    this.agents.push(agent);
  }

  synchronize() {
    return this.agents.map(agent => ({
      id: agent.id,
      synchronized: true,
    }));
  }
}
