/**
 * LSM-Tree Storage Engine for JC Compute
 * 
 * Implements:
 * - Log-Structured Merge Tree architecture
 * - Append-only segment files
 * - Binary serialization (MessagePack)
 * - Compaction and garbage collection
 * - Merkle tree for sync verification
 * - Bloom filters for efficient lookups
 */

import { Level } from 'level';
import { pack, unpack } from 'msgpackr';
import { sha256 } from '@noble/hashes/sha256';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface StorageConfig {
  dataDir: string;
  memtableSize?: number; // bytes
  segmentSize?: number; // bytes
  compactionThreshold?: number; // number of segments
  bloomFilterSize?: number; // bits
}

export interface SegmentMetadata {
  id: string;
  timestamp: number;
  keyRange: { min: string; max: string };
  count: number;
  size: number;
  merkleRoot: string;
}

/**
 * Bloom filter for fast negative lookups
 */
class BloomFilter {
  private bits: Uint8Array;
  private numHashes: number;
  
  constructor(size: number, numHashes = 3) {
    this.bits = new Uint8Array(Math.ceil(size / 8));
    this.numHashes = numHashes;
  }
  
  add(key: string) {
    const hashes = this.getHashes(key);
    for (const hash of hashes) {
      const idx = hash % (this.bits.length * 8);
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      this.bits[byteIdx] |= (1 << bitIdx);
    }
  }
  
  mightContain(key: string): boolean {
    const hashes = this.getHashes(key);
    for (const hash of hashes) {
      const idx = hash % (this.bits.length * 8);
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      if (!(this.bits[byteIdx] & (1 << bitIdx))) {
        return false;
      }
    }
    return true;
  }
  
  private getHashes(key: string): number[] {
    const hashes: number[] = [];
    const baseHash = sha256(Buffer.from(key));
    
    for (let i = 0; i < this.numHashes; i++) {
      const hash = sha256(new Uint8Array([...baseHash, i]));
      const num = new DataView(hash.buffer).getUint32(0, false);
      hashes.push(num);
    }
    
    return hashes;
  }
  
  serialize(): Uint8Array {
    return pack({ bits: this.bits, numHashes: this.numHashes });
  }
  
  static deserialize(data: Uint8Array): BloomFilter {
    const { bits, numHashes } = unpack(data);
    const filter = new BloomFilter(bits.length * 8, numHashes);
    filter.bits = bits;
    return filter;
  }
}

/**
 * Merkle tree for sync verification
 */
class MerkleTree {
  private leaves: Map<string, Uint8Array> = new Map();
  private root?: Uint8Array;
  
  add(key: string, value: Uint8Array) {
    const hash = sha256(new Uint8Array([...Buffer.from(key), ...value]));
    this.leaves.set(key, hash);
    this.root = undefined; // invalidate root
  }
  
  getRoot(): Uint8Array {
    if (this.root) {
      return this.root;
    }
    
    if (this.leaves.size === 0) {
      return new Uint8Array(32);
    }
    
    // Sort keys for deterministic tree
    const sortedKeys = Array.from(this.leaves.keys()).sort();
    const hashes = sortedKeys.map(k => this.leaves.get(k)!);
    
    this.root = this.buildTree(hashes);
    return this.root;
  }
  
  private buildTree(hashes: Uint8Array[]): Uint8Array {
    if (hashes.length === 1) {
      return hashes[0];
    }
    
    const nextLevel: Uint8Array[] = [];
    
    for (let i = 0; i < hashes.length; i += 2) {
      if (i + 1 < hashes.length) {
        const combined = new Uint8Array([...hashes[i], ...hashes[i + 1]]);
        nextLevel.push(sha256(combined));
      } else {
        nextLevel.push(hashes[i]);
      }
    }
    
    return this.buildTree(nextLevel);
  }
  
  getProof(key: string): Uint8Array[] | null {
    if (!this.leaves.has(key)) {
      return null;
    }
    
    const sortedKeys = Array.from(this.leaves.keys()).sort();
    const index = sortedKeys.indexOf(key);
    const hashes = sortedKeys.map(k => this.leaves.get(k)!);
    
    return this.buildProof(hashes, index);
  }
  
  private buildProof(hashes: Uint8Array[], index: number): Uint8Array[] {
    if (hashes.length === 1) {
      return [];
    }
    
    const proof: Uint8Array[] = [];
    const pairIndex = index % 2 === 0 ? index + 1 : index - 1;
    
    if (pairIndex < hashes.length) {
      proof.push(hashes[pairIndex]);
    }
    
    const nextLevel: Uint8Array[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      if (i + 1 < hashes.length) {
        nextLevel.push(sha256(new Uint8Array([...hashes[i], ...hashes[i + 1]])));
      } else {
        nextLevel.push(hashes[i]);
      }
    }
    
    proof.push(...this.buildProof(nextLevel, Math.floor(index / 2)));
    return proof;
  }
}

/**
 * Immutable SSTable segment
 */
