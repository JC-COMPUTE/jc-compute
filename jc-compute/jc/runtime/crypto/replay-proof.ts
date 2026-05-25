import crypto from 'crypto';

export function replayProof(events: string[]) {
  return crypto
    .createHash('sha256')
    .update(events.join(':'))
    .digest('hex');
}
