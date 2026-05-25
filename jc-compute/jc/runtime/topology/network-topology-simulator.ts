export type Topology =
  | 'mesh'
  | 'star'
  | 'ring'
  | 'hierarchical';

export class NetworkTopologySimulator {
  simulate(topology: Topology, nodes: number) {
    return {
      topology,
      nodes,
      estimatedLatencyMs: nodes * 2,
      estimatedRecoveryMs: nodes * 4,
    };
  }
}