class SSTable {
  private data = new Map<string, Uint8Array>();
  private bloom: BloomFilter;
  private merkle = new MerkleTree();
  private metadata: SegmentMetadata;
  
  constructor(id: string, bloomSize: number) {
    this.bloom = new BloomFilter(bloomSize);
    this.metadata = {
      id,
      timestamp: Date.now(),
      keyRange: { min: '', max: '' },
      count: 0,
      size: 0,
      merkleRoot: '',
    };
  }
  
  add(key: string, value: Uint8Array) {
    this.data.set(key, value);
    this.bloom.add(key);
    this.merkle.add(key, value);
    
    this.metadata.count++;
    this.metadata.size += key.length + value.length;
    
    // Update key range
    if (!this.metadata.keyRange.min || key < this.metadata.keyRange.min) {
      this.metadata.keyRange.min = key;
    }
    if (!this.metadata.keyRange.max || key > this.metadata.keyRange.max) {
      this.metadata.keyRange.max = key;
    }
  }
  
  get(key: string): Uint8Array | null {
    if (!this.bloom.mightContain(key)) {
      return null;
    }
    return this.data.get(key) ?? null;
  }
  
  has(key: string): boolean {
    if (!this.bloom.mightContain(key)) {
      return false;
    }
    return this.data.has(key);
  }
  
  finalize() {
    const root = this.merkle.getRoot();
    this.metadata.merkleRoot = Buffer.from(root).toString('hex');
  }
  
  async persist(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
    
    const dataPath = path.join(dir, `${this.metadata.id}.data`);
    const bloomPath = path.join(dir, `${this.metadata.id}.bloom`);
    const metaPath = path.join(dir, `${this.metadata.id}.meta`);
    
    // Write data
    const entries = Array.from(this.data.entries()).sort(([a], [b]) => a.localeCompare(b));
    const packed = pack(entries);
    await fs.writeFile(dataPath, packed);
    
    // Write bloom filter
    await fs.writeFile(bloomPath, this.bloom.serialize());
    
    // Write metadata
    await fs.writeFile(metaPath, pack(this.metadata));
  }
  
  static async load(dir: string, id: string): Promise<SSTable> {
    const dataPath = path.join(dir, `${id}.data`);
    const bloomPath = path.join(dir, `${id}.bloom`);
    const metaPath = path.join(dir, `${id}.meta`);
    
    const metadata = unpack(await fs.readFile(metaPath)) as SegmentMetadata;
    const table = new SSTable(id, 10000);
    table.metadata = metadata;
    
    // Load bloom filter
    table.bloom = BloomFilter.deserialize(await fs.readFile(bloomPath));
    
    // Load data
    const entries = unpack(await fs.readFile(dataPath)) as Array<[string, Uint8Array]>;
    for (const [key, value] of entries) {
      table.data.set(key, value);
      table.merkle.add(key, value);
    }
    
    return table;
  }
  
  getMetadata(): SegmentMetadata {
    return { ...this.metadata };
  }
  
  keys(): string[] {
    return Array.from(this.data.keys()).sort();
  }
  
  entries(): Array<[string, Uint8Array]> {
    return Array.from(this.data.entries()).sort(([a], [b]) => a.localeCompare(b));
  }
}

/**
 * LSM-Tree Storage Engine
 */
export class LSMStorage extends EventEmitter {
  private config: Required<StorageConfig>;
  private memtable = new Map<string, Uint8Array>();
  private memtableSize = 0;
  private segments: SSTable[] = [];
  private wal?: Level;
  private compacting = false;
  
  constructor(config: StorageConfig) {
    super();
    this.config = {
      dataDir: config.dataDir,
      memtableSize: config.memtableSize || 4 * 1024 * 1024, // 4MB
      segmentSize: config.segmentSize || 64 * 1024 * 1024, // 64MB
      compactionThreshold: config.compactionThreshold || 10,
      bloomFilterSize: config.bloomFilterSize || 100000,
    };
  }
  
  async open() {
    await fs.mkdir(this.config.dataDir, { recursive: true });
    
    // Open write-ahead log
    this.wal = new Level(path.join(this.config.dataDir, 'wal'));
    
    // Load existing segments
    await this.loadSegments();
    
    // Recover from WAL
    await this.recoverFromWAL();
    
    this.emit('ready');
  }
  
  async put(key: string, value: Uint8Array): Promise<void> {
    // Write to WAL first
    if (this.wal) {
      await this.wal.put(key, value);
    }
    
    // Update memtable
    const oldSize = this.memtable.has(key)
      ? key.length + this.memtable.get(key)!.length
      : 0;
    
    this.memtable.set(key, value);
    this.memtableSize += key.length + value.length - oldSize;
    
    // Flush if memtable is full
    if (this.memtableSize >= this.config.memtableSize) {
      await this.flush();
    }
  }
  
  async get(key: string): Promise<Uint8Array | null> {
    // Check memtable first
    if (this.memtable.has(key)) {
      return this.memtable.get(key)!;
    }
    
    // Check segments (newest first)
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const value = this.segments[i].get(key);
      if (value !== null) {
        return value;
      }
    }
    
