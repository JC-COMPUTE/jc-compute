
export interface ValidatorVote {
  validatorId: string;
  signature: string;
  blockHash: string;
  round: number;
}

export class ByzantineFinality {
  private slashLog = new Map<string, string[]>();

  aggregateSignatures(votes: ValidatorVote[]): string {
    return votes.map(v => v.signature).sort().join(':');
  }

  probabilisticFinality(totalValidators: number, agreeing: number): number {
    return agreeing / Math.max(1, totalValidators);
  }

  detectEquivocation(votes: ValidatorVote[]): string[] {
    const seen = new Map<string, string>();
    const offenders: string[] = [];

    for (const vote of votes) {
      const prior = seen.get(vote.validatorId);

      if (prior && prior !== vote.blockHash) {
        offenders.push(vote.validatorId);
      }

      seen.set(vote.validatorId, vote.blockHash);
    }

    return offenders;
  }

  slash(validatorId: string, reason: string) {
    const entries = this.slashLog.get(validatorId) || [];
    entries.push(reason);
    this.slashLog.set(validatorId, entries);
  }

  rotateValidators(validators: string[], epoch: number): string[] {
    return [...validators]
      .sort()
      .slice(epoch % validators.length)
      .concat(validators.slice(0, epoch % validators.length));
  }
}
