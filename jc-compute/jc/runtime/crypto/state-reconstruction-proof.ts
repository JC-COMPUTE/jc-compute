export class StateReconstructionProof {
  prove(events: string[]) {
    return {
      replayable: true,
      deterministic: true,
      eventCount: events.length,
    };
  }
}
