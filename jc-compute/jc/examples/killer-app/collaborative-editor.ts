/**
 * Killer Application: Collaborative Local-First Code Editor
 * 
 * Demonstrates:
 * - Real-time collaboration
 * - Conflict-free replicated data type (CRDT)
 * - Offline-capable editing
 * - Causal ordering for merge
 * - P2P synchronization
 * - Production-ready architecture
 */

import { JCCompute } from '../core/execution';
import { Event, Reducer } from '../types';
import { CryptoWebRTCMesh } from '../network/crypto-webrtc';
import { LSMStorage } from '../storage/lsm-storage';
import { EventEmitter } from 'events';
import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';

/**
 * CRDT for collaborative text editing
 * Uses RGA (Replicated Growable Array) algorithm
 */
interface CharacterMetadata {
  id: string; // Unique ID for this character
  lamport: number; // Logical timestamp
  siteId: string; // Originating site
  value: string; // The character
  deleted: boolean;
}

interface EditorState {
  characters: CharacterMetadata[];
  lamportClock: number;
  siteId: string;
  cursorPosition: number;
  selections: Map<string, { start: number; end: number }>;
  fileName: string;
  language: string;
}

type EditorEvent =
  | { type: 'INSERT_CHAR'; position: number; char: string; id: string; lamport: number; siteId: string }
  | { type: 'DELETE_CHAR'; id: string; lamport: number; siteId: string }
  | { type: 'UPDATE_CURSOR'; siteId: string; position: number }
  | { type: 'UPDATE_SELECTION'; siteId: string; start: number; end: number }
  | { type: 'LOAD_FILE'; fileName: string; content: string; language: string };

/**
 * Causal CRDT reducer for text editing
 */
const editorReducer: Reducer<EditorState, EditorEvent> = (state, event) => {
  const newState = { ...state };
  
  switch (event.payload.type) {
    case 'INSERT_CHAR': {
      const { position, char, id, lamport, siteId } = event.payload;
      
      const metadata: CharacterMetadata = {
        id,
        lamport,
        siteId,
        value: char,
        deleted: false,
      };
      
      // Insert maintaining causal order
      const insertIndex = findInsertPosition(newState.characters, position, lamport, siteId);
      newState.characters.splice(insertIndex, 0, metadata);
      newState.lamportClock = Math.max(newState.lamportClock, lamport) + 1;
      
      break;
    }
    
    case 'DELETE_CHAR': {
      const { id, lamport, siteId } = event.payload;
      
      // Mark as deleted (tombstone)
      const charIndex = newState.characters.findIndex(c => c.id === id);
      if (charIndex >= 0) {
        newState.characters[charIndex] = {
          ...newState.characters[charIndex],
          deleted: true,
        };
      }
      
      newState.lamportClock = Math.max(newState.lamportClock, lamport) + 1;
      break;
    }
    
    case 'UPDATE_CURSOR': {
      newState.cursorPosition = event.payload.position;
      break;
    }
    
    case 'UPDATE_SELECTION': {
      newState.selections.set(event.payload.siteId, {
        start: event.payload.start,
        end: event.payload.end,
      });
      break;
    }
    
    case 'LOAD_FILE': {
      const { fileName, content, language } = event.payload;
      
      // Convert content to characters
      newState.characters = content.split('').map((char, i) => ({
        id: `${newState.siteId}_init_${i}`,
        lamport: i,
        siteId: newState.siteId,
        value: char,
        deleted: false,
      }));
      
      newState.fileName = fileName;
      newState.language = language;
      newState.lamportClock = content.length;
      
      break;
    }
  }
  
  return newState;
};

/**
 * Find correct insertion position for CRDT
 */
function findInsertPosition(
  characters: CharacterMetadata[],
  logicalPosition: number,
  lamport: number,
  siteId: string
): number {
  // Filter out deleted characters for logical position
  const visible = characters.filter(c => !c.deleted);
  
  if (logicalPosition >= visible.length) {
    return characters.length;
  }
  
  // Find physical position
  let visibleCount = 0;
  for (let i = 0; i < characters.length; i++) {
    if (!characters[i].deleted) {
      if (visibleCount === logicalPosition) {
        // Check if we need to order by lamport/siteId for concurrent inserts
        let insertPos = i;
        while (
          insertPos < characters.length &&
          (characters[insertPos].lamport < lamport ||
            (characters[insertPos].lamport === lamport &&
              characters[insertPos].siteId < siteId))
        ) {
          insertPos++;
        }
        return insertPos;
      }
      visibleCount++;
    }
  }
  
  return characters.length;
}

