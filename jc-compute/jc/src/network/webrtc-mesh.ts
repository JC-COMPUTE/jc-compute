
export interface PeerDescriptor {
  id: string;
  latency: number;
  bandwidth: number;
  lastSeen: number;
}

export class WebRTCMesh {
  private peers = new Map<string, PeerDescriptor>();

  registerPeer(peer: PeerDescriptor) {
    this.peers.set(peer.id, peer);
  }

  discoverPeers(): PeerDescriptor[] {
    return [...this.peers.values()]
      .sort((a,b)=>a.latency-b.latency);
  }

  antiEntropySync(localHashes: string[], remoteHashes: string[]) {
    const missing = remoteHashes.filter(h => !localHashes.includes(h));
    return {
      missing,
      requestChunks: missing.slice(0, 128),
    };
  }

  adaptiveBroadcast(payloadSize: number) {
    const peers = this.discoverPeers();
    return peers.map(peer => ({
      peer: peer.id,
      chunkSize: Math.max(1024, Math.floor(peer.bandwidth * 0.05)),
      compression: payloadSize > 100000,
    }));
  }
}
