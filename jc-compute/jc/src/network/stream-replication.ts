
export interface ReplicationChunk {
  id: string;
  offset: number;
  total: number;
  payload: Uint8Array;
}

export class StreamReplicator {
  private inflight = 0;
  private readonly maxInflight = 32;

  shouldBackpressure(): boolean {
    return this.inflight >= this.maxInflight;
  }

  createChunks(data: Uint8Array, chunkSize = 65536): ReplicationChunk[] {
    const chunks: ReplicationChunk[] = [];
    let offset = 0;
    let idx = 0;

    while (offset < data.length) {
      const payload = data.slice(offset, offset + chunkSize);
      chunks.push({
        id: `chunk-${idx++}`,
        offset,
        total: data.length,
        payload,
      });
      offset += chunkSize;
    }

    return chunks;
  }

  acknowledgeChunk() {
    this.inflight = Math.max(0, this.inflight - 1);
  }

  sendChunk() {
    this.inflight++;
  }
}