    return null;
  }
  
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }
  
  async delete(key: string): Promise<void> {
    // Tombstone deletion
    await this.put(key, new Uint8Array(0));
  }
  
  private async flush(): Promise<void> {
    if (this.memtable.size === 0) {
      return;
    }
    
    const segment = new SSTable(
      `segment_${Date.now()}`,
      this.config.bloomFilterSize
    );
    
    // Write memtable to segment
    for (const [key, value] of this.memtable) {
      segment.add(key, value);
    }
    
    segment.finalize();
    await segment.persist(this.config.dataDir);
    
    this.segments.push(segment);
    
    // Clear memtable and WAL
    this.memtable.clear();
    this.memtableSize = 0;
    
    if (this.wal) {
      await this.wal.clear();
    }
    
    this.emit('flush', segment.getMetadata());
    
    // Trigger compaction if needed
    if (this.segments.length >= this.config.compactionThreshold) {
      this.compact().catch(err => this.emit('error', err));
    }
  }
  
  private async compact(): Promise<void> {
    if (this.compacting || this.segments.length < 2) {
      return;
    }
    
    this.compacting = true;
    
    try {
      // Merge oldest segments
      const toMerge = this.segments.slice(0, Math.min(5, this.segments.length));
      const merged = new SSTable(
        `compacted_${Date.now()}`,
        this.config.bloomFilterSize
      );
      
      // Collect all keys
      const allKeys = new Set<string>();
      for (const segment of toMerge) {
        for (const key of segment.keys()) {
          allKeys.add(key);
        }
      }
      
      // For each key, get the latest value
      for (const key of Array.from(allKeys).sort()) {
        for (let i = toMerge.length - 1; i >= 0; i--) {
          const value = toMerge[i].get(key);
          if (value !== null) {
            // Skip tombstones
            if (value.length > 0) {
              merged.add(key, value);
            }
            break;
          }
        }
      }
      
      merged.finalize();
      await merged.persist(this.config.dataDir);
      
      // Replace old segments with merged
      this.segments = [
        merged,
        ...this.segments.slice(toMerge.length),
      ];
      
      // Delete old segment files
      for (const segment of toMerge) {
        const id = segment.getMetadata().id;
        await fs.unlink(path.join(this.config.dataDir, `${id}.data`)).catch(() => {});
        await fs.unlink(path.join(this.config.dataDir, `${id}.bloom`)).catch(() => {});
        await fs.unlink(path.join(this.config.dataDir, `${id}.meta`)).catch(() => {});
      }
      
      this.emit('compaction', merged.getMetadata());
    } finally {
      this.compacting = false;
    }
  }
  
  private async loadSegments(): Promise<void> {
    const files = await fs.readdir(this.config.dataDir);
    const metaFiles = files.filter(f => f.endsWith('.meta'));
    
    const segments: Array<{ id: string; timestamp: number }> = [];
    
    for (const file of metaFiles) {
      const metadata = unpack(
        await fs.readFile(path.join(this.config.dataDir, file))
      ) as SegmentMetadata;
      
      segments.push({ id: metadata.id, timestamp: metadata.timestamp });
    }
    
    // Sort by timestamp (oldest first)
    segments.sort((a, b) => a.timestamp - b.timestamp);
    
    // Load segments
    for (const { id } of segments) {
      const segment = await SSTable.load(this.config.dataDir, id);
      this.segments.push(segment);
    }
  }
  
  private async recoverFromWAL(): Promise<void> {
    if (!this.wal) {
      return;
    }
    
    for await (const [key, value] of this.wal.iterator()) {
      this.memtable.set(key, value as Uint8Array);
      this.memtableSize += key.length + (value as Uint8Array).length;
    }
  }
  
  async close(): Promise<void> {
    await this.flush();
    if (this.wal) {
      await this.wal.close();
    }
    this.emit('close');
  }
  
  getStats() {
    return {
      memtableSize: this.memtableSize,
      memtableKeys: this.memtable.size,
      segments: this.segments.length,
      totalKeys: this.segments.reduce((sum, s) => sum + s.getMetadata().count, 0) + this.memtable.size,
      totalSize: this.segments.reduce((sum, s) => sum + s.getMetadata().size, 0) + this.memtableSize,
    };
  }
  
  async getMerkleRoot(): Promise<string> {
    const trees = this.segments.map(s => s.getMetadata().merkleRoot);
    
    // Include memtable
    if (this.memtable.size > 0) {
      const tree = new MerkleTree();
      for (const [key, value] of this.memtable) {
        tree.add(key, value);
      }
      trees.push(Buffer.from(tree.getRoot()).toString('hex'));
    }
    
    // Combine all roots
    if (trees.length === 0) {
      return '';
    }
    
    const combined = trees.join('');
    return Buffer.from(sha256(Buffer.from(combined))).toString('hex');
  }
}
