/**
 * Core Types for JC Compute
 * Unified Causal Compute Stack
 */

/**
 * Causal Reference - Link between events
 */
export interface CausalRef {
  eventId: string;
  relation: 'parent' | 'dependency' | 'merge' | 'fork';
  metadata?: Record<string, any>;
}

/**
 * Capability Context - Authority for state mutation
 */
export interface CapabilityContext {
  capabilities: string[];
  principal: string;
  scope?: string[];
  constraints?: Record<string, any>;
}

/**
 * Event - Immutable atomic state transition
 */
export interface Event<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp?: number;
  hash?: string;
  
  // Causal relationships
  parentEventId?: string;
  parentEventIds?: string[];
  causality?: CausalRef[];
  
  // Authority
  capability?: CapabilityContext;
  principal?: string;
  
  // Additional context
  metadata?: Record<string, any>;
}

/**
 * State Snapshot - Point-in-time state
 */
export interface StateSnapshot<S = any> {
  state: S;
  eventId: string;
  timestamp: number;
  hash?: string;
}

/**
 * Reducer - Deterministic state transformation
 */
export type Reducer<S, E> = (
  state: S,
  event: Event<E>,
  capabilities?: CapabilityContext
) => S;

/**
 * Execution Context - Runtime environment for state transformations
 */
export interface ExecutionContext<S = any> {
  currentState: S;
  eventHistory: string[];
  capabilities: CapabilityContext;
}

/**
 * Network Sync Message - Causal history exchange
 */
export interface SyncMessage<E = any> {
  type: 'sync' | 'request' | 'response';
  events: Event<E>[];
  fromEventId?: string;
  toEventId?: string;
  nodeId: string;
  timestamp: number;
}

/**
 * Replay Configuration
 */
export interface ReplayConfig {
  fromEventId?: string;
  toEventId?: string;
  fromIndex?: number;
  toIndex?: number;
  validateCapabilities?: boolean;
}

/**
 * Graph Node - Node in causal graph
 */
export interface GraphNode<T = any> {
  id: string;
  event: Event<T>;
  parents: string[];
  children: string[];
  depth: number;
}

/**
 * Semantic Relationship - Meaningful connection between events
 */
export interface SemanticRelationship {
  fromEventId: string;
  toEventId: string;
  relationType: string;
  metadata?: Record<string, any>;
}

/**
 * Capability Grant - Permission delegation
 */
export interface CapabilityGrant {
  grantId: string;
  capabilities: string[];
  grantedBy: string;
  grantedTo: string;
  expiresAt?: number;
  constraints?: Record<string, any>;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Synchronization State
 */
export interface SyncState {
  nodeId: string;
  lastSyncEventId: string;
  lastSyncTimestamp: number;
  pendingEvents: string[];
}
