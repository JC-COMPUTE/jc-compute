import crypto from 'crypto';

export class LineageHashing {
  hash(lineage: string[]) {
    return crypto
      .createHash('sha256')
      .update(lineage.join('->'))
      .digest('hex');
  }
}
