export class LiveNetworkSync {
  synchronize(nodeA: string[], nodeB: string[]) {
    return [...new Set([...nodeA, ...nodeB])];
  }

  verifyDeterminism(stateA: string, stateB: string) {
    return stateA === stateB;
  }
}
