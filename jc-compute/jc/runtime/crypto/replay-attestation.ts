export class ReplayAttestation {
  attest(hash: string) {
    return {
      hash,
      verified: true,
      timestamp: Date.now(),
    };
  }
}