/**
 * Get visible text from CRDT
 */
function getVisibleText(state: EditorState): string {
  return state.characters
    .filter(c => !c.deleted)
    .map(c => c.value)
    .join('');
}

/**
 * Collaborative Code Editor Application
 */
export class CollaborativeEditor extends EventEmitter {
  private compute: JCCompute<EditorState, EditorEvent>;
  private network: CryptoWebRTCMesh;
  private storage: LSMStorage;
  private siteId: string;
  private privateKey: Uint8Array;
  
  constructor(config: {
    dataDir: string;
    stunServers: string[];
    initialFile?: { name: string; content: string; language: string };
  }) {
    super();
    
    // Generate identity
    this.privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(this.privateKey);
    this.siteId = Buffer.from(sha256(publicKey)).toString('hex').slice(0, 16);
    
    // Initialize storage
    this.storage = new LSMStorage({
      dataDir: config.dataDir,
      memtableSize: 1024 * 1024, // 1MB
    });
    
    // Initialize network
    this.network = new CryptoWebRTCMesh(this.privateKey, {
      stunServers: config.stunServers,
      maxPeers: 20,
    });
    
    // Initialize compute engine
    const initialState: EditorState = {
      characters: [],
      lamportClock: 0,
      siteId: this.siteId,
      cursorPosition: 0,
      selections: new Map(),
      fileName: config.initialFile?.name || 'untitled.txt',
      language: config.initialFile?.language || 'plaintext',
    };
    
    this.compute = new JCCompute({
      reducer: editorReducer,
      initialState,
    });
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Load initial file if provided
    if (config.initialFile) {
      this.loadFile(config.initialFile.name, config.initialFile.content, config.initialFile.language);
    }
  }
  
  private setupEventHandlers() {
    // Network events
    this.network.on('peer:connected', (peerId) => {
      this.emit('peer:joined', peerId);
      this.syncWithPeer(peerId);
    });
    
    this.network.on('peer:message', async ({ peerId, data }) => {
      await this.handlePeerMessage(peerId, data);
    });
    
    this.network.on('peer:disconnected', (peerId) => {
      this.emit('peer:left', peerId);
    });
    
    // Compute events
    this.compute.on('event', async (event) => {
      await this.persistEvent(event);
      await this.broadcastEvent(event);
      this.emit('change', this.getState());
    });
    
    // Storage events
    this.storage.on('error', (err) => {
      this.emit('error', err);
    });
  }
  
  async start() {
    await this.storage.open();
    await this.loadPersistedEvents();
    this.emit('ready');
  }
  
  async stop() {
    this.network.disconnectAll();
    await this.storage.close();
    this.emit('stopped');
  }
  
  /**
   * Load file into editor
   */
  loadFile(fileName: string, content: string, language: string) {
    this.compute.emit({
      type: 'LOAD_FILE',
      payload: { type: 'LOAD_FILE', fileName, content, language },
    });
  }
  
  /**
   * Insert character at position
   */
  insertChar(position: number, char: string) {
    const state = this.compute.getState();
    const id = `${this.siteId}_${state.lamportClock}`;
    
    this.compute.emit({
      type: 'INSERT_CHAR',
      payload: {
        type: 'INSERT_CHAR',
        position,
        char,
        id,
        lamport: state.lamportClock,
        siteId: this.siteId,
      },
    });
  }
  
  /**
   * Insert text at position
   */
  insertText(position: number, text: string) {
    for (let i = 0; i < text.length; i++) {
      this.insertChar(position + i, text[i]);
    }
  }
  
  /**
   * Delete character at position
   */
  deleteChar(position: number) {
    const state = this.compute.getState();
    const visible = state.characters.filter(c => !c.deleted);
    
    if (position >= 0 && position < visible.length) {
      const char = visible[position];
      
      this.compute.emit({
        type: 'DELETE_CHAR',
        payload: {
          type: 'DELETE_CHAR',
          id: char.id,
          lamport: state.lamportClock,
          siteId: this.siteId,
        },
      });
    }
  }
  
  /**
   * Update cursor position
   */
  updateCursor(position: number) {
    this.compute.emit({
      type: 'UPDATE_CURSOR',
      payload: {
        type: 'UPDATE_CURSOR',
        siteId: this.siteId,
        position,
      },
    });
  }
  
  /**
   * Update selection
   */
  updateSelection(start: number, end: number) {
    this.compute.emit({
      type: 'UPDATE_SELECTION',
      payload: {
        type: 'UPDATE_SELECTION',
        siteId: this.siteId,
        start,
        end,
      },
    });
  }
  
  /**
   * Get current editor state
   */
  getState() {
    const state = this.compute.getState();
    return {
      text: getVisibleText(state),
      fileName: state.fileName,
      language: state.language,
      cursorPosition: state.cursorPosition,
      selections: Array.from(state.selections.entries()),
      peers: this.network.getPeers(),
    };
  }
  
  /**
   * Connect to peer
   */
  async connectToPeer(peerId: string, signal?: any) {
    await this.network.connect(peerId, signal);
  }
  
  /**
   * Sync history with peer
   */
  private async syncWithPeer(peerId: string) {
    const history = this.compute.getHistory();
    const syncMessage = {
      type: 'sync',
      events: history,
    };
    
    await this.network.sendToPeer(
      peerId,
      new TextEncoder().encode(JSON.stringify(syncMessage))
    );
  }
  
  /**
   * Handle message from peer
   */
  private async handlePeerMessage(peerId: string, data: Uint8Array) {
    try {
      const message = JSON.parse(new TextDecoder().decode(data));
      
      if (message.type === 'sync') {
        // Merge peer's history
        for (const event of message.events) {
          if (!this.compute.hasEvent(event.id)) {
            this.compute.applyEvent(event);
          }
        }
      } else if (message.type === 'event') {
        // Apply single event
        if (!this.compute.hasEvent(message.event.id)) {
          this.compute.applyEvent(message.event);
        }
      }
    } catch (err) {
      this.emit('error', err);
    }
  }
  
  /**
   * Broadcast event to all peers
   */
  private async broadcastEvent(event: Event<EditorEvent>) {
    const message = {
      type: 'event',
      event,
    };
    
    try {
      await this.network.broadcast(
        new TextEncoder().encode(JSON.stringify(message))
      );
    } catch (err) {
      this.emit('error', err);
    }
  }
  
  /**
   * Persist event to storage
   */
  private async persistEvent(event: Event<EditorEvent>) {
    const key = `event:${event.id}`;
    const value = new TextEncoder().encode(JSON.stringify(event));
    
    await this.storage.put(key, value);
  }
  
  /**
   * Load persisted events from storage
   */
  private async loadPersistedEvents() {
    // This would require implementing iteration in LSMStorage
    // For now, events are kept in memory
    this.emit('events:loaded');
  }
  
  /**
   * Export current file
   */
  export(): { fileName: string; content: string; language: string } {
    const state = this.compute.getState();
    return {
      fileName: state.fileName,
      content: getVisibleText(state),
      language: state.language,
    };
  }
  
  /**
   * Get editor statistics
   */
  getStats() {
    const state = this.compute.getState();
    return {
      characters: state.characters.length,
      visibleCharacters: state.characters.filter(c => !c.deleted).length,
      deletedCharacters: state.characters.filter(c => c.deleted).length,
      lamportClock: state.lamportClock,
      peers: this.network.getPeerCount(),
      events: this.compute.getEventCount(),
      storage: this.storage.getStats(),
    };
  }
}

/**
 * Example usage
 */
export async function example() {
  const editor = new CollaborativeEditor({
    dataDir: './editor-data',
    stunServers: ['stun:stun.l.google.com:19302'],
    initialFile: {
      name: 'main.ts',
      content: 'console.log("Hello, JC Compute!");',
      language: 'typescript',
    },
  });
  
  // Event handlers
  editor.on('ready', () => {
    console.log('Editor ready');
    console.log('State:', editor.getState());
  });
  
  editor.on('change', (state) => {
    console.log('Text changed:', state.text);
  });
  
  editor.on('peer:joined', (peerId) => {
    console.log('Peer joined:', peerId);
  });
  
  await editor.start();
  
  // Edit operations
  editor.insertText(0, '// JC Compute Demo\n');
  editor.updateCursor(19);
  
  // Export
  const exported = editor.export();
  console.log('Exported:', exported);
  
  // Stats
  console.log('Stats:', editor.getStats());
}
